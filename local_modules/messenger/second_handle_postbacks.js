////////////////////////////////////////////////////////////////////
/// Handles Postback & Quick_Replies function for the second App ///
////////////////////////////////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
passThread = require("./pass_thread"),
firstMessages = require("./first_handle_messages"),
updateState = require("../database/update_state"),
updateCheck = require("../database/updateCheck");

module.exports = async (sender_psid, webhook_event) => {
  // Assigning App name to use in sending response. 
  let app = "second";
  // Send sender Actions //
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");
  
  // Check if the user exists in the Database, update state, and get the required Data.
  check = await updateCheck(sender_psid);
  first_name = check[1];
  general_state = check[3];
  translate_limit = check[9];
  i18n.setLocale(check[2]);

  // Check if Normal Postback or Quick_Replies Postback. 
  // Get appropiate payload that will continue.
  if (webhook_event.postback){
    payload = webhook_event.postback.payload;
    console.log(sender_psid + " Postback Received!!");
  } else {
    payload = webhook_event.message.quick_reply.payload;
    console.log(sender_psid + " Quick_Reply Postback Received!!");
  }

  // If the user select Notify Me from the second App Menu.
  if (payload === "NOTIFY_ME"){
    // Pass Thread to handle the postback if agreed.
    t = await passThread(sender_psid, 'first');  
    // Send the template using the first App Credentials.
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
  // If the user select Passport from the main menu.
  } else if (payload === 'PASSPORT'){
    // Update general state and send instructions. 
    refresh = updateState(sender_psid, "general_state", `${sender_psid} is in the second App`, "sending passport");
    response = {"text" :i18n.__("passport.first_intro")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    // Send Back Button if the user want to go back.
    response = {
      "text" :i18n.__("passport.first_intro2"),
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"MENU"
        }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
  } else if (payload === 'FORM'){
    // If the user select Forms from the main menu.
    response = {"text" :i18n.__("forms.first_intro")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    refresh = updateState(sender_psid, "general_state", `${sender_psid} is in the second App`, "sending form") 
    // Send Back Button if the user want to go back.
    response = {
      "text" :i18n.__("forms.first_intro2"), 
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"MENU"
        }]
      }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
  } else if (payload === 'MENU'){
    // If the payload is menu, call the menu function.
    await menu(sender_psid, app, first_name);
  } else if (payload === 'SMART_DOCS2'){
    // If the user select the first App from the quick reply menu.
    // Pass Thread to the first App and trigger the handle messages function.
    t = await passThread(sender_psid, 'first');  
    if (t.success){  
      firstMessages(sender_psid, "moved", app);
    }
  }

  //////////////////////////////////////////////////////////
  //////////////////// Inner Fuctions //////////////////////
  ////////////////////////////////////////////////////////// 

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
};