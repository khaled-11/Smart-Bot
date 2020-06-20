////////////////////////////////////////////////////
//   Asynchronous Module to Pass Thread Control   //
////////////////////////////////////////////////////
const rp = require('request-promise'),
callSendAPI = require("./callSendAPI");

module.exports = async (sender_psid, app) => {
let appID;
var token;
if (app === "first"){
appID = process.env.APP_ID_1;
token = process.env.PAGE_ACCESS_TOKEN2;
  } else if (app === "inbox") {
    appID = 263902037430900;
    token = process.env.PAGE_ACCESS_TOKEN;
  } else{
    appID = process.env.APP_ID_2;
    token = process.env.PAGE_ACCESS_TOKEN;
  }
// Construct the message body
var request_body;
var state;
// Create a request Body.
request_body = {
  "recipient": {
  "id": sender_psid
  },
  "target_app_id":appID
}
 
  // Try the request after setting up the request_body.
  try{
    var options = {
      method: 'POST',
      uri: `https://graph.facebook.com/v7.0/me/pass_thread_control?access_token=${token}`,
      body: request_body,
      json: true
    };
  state = await rp(options);
  console.log("PassThread to the " + app + " APP was" , state);
  }
  catch (e){

  }
   return state;
}