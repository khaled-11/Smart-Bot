////////////////////////////////////////////////////
/// Handle Regular text and Attachments function ///
////////////////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
session = require('express-session'),
passThread = require("./pass_thread"),
path = require("path"),
updateCheck = require("../database/updateCheck"),
updateLimit = require("../database/update_limit"),
update = require("../database/update_data"),
audio = require("../other/get_audio"),
imageToText = require("../other/image_to_text"),
translateText = require("../other/translate_text"),
updateState = require("../database/update_state"),
notification = require("./OTN"),
readImage = require("../other/read_image");

module.exports = async (sender_psid, webhook_event, application) => {
  let app = "first";
  let received_message;
  // Send sender Actions //
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");
  
  // Check if the user exists in the Database and get Data.
  check = await updateCheck(sender_psid, app,"Handla Messages");
  first_name = check[1];
  general_state = check[3];
  categories = check[4];
  image_count = check[5];
  document_count = check[6];
  documents = check[7];
  textract_limit = check[8];
  translate_limit = check[9];
  learn_more_limit = check[10];
  summary_limit = check[11];
  audio_limit = check[12];
  i18n.setLocale(check[2]);

  // If the user is back from the inbox.
  // The user will be back only to the main receiver.
if (webhook_event === "BACK"){
  console.log(sender_psid + " is back from Inbox");
  response = { "text":"You are back to the main Bot!"};
  action = null;
  state = await callSendAPI(sender_psid, response, action, app);
  await menu(sender_psid, app);
  console.log("gfdgfdgdfg");
  refresh = updateState(sender_psid, "general_state", `${sender_psid} is back`, "to first App") 
} else if (webhook_event === "moved"){
  response = { "text":"Here is coming from second app"};
  action = null;
  state = await callSendAPI(sender_psid, response, action, app);
await menu(sender_psid, "first");
} else if(webhook_event === "AGREED"){
  state = await senderEffect(sender_psid, app, "mark_seen");
  state = await senderEffect(sender_psid, app, "typing_on");
  response = { "text":"We will notify you in the future once we released new Apps!!\nThanks for your interest!"};
  action = null;
  state = await callSendAPI(sender_psid, response, action, "inbox");
} else{
  received_message = webhook_event.message;
}

if (general_state === "otn template"){
  response = { "text":"Please enter the sub title of the template."};
  action = null;
  callSendAPI(sender_psid, response, action, app)
  refresh = await updateState(sender_psid, "general_state", "otn template", "subtitle");
  refresh = await updateState(sender_psid, "template_title", received_message.text,"");
}
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

// Checks if the message contains text
if (received_message && received_message.text && !general_state.includes("otn")) {  
console.log(sender_psid + " Received message was text!!");
// Changing the text to lower case to check for keywords.
var msg = received_message.text;
var text = received_message.text.trim().toLowerCase();
if  (msg.includes("send otn")) {
  if (sender_psid === "4476484539044126"){
  check = text.substring(9, 17);
  if (check.includes("template")){
    refresh = await updateState(sender_psid, "general_state", "otn", "template");
    response = { "text":"Please enter the title of the template."};
    action = null;
    callSendAPI(sender_psid, response, action, app)
  }else{
  response = { "text":"We are sending OTN for you"};
  action = null;
  callSendAPI(sender_psid, response, action, app)
  notification(msg.substring(9));
  }} else{
    response = { "text":`Do you think I will let you send OTN "${text.substring(9)}" for my users??`};
    action = null;
    state = await callSendAPI(sender_psid, response, action, app)
  }
  }
else if  (text.includes("hi")) {
  menu(sender_psid,app);
  }
  else if (text.includes("ttt")){
    //state = await translateText(sender_psid, documents);
    application.get(`/translation`, function(request, response) {
       if (request.headers.referer) {
        let check = request.headers.referer;
        let check2 = request.route.path;
        if (check.includes("facebook.com") || check.includes("messenger.com") || check.includes("fb") || check.includes("m.me")){
        response.render(`translation`);
        } else {
          response.render(`not_found`);
         }
       }
       else {
        response.render(`not_found`);
       }});
       
    
    response = { 
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text":"Arabic Translation!",
          "buttons":[
            {
              "type":"web_url",
              "url":`${process.env.URL}/translation`,
              "title":"The Translation"
            }
          ]
        }
      }
    }
    
    action = null;
    state = await callSendAPI(sender_psid, response, action, app);
  }

  // else if  (text.includes("app2")) {
  //   t = await passThread(sender_psid, 'second');
  //   if (t.success){
  //   response = { "text":"You moved to the second App"};
  //   action = null;
  //   state = await callSendAPI(sender_psid, response, action, "second");
  //   }
  // } else if  (text.includes("app1")) {
  //   t = await passThread(sender_psid, 'first'); 
  //   if (t.success){
  //   response = { "text":"You moved to the first App"};
  //   action = null;
  //   state = await callSendAPI(sender_psid, response, action, app); 
  //   }  
  // }
 else {
        
          menu(sender_psid,app);
           
    }
    } else if (received_message && received_message.attachments) {
      console.log(sender_psid + " Received message was an attacment!!");
      // Get the URL of the message attachment
      attachmentUrl = webhook_event.message.attachments[0].payload.url;
      if(webhook_event.message.attachments.length > 1){
          response = { "text":"You can work only on one file at a moment. Please wait for the first File!. Please send only one image at a time!"};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);
      } 
      else if(textract_limit == 0){
        response = { "text":"You have used all you allowed tries. Pease wait till next month!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);     
    }
      else if(!attachmentUrl.includes("jpg")){
          response = { "text":"We can extract text from JPG images only. Please send an image file!"};
          action = null;
          state = await callSendAPI(sender_psid, response, action, app);     
      }
      else if(general_state.includes("waiting extraction")){
        response = { "text":"Please wait until we process the first file!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);     
      }
      else{
      refresh = await updateState(sender_psid, "general_state", app, "waiting extraction from image");
      // Read and write the Image from URL to a file with a link.
      var request = await readImage(sender_psid, attachmentUrl, image_count);
      console.log("Image Read, and wrote to a file Successfully!!");
      // Sleep until File is closed.
      await sleep(500);
      // Call the Function that will extract the text, and save it.
      text = await imageToText(sender_psid, image_count);
      console.log("Extracted, and saved the File!");
      // Sleep until File is closed.
      await sleep(500);
      if(!text){
        response = { "text":"We did not catch this file. Please try again and make sure it is an image and it contain English text!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
      } 
      else{
        response = { "text":"Here is the text file!"};
        action = null;
        state = await callSendAPI(sender_psid, response, action, app);
        fileN=(`./files/${sender_psid}/${image_count}.txt`)
        response = null;
        action = null;
        callSendAPI(sender_psid, response, action, app, fileN)
      }
      refresh = await updateState(sender_psid, "general_state", app, "Text Extracted!");
      refresh = await updateLimit(sender_psid,textract_limit-1);
    }} 
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




// response = { 
//   "attachment":{
//   "type":"template",
//   "payload":{
//   "template_type":"button",
//   "text":"Welcome  ",
//   "buttons":[
//       {
//             "type":"postback",
//             "payload":"TRANSLATE",
//             "title":"Image to Code"
//           },
//           {
//             "type":"postback",
//             "payload":"UPLOAD",
//             "title":"Upload a Webpage"
//           },
//           {
//             "type":"postback",
//             "payload":"LINK",
//             "title":"View My Link"
//           }
//         ]
//       }
//     }
//   }

    //   po = await audio(`./files/${sender_psid}/${documents.length}.txt`,sender_psid,documents.length,'Kimberly');
    //   await sleep(500);
    //   // Sending the Audio file to the user.
    //   response = { "text":"Here is the audio file!"};
    //   action = null;
    //   state = await callSendAPI(sender_psid, response, action, app);
    //   response = {
    //     "attachment":{
    //     "type":"audio", 
    //     "payload":{
    //       "url":`${process.env.URL}/${sender_psid}/${documents.length}.mp3`, 
    //       "is_reusable":true
    //     }
    //   }}
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
    // check = await updateCheck(sender_psid);
    // documents = await check[3];
    // //console.log(doc);
    // state = await translateText(sender_psid, documents);
    // uu = await update([sender_psid, translation.length,state,"translatedDocs"]);
    
    // await sleep(500);
    
    // // Sending the Audio file to the user.
    // response = { "text":"Here is the transaltion file!"};
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
    
    // response = { 
    //   "attachment":{
    //     "type":"template",
    //     "payload":{
    //       "template_type":"button",
    //       "text":"Arabic Translation!",
    //       "buttons":[
    //         {
    //           "type":"web_url",
    //           "url":`${process.env.URL}/${sender_psid}/${documents.length - 1}_translation`,
    //           "title":"The Translation"
    //         }
    //       ]
    //     }
    //   }
    // }
    
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
    
    // po = await audio(`./views/${sender_psid}/${documents.length - 1}_translation/index.ejs`,sender_psid,documents.length,'Zeina');
    
    // await sleep(500);
    // // Sending the Audio file to the user.
    // response = { "text":"Here is the translation audio file!"};
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
    // response = {
    //   "attachment":{
    //   "type":"audio", 
    //   "payload":{
    //     "url":`${process.env.URL}/${sender_psid}/${documents.length - 1}_translation.mp3`, 
    //     "is_reusable":true
    //   }
    // }}
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
    
        // if (t.success)
    // response = { 
    //   "attachment":{
    //   "type":"template",
    //   "payload":{
    //     "template_type":"button",
    //     "text":"Arabic Translation!",
    //     "buttons":[
    //       {
    //         "type":"web_url",
    //         "url":`${process.env.URL}`,
    //         "title":"Log"
    //       }
    //     ]
    //   }}
    // }  
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, app);
     // response = { 
    //     "attachment":{
    //       "type":"template",
    //       "payload":{
    //         "template_type":"button",
    //         "text":"Arabic Translation!",
    //         "buttons":[
    //           {
    //             "type":"web_url",
    //             "url":`${process.env.URL}`,
    //             "title":"Log"
    //           }
    //         ]
    //     }
    //   }
    // } 
    // action = null;
    // state = await callSendAPI(sender_psid, response, action, 'first');
