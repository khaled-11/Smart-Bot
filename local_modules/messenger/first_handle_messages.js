//////////////////////////////////////////////////////////////////////
/// Handle Regular text and Attachments function for the First App ///
//////////////////////////////////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
updateCheck = require("../database/updateCheck"),
updateState = require("../database/update_state"),
updateData = require("../database/update_data"),
notification = require("./OTN"),
imageToText = require("../other/image_to_text"),
updateCategory = require("../database/update_category"),
updateLimit = require("../database/update_limit"),
updateCount = require("../database/update_count"),
getCategory = require("../other/get_category"),
readImage = require("../other/read_image");

module.exports = async (sender_psid, webhook_event, application) => {
  // Assigning App name to use in sending response and decalring variable for the message.
  let app = "first";
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
  
  // If the user is back from the inbox.
  // The user will be back only to the main receiver.
  if (webhook_event === "BACK"){
    console.log(sender_psid + " is back from Inbox");
    response = { "text":i18n.__("menu.back_to_bot")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    await menu(sender_psid, app);
    // Update the user state.
    refresh = updateState(sender_psid, "general_state", `${sender_psid} is back`, "to first App") 
  // If the user is coming from the second App.  
  } else if (webhook_event === "moved"){
    await menu(sender_psid, "first");
    refresh = await updateState(sender_psid, "general_state", app, "moved");    
  // If the user agreed on a OTN message.  
  } else if(webhook_event === "AGREED"){
    state = await senderEffect(sender_psid, app, "mark_seen");
    state = await senderEffect(sender_psid, app, "typing_on");
    response = { 
    "text":  i18n.__("menu.will_notify"),  
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
  refresh = await updateState(sender_psid, "general_state", app, "User agreed");    
  // If regular message or attachment.
  } else{
    received_message = webhook_event.message;
  }

  // If the general state is OTN and this is happen only with the Admin.
  if (general_state === "otn template"){
    response = { "text":"Please enter the sub title of the template."};
    action = null;
    callSendAPI(sender_psid, response, action, app)
    // Update the template data with the new data and update the general status.
    refresh = await updateState(sender_psid, "general_state", "otn template", "subtitle");
    refresh = await updateState(sender_psid, "template_title", received_message.text,"");
  }
  // Continue the flow to get all the template Data.
  else if (general_state === "otn template subtitle"){
    response = { "text":"Please enter the image URL for the template with out https://"};
    action = null;
    callSendAPI(sender_psid, response, action, app)
    refresh = await updateState(sender_psid, "general_state", "otn image", "url");
    refresh = await updateState(sender_psid, "template_SubTitle", received_message.text,"");
  } else if (general_state === "otn image url"){
    response = { "text":"Please enter the main URL for the template with out https://"};
    action = null;
    callSendAPI(sender_psid, response, action, app)
    refresh = await updateState(sender_psid, "general_state", "otn main", "url");
    refresh = await updateState(sender_psid, "template_image_url", received_message.text,"");
  } 
  else if (general_state === "otn main url"){
    response = { "text":"I got all the info, I am sending the template."};
    action = null;
    callSendAPI(sender_psid, response, action, app)
    refresh = await updateState(sender_psid, "general_state", "neutral", "");
    refresh = await updateState(sender_psid, "template_main_url", received_message.text,"");
    notification("template");
  } 
  
  // If this is a regular text Message.
  if (received_message && received_message.text && !general_state.includes("otn")) {  
    console.log(sender_psid + " Received message was text!!");
    // Changing the text to lower case to check for keywords.
    var msg = received_message.text;
    var text = received_message.text.trim().toLowerCase();
    // If the Admin is sending the commsand "send otn"
    if  (msg.includes("send otn")) {
      if (sender_psid === "4476484539044126"){
      check = msg.substring(9, 17);
      // Check if it is a template or a regular text.
      // If template, will ask for the title and continue outside of this function.
      if (check.includes("template")){
        refresh = await updateState(sender_psid, "general_state", "otn", "template");
        response = { "text":"Please enter the title of the template."};
        action = null;
        callSendAPI(sender_psid, response, action, app)
      // If text, send the OTN from here.
      }else{
      response = { "text":"We are sending OTN for you"};
      action = null;
      callSendAPI(sender_psid, response, action, app)
      notification(msg.substring(9));
      }
      // If a user try to send OTN
      } else{
        response = { "text":`Do you think I will let you send OTN "${text.substring(9)}" for my users??`};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app)
      }
    // IF the user send hi or any text, will always send the menu.
    } else if (!general_state.includes("sending") && !general_state.includes("waiting") && text.includes("hi")){
      await menu(sender_psid,app, first_name);
    } else if (!general_state.includes("sending") && !general_state.includes("waiting") && !text.includes("hi")){
      response = {
        "text" : "Text is not allowed Here!!", 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app); 
    } else if (general_state.includes("sending")){
      response = {"text" :"Please send an image!!"}
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }else if (general_state.includes("waiting")) {
      state = await senderEffect(sender_psid, app, "mark_seen");
    }
  // If it is an attachment  
  } else if (received_message && received_message.attachments && !general_state.includes("otn")) {
    console.log(sender_psid + " Received message was an attacment!!");
    // Get the URL of the message attachment
    attachmentUrl = webhook_event.message.attachments[0].payload.url;
        // Restrict sending attachment for specific cases by checking the user general state..
    if(!general_state.includes("sending image")){
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
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          }]
        }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);     
    } else if (general_state.includes("sending image")){
      refresh = await updateState(sender_psid, "general_state", app, "waiting extraction from image");
      response = { "text":i18n.__("menu.received")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      state = await senderEffect(sender_psid, app, "mark_seen");
      state = await senderEffect(sender_psid, app, "typing_on");
      read = await readImage(sender_psid, attachmentUrl, image_count);
      console.log("Image Read, and wrote to a file Successfully!!");
      // Sleep until File is closed.
      await sleep(600);
      // Call the Function that will extract the text, and save it.
      text = await imageToText(sender_psid, image_count);
      // Sleep until File is closed.
      await sleep(600);
      if(!text){
        response = { "text": i18n.__("menu.not_good")};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        refresh = await updateState(sender_psid, "general_state", app, "loop to sending image");
      } 
      else{
        cat = await getCategory(text);
        if (cat){
          fs.writeFile(`./files/${sender_psid}/documents/${image_count}_${cat}.txt`, text, function (err) {
            if (err) {
                  console.log("An error occured while writing JSON Object to File.");
                  return console.log(err);
              }
              console.log("TXT file has been saved."); 
          });
        response =  { "text":i18n.__("documents.category",{cat :`${cat}`})};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        response = { "text":i18n.__("menu.text_file")};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        t = updateData([`${sender_psid}`, `${image_count}_${cat}`,`./files/${sender_psid}/documents/${image_count}_${cat}.txt`]);  
        t = updateCategory([`${sender_psid}`,"documents",document_category.length,`${image_count}_${cat}`]);
        fileN=(`./files/${sender_psid}/documents/${image_count}_${cat}.txt`)
        response = null;
        action = null;
        await callSendAPI(sender_psid, response, action, app, fileN)
      }
      ++image_count;
      refresh = await updateCount(sender_psid,"image", image_count);
      refresh = await updateState(sender_psid, "general_state", app, "Text Extracted!");
      refresh = await updateLimit(sender_psid,"Textract_Limit", textract_limit-1);
      // Send the limit information
      response = {"text":i18n.__("menu.scans",{image_count:`${image_count}`, textract_limit:`${textract_limit-1}`}),
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.learn_more"),
          "payload":`LEARN_MORE_${fileN}`
        }, {
          "content_type":"text",
          "title":i18n.__("menu.translate"),
          "payload":`TRANSLATE_${fileN}`
        }, {
          "content_type":"text",
          "title":i18n.__("menu.summarize"),
          "payload":`SUMMARY_${fileN}`
        }, {
          "content_type":"text",
          "title":i18n.__("menu.audio"),
          "payload":`EN_AUDIO_${fileN}`
        }, {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"MENU"
        }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }}
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
  async function menu(sender_psid, app){
    try{
      response = { "text": i18n.__("menu.first_welcome", {first_name:`${first_name}`})};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text": i18n.__("menu.first_welcome2"), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.image_to_text"),
            "payload":"IM-TO-TEXT"
          },{
            "content_type":"text",
            "title":i18n.__("menu.my_files"),
            "payload":"FILES"
          },{
            "content_type":"text",
            "title":i18n.__("menu.notify_me"),
            "payload":"NOTIFY_ME"
          },{
            "content_type":"text",
            "title":i18n.__("menu.data_extractor"),
            "payload":"DATA_EXTRACTOR"
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