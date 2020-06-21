/////////////////////////////////////////////////
/// Handles Postback & Quick_Replies function ///
/////////////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
passThread = require("./pass_thread"),
updateState = require("../database/update_state"),
secondMessages = require("./second_handle_messages"),
firstMessages = require("./first_handle_messages"),
updateCheck = require("../database/updateCheck"); 

module.exports = async (sender_psid, webhook_event) => {
  // Decalring an App name to distinguish when calling Send Response API
  let app = "first";
  // Send sender Actions //
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");

  // Check if the user exists in the Database and get required Data.
  // If new, will write general state as new. If old, will write the App and function name.
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

  // Check if Normal Postback or Quick_Replies Postback. 
  // Will get the proper payload to continue.
  if (webhook_event.postback){
    payload = webhook_event.postback.payload;
    console.log(sender_psid + " Postback Received!!");
  } else{
    payload = webhook_event.message.quick_reply.payload;
    console.log(sender_psid + " Quick_Reply Postback Received!!");
  }

  ////////////////////////////////////////////////////////////////////////////////////
  ///                      Starting Step for All Applications                      ///
  ///  If this is the first entry for the user or after deleting the conversation  ///
  ////////////////////////////////////////////////////////////////////////////////////
  if (payload === 'GET_STARTED') {
    // If new User, will send Quick Intro, prompt to Notify then the main menu.
    if (general_state.includes("new")){
      // Will make sure the First App is active to avoid any errors.
      t = await passThread(sender_psid, 'first');
      // Update the user general state
      update = await updateState(sender_psid, "general_state", app, "PostBack Get_Started");
      // Sending Quick Intro
      response = { "text": i18n.__("get_started.first_welcome", {fName: first_name})}
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");
      state - await senderEffect(sender_psid, app, "typing_on");
      response = { "text": i18n.__("get_started.second_welcome")}
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");
      state - await senderEffect(sender_psid, app, "typing_on");
      // Sending the notify me prompt
      response = {"attachment": {
        "type":"template",
        "payload": {
        "template_type":"one_time_notif_req",
        "title":"Notify Me When there is New Features Released!!",
        "payload":"APPROVED"
        }
      }}
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");
      // Sending the main menu for the first App
      state = await menu(sender_psid, app);
      // If the user deleted the conversation and was in the First App before the deletion.
    } else if (general_state.includes("first")){
      // Pass thread to avoid errors.
      t = await passThread(sender_psid, 'first');
      // Update the user general state
      update = await updateState(sender_psid, "general_state", app, "PostBack Get_Started");
      // Sending the notify me prompt
      response = {"attachment": {
        "type":"template",
        "payload": {
        "template_type":"one_time_notif_req",
        "title":"Notify Me When there is New Features Released!!",
        "payload":"APPROVED"
        }
      }}
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");
      // Sending the menu
      state = await menu(sender_psid, app);
      // If the user deleted the conversation and was in the First App before the deletion.
      // Pass thread to avoid errors then trigger function in the second App
      } else{
        t = await passThread(sender_psid, 'second');
        secondMessages(sender_psid, "ger_started");
      }
  }
  // If the user select Image to text from the Menu.
  else if (payload === 'IM-TO-TEXT'){
    // Update the user general state
    update = await updateState(sender_psid, "general_state", app, "PostBack Image to Text");
    // Sending Instructions.
    response = {"text" :i18n.__("image-to-text.first_intro")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    response = {
      "text":  i18n.__("image-to-text.instruction"), 
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
  // If the payload is menu from a go back button.
  else if (payload === 'MENU'){
    state = await menu(sender_psid, app);
  }
  // If the user select Data Extractor from the menu.
  else if (payload === 'DATA_EXTRACTOR'){
    // Deactivate the menu when talking with Customer Service.
    if (!general_state.includes("inbox")){
      // Pass thread and check to avoid errors.
      t = await passThread(sender_psid, 'second');
      // If success and it passed thread, trigger a function from the second app.
      if (t && t.success){
        secondMessages(sender_psid, "moved");
      // If Not successful, send to the user that he is on the same App.
      } else {
        response = { "text":"You are on the same App. Here is the main menu!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, "second");
        check = await updateCheck(sender_psid, "second","Menu");
        // Send menu from second App.
        secondMessages(sender_psid, "moved");
      }
    // If the user is connected with the customer service.  
    } else {
        response = { "text":"Please wait until you finish with the customer service!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
    }
  }
  // If the user select Smart Documants from the Menu
  else if (payload === 'SMART_DOCUMENTS'){
    // If the user is not connected with Customer service.
    if (!general_state.includes("inbox")){
      // Pass thread and check. If success send the main menu.
      t = await passThread(sender_psid, app);
      if (t && t.success){
        firstMessages(sender_psid, "moved");
      // If the user is on the same App  
      } else {
        response = { "text":"You are on the same App!!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        state = await menu(sender_psid, app);
      // If the user is connected with Cutomer Service
      }} else{
        response = { "text":"Please wait until you finish with the customer service!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      }
  }
  // If the user choose Smart Helper from the menu.
  // Working on NLP App to communicate using text/audio.
  else if (payload === 'SMART_HELPER'){
  if (!general_state.includes("inbox")){
    response = { "text":"This App is still under Development!!"};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":"You will be able to communicate with the Bots with just text and voice!!"};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = {
      "text":"Please check back soon!", 
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"MENU"
        }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");
  // Diable the menu when connected with customer service.    
  }else{
    response = { "text":"Please wait until you finish with the customer service!"};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  }
  // If the user want to view the files.
  } else if (payload === 'FILES'){
    // If the user is not connected with Customer Service  
    if (!general_state.includes("inbox")){
      // Pass thread to the first to handle the user response.
      t = await passThread(sender_psid, 'first'); 
      // Send the Main Categories
      response = {
        "text":i18n.__("menu.files"), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.view_documents"),
            "payload":"VIEW_DOCS"
          }, {
            "content_type":"text",
            "title":i18n.__("menu.view_forms"),
            "payload":"VIEW_FORMS"
          }, {
            "content_type":"text",
            "title":i18n.__("menu.view_passports"),
            "payload":"VIEW_PASSPORTS"
          }, {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          }
        ]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    } else {
      response = { "text":"Please wait until you finish with the customer service!"};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  // If the user click Balance from the menu.  
  } else if (payload === 'BALANCE'){
    // If the user is not connectec with customer service.
    if (!general_state.includes("inbox")){
      response = { "text":`1)Your Image conversion limit is: 💰${textract_limit}.\n2)Your Translations limit is: 💰${translate_limit}.\n3)Your Learn About Topics limit is: 💰${learn_more_limit}.\n4)Your Summarizing Text limit is: 💰${summary_limit}.\n5)Your Audio Generating limit is: 💰${audio_limit}.`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = { "text":`The balance gets updated every month.`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":"If you need to add more early, please contact the customer service department!", 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          },
          {
            "content_type":"text",
            "title":"Customer Service",
            "payload":"CUSTOMER_SERVICE"
          }
        ]
      }  
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // Send the Balance
    } else{
      response = { "text":`Check Balance:\n1) Your Image conversion limit is: 💰${textract_limit}.\n2) Your Translations limit is: 💰${translate_limit}.\n3) Your Learn About Topics limit is: 💰${learn_more_limit}.\n4) Your Summarizing Text limit is: 💰${summary_limit}.\n5) Your Audio Generating limit is: 💰${audio_limit}.`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  // If the user choose cutomer service from the main menu.  
  } else if (payload === 'CUSTOMER_SERVICE'){
  // If not already connected  
  if (!general_state.includes("inbox")){
    // Update the state to avoid overlapping
    refresh = await updateState(sender_psid, "general_state", `${sender_psid} User` , "is in inbox");
    // Pass thread that will conver any case
    t = await passThread(sender_psid, 'first'); 
    t = await passThread(sender_psid, 'inbox');   
    // Sending instructions and a way to go back.
    response = { "text":"You are moved to the Inbox and you can't communicate with the Bots anymore."};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");  
    response = { "text":"After you finish the conversation with the Customer Service, the Customer Service Representative will move you back to the main Bot."};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":"If there is no response from the Customer Service, please leave your message and they will get back to you soon!"};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":"If you want to move to the main Bot at any time, just send (#back to bot). Please don't forget the '#'."};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    } else {
      // If already connected
      response = { "text":"You are already connected with the Customer Service."};
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");  
    }
  // If the user want to see the DOCS files
  } else if (payload === 'VIEW_DOCS'){
    s = "";
    if (document_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < document_category.length ; ++i){
        s += (document_category[i].S +"\n");
        T = document_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${document_category[i].S}`,"payload":`VIEW_${path}`}
      }
      // Adding Go back Button.
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }
      response = {"text": `We have the following files:\n${s}`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":  i18n.__("files.instruction"), 
        "quick_replies": quick_replies
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // If the user does not have file!!
    } else{
      response = {
        "text":  i18n.__("You don't have any files yet."), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"FILES"
          }]
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  // If the user want to see the FORMS files
  } else if (payload === 'VIEW_FORMS'){
    s = "";
    if (forms_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < forms_category.length ; ++i){
        s += (forms_category[i].S +"\n");
        T = forms_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${forms_category[i].S}`,"payload":`VIEW_${path}`}
      }
      // Adding Go back Button.
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }
      response = {"text": `We have the following files:\n${s}`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":  i18n.__("files.instruction"), 
        "quick_replies": quick_replies
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // If the user does not have file!!
    } else{
      response = {
        "text":  i18n.__("You don't have any files yet."), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"FILES"
          }]
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
    // If the user want to see the Passports files
  } else if (payload === 'VIEW_PASSPORTS'){
    s = "";
    if (passport_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < passport_category.length ; ++i){
        s += (passport_category[i].S +"\n");
        T = passport_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${passport_category[i].S}`,"payload":`VIEW_${path}`}
      }
      // Adding Go back Button.
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }
      response = {"text": `We have the following files:\n${s}`};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":  i18n.__("files.instruction"), 
        "quick_replies": quick_replies
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // If the user does not have file!!
    } else{
      response = {
        "text":  i18n.__("You don't have any files yet."), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"FILES"
          }]
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  } else if (payload.includes('VIEW')){
    trim = payload.substring(5);
    response = null;
    action = null;
    state = await callSendAPI(sender_psid, response, action, app, trim);
    response = {
      "text":  i18n.__("Please click on the file to open it.\nThank you so much!"), 
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"FILES"
        }]
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
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