const exists = require("./check_data"),
fs = require("fs"),
getData = require("./get_data"),
putData = require("./put_data"),
session = require('express-session'),
requestData = require("../messenger/req_data");

///////////////////////////////////////////////////////////////////////
// Asynchronous Function to check if the user exists in the Database //
//     If the user exists it will return his personal information    //
//  If not, it will create a new entry fot the user in the database  //
///////////////////////////////////////////////////////////////////////
module.exports = async (sender_psid, app, current) => {
    var result = [];
    // Check if the user is already in the database.
    // Both cases will end up by reading the data from DynamoDB.
    // Covers the case if a TESTING-BOT starts with a message!!
    const check = await exists(sender_psid);
    // If exists, request the data and avoid writing new Data.
    // Incase the user deleted the conversation by mistake.
    if (check === true)
    {
      const data = await getData(sender_psid);
      result [0] = data.Item.PSID.S;
      result [1] = data.Item.first_name.S;
      result [2] = data.Item.Locale.S;
      console.log(sender_psid + " Locale is set to " + result[2]);
      result [3] = data.Item.general_state.S;
      result [4] = data.Item.forms_categories.L;
      result [5] = data.Item.image_count.N;
      result [6] = data.Item.document_count.N;
      result [7] = data.Item.documents.M;
      result [8] = data.Item.Textract_Limit.N;
      result [9] = data.Item.Translate_Limit.N;
      result [10] = data.Item.Learn_More_Limit.N;
      result [11] = data.Item.Summary_Limit.N;
      result [12] = data.Item.Audio_Limit.N;
      result [13] = data.Item.Notification.S;
      result [14] = data.Item.Notification_token.S;
      result [15] = data.Item.passport_categories.L;
      result [16] = data.Item.documents_categories.L;
    // If this is the first visit, request personal Data from Facebook.
    // Then add the data to the DynamoDB and intialize user trackers.  
    } else {
      const userData = await requestData(sender_psid);
      const state = await putData(userData, app, current);
      const data = await getData(sender_psid);
      result [0] = data.Item.PSID.S;
      result [1] = data.Item.first_name.S;
      result [2] = data.Item.Locale.S;
      console.log(sender_psid + " Locale is set to " + result[2]);
      result [3] = data.Item.general_state.S;
      result [4] = data.Item.forms_categories.L;
      result [5] = data.Item.image_count.N;
      result [6] = data.Item.document_count.N;
      result [7] = data.Item.documents.M;
      result [8] = data.Item.Textract_Limit.N;
      result [9] = data.Item.Translate_Limit.N;
      result [10] = data.Item.Learn_More_Limit.N;
      result [11] = data.Item.Summary_Limit.N;
      result [12] = data.Item.Audio_Limit.N;
      if (!fs.existsSync(`./files/${sender_psid}`)){
        fs.mkdirSync(`./files/${sender_psid}`);
      }
      if (!fs.existsSync(`./files/${sender_psid}/forms`)){
        fs.mkdirSync(`./files/${sender_psid}/forms`);
      }
      if (!fs.existsSync(`./files/${sender_psid}/passports`)){
        fs.mkdirSync(`./files/${sender_psid}/passports`);
      }
      if (!fs.existsSync(`./views/${sender_psid}`)){
        fs.mkdirSync(`./views/${sender_psid}`);
      }
    }
    return result;
}
  
  // function userLogin(sender_psid){
  //   session.loggedin = true;
  //   session.username = sender_psid;
  //   return session.loggedin;
  // }