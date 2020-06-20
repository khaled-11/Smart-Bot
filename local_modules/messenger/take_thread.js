////////////////////////////////////////////////////
//   Asynchronous Module to Pass Thread Control   //
////////////////////////////////////////////////////
const rp = require('request-promise'),
updateState = require("../database/update_state"),
firstMessages = require("./first_handle_messages");

module.exports = async (sender_psid) => {
token = process.env.PAGE_ACCESS_TOKEN;
// Construct the message body
var request_body;
var state;
// Create a request Body.
request_body = {
  "recipient": {
  "id": sender_psid
  }}
 
  // Try the request after setting up the request_body.
  try{
    var options = {
      method: 'POST',
      uri: `https://graph.facebook.com/v7.0/me/take_thread_control?access_token=${token}`,
      body: request_body,
      json: true
    };
  state = await rp(options);
  console.log("Took Thread Control was" , state);
  }
  catch (e){
  }
   refresh = updateState(sender_psid, "general_state", `${sender_psid} took control`, "by first App") 

   firstMessages(sender_psid, "BACK", app);
   return state;
}