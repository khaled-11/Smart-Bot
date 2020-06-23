///////////////////////////////////////////////////////////////////////
/// Handle Regular text and Attachments function for the second App ///
//////////////////////////////////////////////////// //////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
updateCheck = require("../database/updateCheck"),
updateState = require("../database/update_state"),
updateData = require("../database/update_data"),
updateCategory = require("../database/update_category"),
updateLimit = require("../database/update_limit"),
updateCount = require("../database/update_count"),
getCategory = require("../other/get_category"),
paspportData = require("../other/readPassport"),
imageFormToText = require("../other/textractForm"),
readImage = require("../other/read_image");

module.exports = async (sender_psid, webhook_event) => {
  // Assigning App name to use in sending response and decalring variable for the message.
  let app = "second";
  let received_message;
  // Send sender Actions //
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");
  
  // Check if the user exists in the Database and get the required Data.
  check = await updateCheck(sender_psid, app,"Handla Messages");
  first_name = check[1];
  general_state = check[3];
  forms_category = check[4];
  image_count = check[5];
  documents = check[7];
  textract_limit = check[8];
  passport_category = check[15];
  document_category = check[16];
  i18n.setLocale(check[2]);

  // If the function is triggered from the First App for Get_Started or Pass Thread.
  if (webhook_event === "moved"){
    await menu(sender_psid, app, first_name);
  } else if (webhook_event === "ger_started"){
    update = await updateState(sender_psid, "general_state", app, "PostBack Get_Started");
    state = await menu(sender_psid, app, first_name);
  } else{
    received_message = webhook_event.message;
  }
    
  // Checks if the message contains text
  if (received_message && received_message.text) {  
    console.log(sender_psid + " Received message was text!!");
    // Changing the text to lower case to check for keywords.
    var text = received_message.text.trim().toLowerCase();
    // Send the menu for any text.
    if  (text.includes("hi")) {
      await menu(sender_psid,app, first_name);
    }
    else {
      response = {"text" :i18n.__("menu.cannot_recognize", {text:`${received_message.text}`})};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);  
      await menu(sender_psid,app);
    }
    // If the message is attachment.
  } else if (received_message && received_message.attachments) {
    // Get the URL of the message attachment
    attachmentUrl = webhook_event.message.attachments[0].payload.url;
    // Restrict sending attachment for specific cases by checking the user general state..
    if(!general_state.includes("sending form") && !general_state.includes("sending passport")){
      response = {"text" :i18n.__("menu.when_prompted")}
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      await menu(sender_psid,app,first_name);
    }
    // If the user is sending attachment and he send more than one image.
    else if(webhook_event.message.attachments.length > 1){
      response = {"text" :i18n.__("menu.one_file")}
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
    // If no more balance left. 
    else if(textract_limit == 0){ 
      response = {
        "text" :i18n.__("menu.no_balance"), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app); 
      refresh = await updateState(sender_psid, "general_state", app, "no more balance");    
    }
    // If the user send GIF or any other file extension.
    else if(!attachmentUrl.includes("jpg")){
      response = {
        "text":i18n.__("menu.no_jpg"),
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("smart_helper.go_back"),
            "payload":"MENU"
          }]
        }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);     
    }
    // If the user is sending passport. 
    else if (general_state.includes("sending passport")){
      // Update the status to avoid overlapping
      refresh = await updateState(sender_psid, "general_state", app, "waiting extraction from image");
      // Sending Confirmation to the user and sender effects.
      response = { "text":i18n.__("menu.received")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      state = await senderEffect(sender_psid, app, "mark_seen");
      state = await senderEffect(sender_psid, app, "typing_on");
      // Call function to read the Image from URL and write it to a file.
      read = await readImage(sender_psid, attachmentUrl, image_count);
      // Sleep until File is closed.
      await sleep(800);
      // Read the file then call the Function that will extract the text, and save it.
      var data = fs.readFileSync(`./files/${sender_psid}/${image_count}.jpg`);
      var results = await paspportData(data);
      // If the Passport was validated, formatting the text.
      if (results && results.valid == true){
        name = results.data.names;
        let s = JSON.stringify(results);
        s2 = "";
        for (i = 0 ; i < s.length ; ++i){
          if(s[i] =='{' || s[i] =='"'|| s[i] =='}'){
            s2 = s2;
          } else if(s[i] ==','){
            s2 += '\n';
          } else{
            s2 += s[i];
          }
        }
        ++image_count;
        // If there was a name, save the file with this name.
        if (name){
          response = { "text":i18n.__("passport.saved_name",{name :`${name}`, image_count:`${image_count}`})};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          // Save the File.
          await fs.writeFile(`./files/${sender_psid}/passports/${image_count}_${name}.txt`, s2, function (err) {
          if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
          }
          console.log("TXT file has been saved."); 
          // Update the database with file name and path.
          t = updateData([`${sender_psid}`, `${image_count}_${name}`,`./files/${sender_psid}/passports/${image_count}_${name}.txt`]);
          t = updateCategory([`${sender_psid}`,"passport",passport_category.length,`${image_count}_${name}`]);
          });   
          await sleep(600);
          // Send the Text File from the server.
          response = { "text":i18n.__("passport.file")};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          fileN=(`./files/${sender_psid}/passports/${image_count}_${name}.txt`)
          response = null;
          action = null;
          state = await callSendAPI(sender_psid, response, action, app, fileN);
          // Send the limt informations and go back button.
          refresh = await updateCount(sender_psid,"image", image_count);
          refresh = await updateState(sender_psid, "general_state", app, "Passport Extracted");
          refresh = await updateLimit(sender_psid,"Textract_Limit", textract_limit-1);
          response = {"text":i18n.__("menu.scans",{image_count:`${image_count}`, textract_limit:`${textract_limit-1}`}),
          "quick_replies":[
            {
              "content_type":"text",
              "title":i18n.__("menu.go_back"),
              "payload":"MENU"
            }]
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          } else{
          // If no name found for a reason, save the file under other.
          response = {"text":i18n.__("passport.no_name",{image_count:`${image_count}`})};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          // Save the file.
          await fs.writeFile(`./files/${sender_psid}/passports/${image_count}_other.txt`, s, function (err) {
          if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
          }
          console.log("TXT file has been saved.");
          t = updateData([`${sender_psid}`, `${image_count}_other`,`./files/${sender_psid}/passports/${image_count}_other.txt`]);  
          t = updateCategory([`${sender_psid}`,"passport",passport_category.length,`${image_count}_other}`]);
          });
          await sleep(600);
          // Send the File
          response = { "text":i18n.__("passport.file")};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          fileN=(`./files/${sender_psid}/passports/${image_count}_other.txt`)
          response = null;
          action = null;
          state = await callSendAPI(sender_psid, response, action, app, fileN);
          // Send the Limit information
          refresh = await updateCount(sender_psid,"image", image_count);
          refresh = await updateState(sender_psid, "general_state", app, "Passport Extracted");
          refresh = await updateLimit(sender_psid,"Textract_Limit", textract_limit-1);
          response = {"text":i18n.__("menu.scans",{image_count:`${image_count}`, textract_limit:`${textract_limit-1}`}),
          "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          }]
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          }
        } else {
          response = { "text":i18n.__("passport.failed"),
          "quick_replies":[
            {
              "content_type":"text",
              "title":i18n.__("menu.go_back"),
              "payload":"MENU"
            }, {
              "content_type":"text",
              "title":i18n.__("menu.form"),
              "payload":"Form Image"
            }]
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          refresh = await updateState(sender_psid, "general_state", app, "loop to sending passport");
        }
    // If the user is sending Form.
    } else if(general_state.includes("sending form")){
      // Update the general status, send confirmation, and sender effects.
      refresh = await updateState(sender_psid, "general_state", app, "waiting extraction from image");
      response = { "text":i18n.__("menu.received")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      state = await senderEffect(sender_psid, app, "mark_seen");
      state = await senderEffect(sender_psid, app, "typing_on");
      // Read and write the Image from URL to a file with a link.
      read = await readImage(sender_psid, attachmentUrl, image_count);
      console.log("Image Read, and wrote to a file Successfully!!");
      // Sleep until File is closed.
      await sleep(800);
      // Read file then call the Function that will extract the text, and save it.
      var data = fs.readFileSync(`./files/${sender_psid}/${image_count}.jpg`);
      var results = JSON.stringify(await imageFormToText(data));
      let s = "";
      // If the process failed.
      if (!results || results.length < 3){
        response = { "text" :i18n.__("forms.failed"),
          "quick_replies":[
            {
              "content_type":"text",
              "title":i18n.__("menu.go_back"),
              "payload":"MENU"
            }
          ]
        }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        refresh = await updateState(sender_psid, "general_state", app, "loop to sending form");
      // If the process was successful, format the text.  
      } else{
        s += results;
        s2 = "";
        for (i = 0 ; i < s.length ; ++i){
          if(s[i] =='{' || s[i] =='"'|| s[i] =='}'){
            s2 = s2;
          } else if(s[i] ==','){
            s2 += '\n';
          } else{
            s2 += s[i];
          }
        }
        ++image_count;
        // Update limits and counts
        refresh = await updateCount(sender_psid,"image", image_count);
        refresh = await updateState(sender_psid, "general_state", app, "text extracted");
        --textract_limit;
        refresh = await updateLimit(sender_psid,"Textract_Limit", textract_limit);
        // Get the category
        cat = await getCategory(s2); 
        // If there is category. 
        if (cat){
          fs.writeFile(`./files/${sender_psid}/forms/${image_count}_${cat}.txt`, s, function (err) {
            if (err) {
                  console.log("An error occured while writing JSON Object to File.");
                  return console.log(err);
              }
              console.log("TXT file has been saved."); 
          });
          response =  { "text":i18n.__("forms.category",{cat :`${cat}`})};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          await sleep(600);
          response = { "text":i18n.__("forms.file")};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          // Update the data base with file name and path.
          t = updateData([`${sender_psid}`, `${image_count}_${cat}`,`./files/${sender_psid}/forms/${image_count}_${cat}.txt`]);  
          t = updateCategory([`${sender_psid}`,"forms",forms_category.length,`${image_count}_${cat}`]);
          // Send the file as attachment
          fileN=(`./files/${sender_psid}/forms/${image_count}_${cat}.txt`);
          response = null;
          action = null;
          state = await callSendAPI(sender_psid, response, action, app, fileN);
          // Send the limit information
          response = {"text":i18n.__("menu.scans",{image_count:`${image_count}`, textract_limit:`${textract_limit}`}),
          "quick_replies":[
            {
              "content_type":"text",
              "title":i18n.__("menu.go_back"),
              "payload":"MENU"
            }]
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
        }
      }
    }
  }   
    
  //////////////////////////////////////////////////////////
  //////////////////// Inner Fuctions //////////////////////
  ////////////////////////////////////////////////////////// 

  // Sleep Funtion to put the App to wait before replying //
  function sleep(ms) {
    return new Promise((resolve) => {
    setTimeout(resolve, ms);
    });
  }

  // Function to respond with the menu //
  async function menu(sender_psid, app, first_name){
    try{
      response = {
        "text": i18n.__("menu.welcome",{first_name : `${first_name}`}),
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.passport"),
            "payload":"PASSPORT"
          },{
            "content_type":"text",
            "title":i18n.__("menu.form"),
            "payload":"FORM"
          },{
            "content_type":"text",
            "title":i18n.__("menu.smart_documents"),
            "payload":"SMART_DOCS2"
          },{
            "content_type":"text",
            "title":i18n.__("menu.notify_me"),
            "payload":"NOTIFY_ME"
          }]
        }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
    }
    catch(e){
      throw (e);
    }
    return state;
  }

  // Function to send Sender Effects //
  async function senderEffect(sender_psid, app, action_needed){
    try{
      response = null;
      action = action_needed;
      state = await callSendAPI(sender_psid, response, action, app);   
    }
    catch(e){
      throw (e);
    }
    return state;
  }
}