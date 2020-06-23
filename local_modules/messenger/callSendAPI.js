/////////////////////////////////////////////////////////////
//   Asynchronous function to send responses to the user   //
//      It will keep the order of the replies if many.     //
//            This Funtion is the main Player              //
/////////////////////////////////////////////////////////////
const rp = require('request-promise'),
fs = require('fs');
require('dotenv').config();

module.exports = async (sender_psid, response, action, app, fileData, userToken) => {
    // Decalre some variables for the request.
    var request_body;
    var state;
    var token;
    // Check if the reply should be sent from the first App, second App or the Inbox.
    // Will use the proper Token and Persona ID.
    if (app === "second") {
        token = process.env.PAGE_ACCESS_TOKEN2;
        persona_id = process.env.SECOND_PERSONA;
    } else if (app === "inbox") {
        token = process.env.PAGE_ACCESS_TOKEN;
        persona_id = null;
    } else{
        token = process.env.PAGE_ACCESS_TOKEN;
        persona_id = process.env.FIRST_PERSONA;}
    // Check if the request body is an action, OTN or a regular response.
    // The first case if it is OTN.
    if (!sender_psid){
        request_body = {
        "recipient": {
        "one_time_notif_token": userToken
        },
        "message": response,
        "persona_id":persona_id
        }
    }
    // Here is if it is a regular Response including templates and quick replies.
    else if (!action){
        request_body = {
        "recipient": {
        "id": sender_psid
        },
        "message": response,
        "persona_id":persona_id
        }
    } 
    // Last option is if the response is action (Read / Sender Effect)
    else {
        request_body = {
        "recipient": {
        "id": sender_psid
        },
        "sender_action":action,
        "persona_id":persona_id
        }
    }

    // Try the request after setting up the request_body.
    try{
        // If it is a regular Response or OTN
        if(!fileData || fileData === "OTN"){
            var options = {
                method: 'POST',
                uri: `https://graph.facebook.com/v7.0/me/messages?access_token=${token}`,
                body: request_body,
                json: true
            };
            state = await rp(options);
        }
        // Here if the response is File attachment from the local server. 
        else{
            var fileReaderStream = fs.createReadStream(fileData)
                if (fileData.includes("mp3")){
                formData = {
                recipient: JSON.stringify({
                id: sender_psid
                }),
                message: JSON.stringify({
                    attachment: {
                    type: 'audio',
                payload: {
                is_reusable: false
                }}
                }),
                filedata: fileReaderStream,
                persona_id: persona_id
                }
            }else{
            formData = {
            recipient: JSON.stringify({
            id: sender_psid
            }),
            message: JSON.stringify({
                attachment: {
                type: 'file',
            payload: {
            is_reusable: false
            }}
            }),
            filedata: fileReaderStream,
            persona_id: persona_id
            }}
            var options = {
                method: 'POST',
                uri: `https://graph.facebook.com/v7.0/me/messages?access_token=${token}`,
                formData: formData,
                json: true
            };
            state = await rp(options);
        }
    }
    catch (e){
        console.log(e);
    }
    return state;
}