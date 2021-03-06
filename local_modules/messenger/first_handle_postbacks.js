/////////////////////////////////////////////////
/// Handles Postback & Quick_Replies function ///
/////////////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
passThread = require("./pass_thread"),
updateState = require("../database/update_state"),
updateLimit = require("../database/update_limit"),
join = require("path"),
translateText = require("../other/translate_text"),
summarizeText = require("../other/summarize_text"),
audio = require("../other/get_audio"),
unirest = require("unirest"),
secondMessages = require("./second_handle_messages"),
firstMessages = require("./first_handle_messages"),
updateCheck = require("../database/updateCheck"); 
const { link } = require("fs");

module.exports = async (sender_psid, webhook_event, application) => {
  // Decalring an App name to distinguish when calling Send Response API
  let app = "first";
  // Send sender Actions //
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");

  // Check if the user exists in the Database and get required Data.
  // If new, will write general state as new. If old, will write the App and function name.
  check = await updateCheck(sender_psid, app,"Handla Messages");
  id = check[0];
  first_name = check[1];
  general_state = check[3];
  forms_category = check[4];
  image_count = check[5];
  documents = check[7];
  textract_limit = check[8];
  translate_limit = check[9];
  learn_more_limit = check[10]
  summary_limit = check[11];;
  audio_limit = check[12];
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
        "title":"Keep Me Updated!",
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
        "title":"Keep Me Updated!",
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
    update = await updateState(sender_psid, "general_state", app, "sending image");
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
        check = await updateCheck(sender_psid, "second","Menu");
        // Send menu from second App.
        secondMessages(sender_psid, "moved");
      }
    // If the user is connected with the customer service.  
    } else {
        response = { "text":i18n.__("menu.wait")};
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
        state = await menu(sender_psid, app);
      // If the user is connected with Cutomer Service
      }} else{
        response = { "text":i18n.__("menu.wait")};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      }
  }
  // If the user choose Smart Helper from the menu.
  // Working on NLP App to communicate using text/audio.
  else if (payload === 'SMART_HELPER'){
  if (!general_state.includes("inbox")){
    response = { "text":i18n.__("menu.under_development")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":i18n.__("menu.smart_helper")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = {
      "text":i18n.__("menu.soon"), 
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
    response = { "text":i18n.__("menu.wait")};
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
      response = { "text":i18n.__("menu.wait")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  // If the user click Balance from the menu.  
  } else if (payload === 'BALANCE'){
    // If the user is not connectec with customer service.
    if (!general_state.includes("inbox")){
      response = { "text":i18n.__("menu.balance",{"files":image_count, "textract_limit":textract_limit , "learn_more_limit":learn_more_limit, "translation_limit":translate_limit, "summary_limit":summary_limit, "audio_limit":audio_limit})};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = { "text":i18n.__("menu.balance_updated")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":i18n.__("menu.balance_end"), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"MENU"
          },
          {
            "content_type":"text",
            "title":i18n.__("menu.customer_service"),
            "payload":"CUSTOMER_SERVICE"
          }
        ]
      }  
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // Send the Balance
    } else{
      response = { "text":i18n.__("menu.balance",{"files":image_count, "textract_limit":textract_limit , "learn_more_limit":learn_more_limit, "translation_limit":translate_limit, "summary_limit":summary_limit, "audio_limit":audio_limit})};
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
    response = { "text":i18n.__("inbox.instruction1")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");  
    response = { "text":i18n.__("inbox.instruction2")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":i18n.__("inbox.instruction3")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    response = { "text":i18n.__("inbox.instruction4")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
    } else {
      // If already connected
      response = { "text":i18n.__("menu.connected")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, "inbox");  
    }
  // If the user want to see the DOCS files
  } else if (payload === 'VIEW_DOCS'){
    if (document_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < document_category.length ; ++i){
        s += (document_category[i].S +"\n");
        T = document_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${document_category[i].S}`,"payload":`VIEW_D_${path}`}
        if (i == 10){
          i = document_category.length;
        }
      }
      // Adding Go back Button.
      if (document_category.length > 11){
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":"More Files",
        "payload":"SECOND_V_DOC"
      }}
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }

      response = {"text":i18n.__("files.exists",{"s":s})};
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
        "text":  i18n.__("files.no_files"), 
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
  } else if (payload === 'SECOND_V_DOC'){
    if (document_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 11 ; i < document_category.length ; ++i){
        s += (document_category[i].S +"\n");
        T = document_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-11] = {"content_type":"text","title":`${document_category[i].S}`,"payload":`VIEW_D_${path}`}
        if (i == 20){
          i = document_category.length;
        }
      }
      // Adding Go back Button.
      if (document_category.length > 21){
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":"More Files",
        "payload":"THIRD_V_DOC"
      }}
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"VIEW_DOCS"
      }

      response = {"text": i18n.__("files.exists",{"s":s})};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":  i18n.__("files.instruction"), 
        "quick_replies": quick_replies
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    // If the user does not have file!!
    }
  } else if (payload === 'Third_V_DOC'){
    if (document_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 21 ; i < document_category.length ; ++i){
        s += (document_category[i].S +"\n");
        T = document_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-11] = {"content_type":"text","title":`${document_category[i].S}`,"payload":`VIEW_D_${path}`}
        if (i == 30){
          i = document_category.length;
        }
      }
      // Adding Go back Button.
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"SECOND_V_DOC"
      }

      response = {"text": i18n.__("files.exists",{"s":s})};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      response = {
        "text":  i18n.__("files.instruction"), 
        "quick_replies": quick_replies
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  } else if (payload === 'VIEW_FORMS'){
    if (forms_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < forms_category.length ; ++i){
        s += (forms_category[i].S +"\n");
        T = forms_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${forms_category[i].S}`,"payload":`VIEW_F_${path}`}
        if (i == 10){
          i = forms_category.length;
        }
      }
      // Adding Go back Button.
      if (forms_category.length > 11){
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":"More Files",
        "payload":"SECOND_V_FOR"
      }}
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }

      response = {"text": i18n.__("files.exists",{"s":s})};
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
        "text":  i18n.__("files.no_files"), 
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
  } else if (payload === 'SECOND_V_FOR'){
  if (forms_category.length > 1){
    s = "";
    // Quick Relies Body :)
    quick_replies = [];
    for( i = 11 ; i < forms_category.length ; ++i){
      s += (forms_category[i].S +"\n");
      T = forms_category[i];
      path = documents[`${T.S}`].S;
      quick_replies[i-11] = {"content_type":"text","title":`${forms_category[i].S}`,"payload":`VIEW_F_${path}`}
      if (i == 20){
        i = forms_category.length;
      }
    }
    // Adding Go back Button.
    if (forms_category.length > 21){
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":"More Files",
      "payload":"THIRD_V_FOR"
    }}
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":i18n.__("menu.go_back"),
      "payload":"VIEW_FORMS"
    }

    response = {"text": i18n.__("files.exists",{"s":s})};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    response = {
      "text":  i18n.__("files.instruction"), 
      "quick_replies": quick_replies
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  // If the user does not have file!!
  }
  } else if (payload === 'Third_V_FOR'){
  if (forms_category.length > 1){
    s = "";
    // Quick Relies Body :)
    quick_replies = [];
    for( i = 21 ; i < forms_category.length ; ++i){
      s += (forms_category[i].S +"\n");
      T = forms_category[i];
      path = documents[`${T.S}`].S;
      quick_replies[i-11] = {"content_type":"text","title":`${forms_category[i].S}`,"payload":`VIEW_F_${path}`}
      if (i == 30){
        i = forms_category.length;
      }
    }
    // Adding Go back Button.
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":i18n.__("menu.go_back"),
      "payload":"SECOND_V_FOR"
    }

    response = {"text": i18n.__("files.exists",{"s":s})};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    response = {
      "text":  i18n.__("files.instruction"), 
      "quick_replies": quick_replies
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  // If the user does not have file!!
  }
  } else if (payload === 'VIEW_PASSPORTS'){
    if (passport_category.length > 1){
      s = "";
      // Quick Relies Body :)
      quick_replies = [];
      for( i = 1 ; i < passport_category.length ; ++i){
        s += (passport_category[i].S +"\n");
        T = passport_category[i];
        path = documents[`${T.S}`].S;
        quick_replies[i-1] = {"content_type":"text","title":`${passport_category[i].S}`,"payload":`VIEW_P_${path}`}
        if (i == 10){
          i = passport_category.length;
        }
      }
      // Adding Go back Button.
      if (passport_category.length > 11){
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":"More Files",
        "payload":"SECOND_V_PPT"
      }}
      quick_replies[quick_replies.length] = {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }

      response = {"text": i18n.__("files.exists",{"s":s})};
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
        "text":  i18n.__("files.no_files"), 
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
  } else if (payload === 'SECOND_V_PPT'){
  if (passport_category.length > 1){
    s = "";
    // Quick Relies Body :)
    quick_replies = [];
    for( i = 11 ; i < passport_category.length ; ++i){
      s += (passport_category[i].S +"\n");
      T = passport_category[i];
      path = documents[`${T.S}`].S;
      quick_replies[i-11] = {"content_type":"text","title":`${passport_category[i].S}`,"payload":`VIEW_P_${path}`}
      if (i == 20){
        i = passport_category.length;
      }
    }
    // Adding Go back Button.
    if (passport_category.length > 21){
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":"More Files",
      "payload":"THIRD_V_PPT"
    }}
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":i18n.__("menu.go_back"),
      "payload":"VIEW_PASSPORTS"
    }

    response = {"text": i18n.__("files.exists",{"s":s})};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    response = {
      "text":  i18n.__("files.instruction"), 
      "quick_replies": quick_replies
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  // If the user does not have file!!
  }
  } else if (payload === 'Third_V_PPT'){
  if (passport_category.length > 1){
    s = "";
    // Quick Relies Body :)
    quick_replies = [];
    for( i = 21 ; i < passport_category.length ; ++i){
      s += (passport_category[i].S +"\n");
      T = passport_category[i];
      path = documents[`${T.S}`].S;
      quick_replies[i-11] = {"content_type":"text","title":`${passport_category[i].S}`,"payload":`VIEW_P_${path}`}
      if (i == 30){
        i = passport_category.length;
      }
    }
    // Adding Go back Button.
    quick_replies[quick_replies.length] = {
      "content_type":"text",
      "title":i18n.__("menu.go_back"),
      "payload":"SECOND_V_PPT"
    }

    response = {"text": i18n.__("files.exists",{"s":s})};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    response = {
      "text":  i18n.__("files.instruction"), 
      "quick_replies": quick_replies
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  }
  } else if (payload.includes('VIEW')){
    trim = payload.substring(7);
    console.log(trim);
    lk = join.join(__dirname,(`../../${trim}`))
    console.log(lk);
    check = payload.substring(5,6);
    response = null;
    action = null;
    state = await callSendAPI(sender_psid, response, action, app, lk);
    if (check === "D"){
    response = {"text":i18n.__("files.display"),
    "quick_replies":[
      {
        "content_type":"text",
        "title":i18n.__("menu.learn_more"),
        "payload":`LEARN_MORE_${trim}`
      }, {
        "content_type":"text",
        "title":i18n.__("menu.translate"),
        "payload":`TRANSLATE_${trim}`
      }, {
        "content_type":"text",
        "title":i18n.__("menu.summarize"),
        "payload":`SUMMARY_${trim}`
      }, {
        "content_type":"text",
        "title":i18n.__("menu.audio"),
        "payload":`EN_AUDIO_${trim}`
      }, {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }]
    }} else {
      response = {"text":i18n.__("files.open"),
      "quick_replies":[
        {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"FILES"
        }]
      }
    }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  // If the user click Notify Me
  } else if (payload === "NOTIFY_ME"){
    response = {"attachment": {
      "type":"template",
      "payload": {
      "template_type":"one_time_notif_req",
      "title":"Keep Me Updated!",
      "payload":"APPROVED"
      }
    }}
    action = null;
    state = await callSendAPI(sender_psid, response, action, "inbox");
  } else if (payload.includes("TRANSLATE")){
    if(translate_limit == 0){ 
      response = {"text":i18n.__("menu.no_more_balance")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    } else {
    response = {
      "text": i18n.__("menu.select_language"), 
      "quick_replies":[
        {
          "content_type":"text",
          "title":"Arabic",
          "payload":`LANG_ar_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Spanish",
          "payload":`LANG-es_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"French",
          "payload":`LANG_fr_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Russian",
          "payload":`LANG_ru_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Chineese",
          "payload":`LANG_zh-CHS_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"German",
          "payload":`LANG_de_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Portuguese",
          "payload":`LANG_pt_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Italian",
          "payload":`LANG_it_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Japanese",
          "payload":`LANG_ja_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":"Korean",
          "payload":`LANG_ko_${payload.substring(10)}`
        }, {
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"FILES" 
        }]
      }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    }
  } else if (payload.includes("AUDIO")){
    if(audio_limit == 0){ 
      response = {"text":i18n.__("menu.no_more_balance")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    } else{
    getPath = payload.substring(9);
    getLang = payload.substring(0,2);
    if (getLang.includes("EN")){
      po = await audio(`${getPath}`, sender_psid, 'Kimberly');
      await sleep(800);
      // Sending the Audio file to the user.
      if(!po){
        response = { "text":"This text is not compatible or very long" };
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      }else {
      response = { "text":i18n.__("menu.audio_file")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      fileN= `./files/${sender_psid}/audio.mp3`;
      response = null;
      action = null;
      await callSendAPI(sender_psid, response, action, app, fileN);
      refresh = await updateState(sender_psid, "general_state", app, "audio generated");
      --audio_limit;
      refresh = await updateLimit(sender_psid,"Audio_Limit", audio_limit);
    response = {"text":i18n.__("menu.audio_balance",{audio_limit:`${audio_limit}`}), 
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
    } else if (getLang.includes("ar")){
      po = await audio(`${getPath}`, sender_psid, 'Zeina');
      if(!po){
        response = { "text":"This text is not compatible or very long" };
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      } else {
      await sleep(800);
      // Sending the Audio file to the user.
      response = { "text":i18n.__("menu.audio_file")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      fileN= `./files/${sender_psid}/audio_translation.mp3`;
      response = null;
      action = null;
      await callSendAPI(sender_psid, response, action, app, fileN);
      --audio_limit;
      refresh = await updateLimit(sender_psid,"Audio_Limit", audio_limit);
    response = {"text":i18n.__("menu.audio_balance",{audio_limit:`${audio_limit}`}), 
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
    } else if (getLang.includes("zh")){
      po = await audio(`${getPath}`, sender_psid, 'Zhiyu');
      if(!po){
        response = { "text":"This text is not compatible or very long" };
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      } else {
      await sleep(800);
      // Sending the Audio file to the user.
      response = { "text":i18n.__("menu.audio_file")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
      fileN= `./files/${sender_psid}/audio_translation.mp3`;
      response = null;
      action = null;
      await callSendAPI(sender_psid, response, action, app, fileN);
      --audio_limit;
      refresh = await updateLimit(sender_psid,"Audio_Limit", audio_limit);
    response = {"text":i18n.__("menu.audio_balance",{audio_limit:`${audio_limit}`}), 
    "quick_replies":[
{
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }]
    }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    }}
  }
  } else if (payload.includes("LEARN_MORE")){
    if(learn_more_limit == 0){ 
      response = {"text":i18n.__("menu.no_more_balance")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    } else{
      getPath = payload.substring(11);
      ln = join.join(__dirname,`../../${getPath}`)
      await fs.readFile(ln, 'utf8', async function (err,data) {
        if (err) {
          return console.log(err);
        }
        var req = unirest("POST", "https://dandelion-datatxt.p.rapidapi.com/nex/v1/");
        req.headers({
          "x-rapidapi-host": "dandelion-datatxt.p.rapidapi.com",
          "x-rapidapi-key": "1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5",
          "content-type": "application/x-www-form-urlencoded",
          "useQueryString": true
        });
        
        req.form({
          "text": data,
          "min_confidence": "0.6",
          "include": "types, categories, abstract, lod, image, alternate_labels",
          "min_length": "2",
          "lang": "en"
        });
        
        req.end(async function (res) {
          if (res.error) throw new Error(res.error);
          elements = [];
          for( i = 0 ; i < 10 ; ++i){
            if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
            title = res.body.annotations[i].title;
            ur = res.body.annotations[i].lod.wikipedia;
            uri = res.body.annotations[i].lod.wikipedia.substring(0,4) + "s" + res.body.annotations[i].lod.wikipedia.substring(4);
            abstract = res.body.annotations[i].abstract;
            if (res.body.annotations[i].image.thumbnail){
              image = res.body.annotations[i].image.thumbnail;
            } else {
              image = `${process.env.URL}/general.jpg`;
            }
            elements[elements.length]={"title": title , "image_url":image , "subtitle":abstract, "default_action": {"type": "web_url","url": `${uri}`,"messenger_extensions": "true","webview_height_ratio": "full"},"buttons":[{"type":"web_url","url":uri,"title":"Learn More"}]}
          }}
          if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
            response = { 
                    "attachment":{
                      "type":"template",
                      "payload":{
                        "template_type":"generic",
                        "elements": elements
                      }
                    }
                }
            action = null;
            state = await callSendAPI(sender_psid, response, action, app);
            }else{
              response = {"text":i18n.__("menu.no_data")};
              action = null;
              state = await callSendAPI(sender_psid, response, action, app);
            }
            refresh = await updateState(sender_psid, "general_state", app, "Learm More");
            --learn_more_limit;
            refresh = await updateLimit(sender_psid,"Learn_More_Limit", learn_more_limit);
            quick_replies = [];
            if (res.body.annotations.length > 11){
              quick_replies[quick_replies.length] = { "content_type":"text" , "title":i18n.__("menu.more_topics") , "payload":`LEARN_M_2_${getPath}`} 
            }
            quick_replies[quick_replies.length] = { "content_type":"text" , "title":i18n.__("menu.go_back") , "payload":"FILES"}
            response = {"text":i18n.__("menu.learn",{learn_more_limit:`${learn_more_limit}`}), 
            "quick_replies":quick_replies
            }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
        });

      });
    }
  } else if (payload.includes("LEARN_M_2")){
    getPath = payload.substring(10);
    ln = join.join(__dirname,`../../${getPath}`)
    await fs.readFile(ln, 'utf8', async function (err,data) {
      if (err) {
        return console.log(err);
      }
      var req = unirest("POST", "https://dandelion-datatxt.p.rapidapi.com/nex/v1/");
      req.headers({
        "x-rapidapi-host": "dandelion-datatxt.p.rapidapi.com",
        "x-rapidapi-key": "1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5",
        "content-type": "application/x-www-form-urlencoded",
        "useQueryString": true
      });
      
      req.form({
        "text": data,
        "min_confidence": "0.6",
        "include": "types, categories, abstract, lod, image, alternate_labels",
        "min_length": "2",
        "lang": "en"
      });
      
      req.end(async function (res) {
        if (res.error) throw new Error(res.error);
        elements = [];
        for( i = 10 ; i < 20 ; ++i){
          if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
          title = res.body.annotations[i].title;
          ur = res.body.annotations[i].lod.wikipedia;
          uri = res.body.annotations[i].lod.wikipedia.substring(0,4) + "s" + res.body.annotations[i].lod.wikipedia.substring(4);
          abstract = res.body.annotations[i].abstract;
          if (res.body.annotations[i].image.thumbnail){
            image = res.body.annotations[i].image.thumbnail;
          } else {
            image = `${process.env.URL}/general.jpg`;
          }
          elements[elements.length]={"title": title , "image_url":image , "subtitle":abstract, "default_action": {"type": "web_url","url": `${uri}`,"messenger_extensions": "true","webview_height_ratio": "full"},"buttons":[{"type":"web_url","url":uri,"title":"Learn More"}]}
        }}
        if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
          response = { 
                  "attachment":{
                    "type":"template",
                    "payload":{
                      "template_type":"generic",
                      "elements": elements
                    }
                  }
              }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
        
          quick_replies2 = [];
          if (res.body.annotations.length > 21){
            quick_replies2[quick_replies2.length] = { "content_type":"text" , "title":i18n.__("menu.more_topics") , "payload":`LEARN_M_3_${getPath}`} 
          }
          quick_replies2[quick_replies2.length] = { "content_type":"text" , "title":i18n.__("menu.go_back") , "payload":"FILES"}
          response = {"text":  i18n.__("menu.learn_more_instruction"), 
          "quick_replies":quick_replies2
          }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        } else{
          quick_replies3 = [];
          quick_replies3[quick_replies3.length] = { "content_type":"text" , "title":i18n.__("menu.go_back") , "payload":"FILES"}
          response = {"text":  i18n.__("menu.no_data"), 
          "quick_replies":quick_replies3
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
        }
      });

    });

  } else if (payload.includes("LEARN_M_3")){
    getPath = payload.substring(10);
    ln = join.join(__dirname,`../../${getPath}`)
    await fs.readFile(ln, 'utf8', async function (err,data) {
      if (err) {
        return console.log(err);
      }
      var req = unirest("POST", "https://dandelion-datatxt.p.rapidapi.com/nex/v1/");
      req.headers({
        "x-rapidapi-host": "dandelion-datatxt.p.rapidapi.com",
        "x-rapidapi-key": "1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5",
        "content-type": "application/x-www-form-urlencoded",
        "useQueryString": true
      });
      
      req.form({
        "text": data,
        "min_confidence": "0.6",
        "include": "types, categories, abstract, lod, image, alternate_labels",
        "min_length": "2",
        "lang": "en"
      });
      
      req.end(async function (res) {
        if (res.error) throw new Error(res.error);
        elements = [];
        for( i = 20 ; i < 30 ; ++i){
          if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
          title = res.body.annotations[i].title;
          ur = res.body.annotations[i].lod.wikipedia;
          uri = res.body.annotations[i].lod.wikipedia.substring(0,4) + "s" + res.body.annotations[i].lod.wikipedia.substring(4);
          abstract = res.body.annotations[i].abstract;
          if (res.body.annotations[i].image.thumbnail){
            image = res.body.annotations[i].image.thumbnail;
          } else {
            image = `${process.env.URL}/general.jpg`;
          }
          elements[elements.length]={"title": title , "image_url":image , "subtitle":abstract, "default_action": {"type": "web_url","url": `${uri}`,"messenger_extensions": "true","webview_height_ratio": "full"},"buttons":[{"type":"web_url","url":uri,"title":"Learn More"}]}
        }}
        if (res.body.annotations[i] && res.body.annotations[i].title && res.body.annotations[i].lod.wikipedia && res.body.annotations[i].abstract){
          response = { 
                  "attachment":{
                    "type":"template",
                    "payload":{
                      "template_type":"generic",
                      "elements": elements
                    }
                  }
              }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
          quick_replies3 = [];
          quick_replies3[quick_replies3.length] = { "content_type":"text" , "title":i18n.__("menu.go_back") , "payload":"FILES"}
          response = {"text":  i18n.__("menu.learn_more_instruction"), 
          "quick_replies":quick_replies3
          }
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        }else{
          quick_replies3 = [];
          quick_replies3[quick_replies3.length] = { "content_type":"text" , "title":i18n.__("menu.go_back") , "payload":"FILES"}
          response = {"text": i18n.__("menu.no_data"), 
          "quick_replies":quick_replies3
          }
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
        }
      });

    });

  } else if (payload.includes("SUMMARY")){
    if(summary_limit == 0){ 
      response = {"text": i18n.__("menu.no_more_balance")};
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    } else{
      response = {
        "text":  i18n.__("menu.summary_instrunction"), 
        "quick_replies":[
          {
            "content_type":"text",
            "title":"75%",
            "payload":`PERS_75_${payload.substring(8)}`
          }, {
            "content_type":"text",
            "title":"50%",
            "payload":`PERS_50_${payload.substring(8)}`
          }, {
            "content_type":"text",
            "title":"25%",
            "payload":`PERS_25_${payload.substring(8)}`
          }, {
            "content_type":"text",
            "title":i18n.__("menu.go_back"),
            "payload":"FILES"
          }]
        }
      action = null;
      state = await callSendAPI(sender_psid, response, action, app);
    }
  } else if (payload.includes("LANG")){
    getLang = "";
    getPath = "";
    for ( i = 5 ; i < 11 ; ++i){
      if (payload[i] === "_"){
        i = 10;
      } else{
        getLang += payload[i];
      }
    }
    log = "false";
    for ( i = 7 ; i < payload.length ; ++i){
      if (payload[i] === "_"){
        if (log.includes("false")){
        log = "true";
        } else{
          getPath += payload[i];
        }
      } else{
        if (log.includes("true")){
        getPath += payload[i];
        }
      }
    }
    await fs.readFile(join.join(getPath), 'utf8', async function (err,data) {
      if (err) {
        return console.log(err);
      }
      await sleep(800);
      state = await translateText(sender_psid, data, getLang);
      await sleep(1000);
    });
    await sleep(1200);
    // Sending the main index Page //  
    application.get(`/${sender_psid}`, function(request, response) {
      path = request.path;
      referer = request.headers.referer;
      if(!referer){
      response.render(`not_found`);
    }else if (path.includes(`${sender_psid}`) && (referer.includes("facebook") || referer.includes("messenger") || referer.includes("fb"))){
      response.render(`${sender_psid}`);
    }
    });

    response = { 
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text": i18n.__("menu.translation_file"),
          "buttons":[
            {
              "type":"web_url",
              "url":`${process.env.URL}/${sender_psid}/`,
              "title":"The Translation"
            }
          ]
        }
      }
    }
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    ff = `./views/${sender_psid}/index.ejs`;

    if (getLang.includes("ar") || getLang.includes("en") || getLang.includes("zh")){
      loc = getLang.substring(0,2);
      refresh = await updateState(sender_psid, "general_state", app, "text translated");
      --translate_limit;
      refresh = await updateLimit(sender_psid,"Translate_Limit", translate_limit);
    response = {"text":i18n.__("menu.translation",{translate_limit:`${translate_limit}`}), 
    "quick_replies":[
{
        "content_type":"text",
        "title":i18n.__("menu.audio"),
        "payload":`${loc}_AUDIO_${ff}`
      }, {
        "content_type":"text",
        "title":i18n.__("menu.go_back"),
        "payload":"FILES"
      }]
    }}else{
      refresh = await updateState(sender_psid, "general_state", app, "text translated");
      --translate_limit;
      refresh = await updateLimit(sender_psid,"Translate_Limit" ,translate_limit);
      response = {"text":i18n.__("menu.translation",{translate_limit:`${translate_limit}`}),
      "quick_replies":[{
          "content_type":"text",
          "title":i18n.__("menu.go_back"),
          "payload":"FILES"
        }]
    }}


    action = null;
    state = await callSendAPI(sender_psid, response, action, app);

  } else if (payload.includes("PERS")){
    getPers = payload.substring(5,7);
    getPath = payload.substring(8);
    response = { "text":i18n.__("menu.summary_file")};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
    await fs.readFile(getPath, 'utf8', async function (err,data) {
      if (err) {
        return console.log(err);
      }
      await sleep(800);
      state = await summarizeText(sender_psid, data, getPers);
      await sleep(1000);
    });
    await sleep(1200);
    refresh = await updateState(sender_psid, "general_state", app, "summary online");
    --summary_limit;
    refresh = await updateLimit(sender_psid,"Summary_Limit", summary_limit);
    fileN= `./files/${sender_psid}/summary.txt`
    response = null;
    action = null;
    await callSendAPI(sender_psid, response, action, app, fileN);
 
  response = {"text":i18n.__("menu.summary_balance",{summary_limit:`${summary_limit}`}), 
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
      update = await updateState(sender_psid, "general_state", app, "main menu");
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