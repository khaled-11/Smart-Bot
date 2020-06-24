///////////////////////////////////////////
/// Sending OTN from Messenger Function ///
///////////////////////////////////////////
const callSendAPI = require("./callSendAPI"),
i18n = require("i18n"),
passThread = require("./pass_thread"),
templateData = require("../database/template_get_data"),
updateState = require("../database/update_state"),
getAll = require("../database//get_all_keys"),
updateCheck = require("../database/updateCheck");

module.exports = async (type) => {
    // First Option, if the Admin want to send Template
    if (type === "template"){
        // Get all the PSIDs from the Database
        all = await getAll();
        // Loop over the PSIDs, and for each user and excute the following
        for (i = 0 ; i < all.length ; ++i){
            sender_psid = all[i].PSID.S;
            // Make sure that the first App is Active to avoid possible Bugs.
            t = await passThread(sender_psid, 'first');
            // Update the general status for the user
            check = await updateCheck(sender_psid, "SENDING", "OTN");
            // The approval Status for the user.
            status = check[13];
            // If the user Approved, excute the following.
            if (status.includes("APPROVED")){
                // Get the template data from Admin.
                let state = await templateData();
                // Get the OTN Token for the user.
                userToken = check[14].substring(1);
                // Formating the Response with the Admin input
                response = { 
                    "attachment":{
                      "type":"template",
                      "payload":{
                        "template_type":"generic",
                        "elements":[
                           {
                            "title": state.Item.template_title.S,
                            "image_url":state.Item.template_image_url.S,
                            "subtitle":state.Item.template_SubTitle.S,
                            "default_action": {
                              "type": "web_url",
                              "url": state.Item.template_main_url.S,
                              "messenger_extensions": "true",
                              "webview_height_ratio": "full",
                            },
                            "buttons":[
                              {
                                "type":"web_url",
                                "url":state.Item.template_main_url.S,
                                "title":"Learn More"
                              }
                        ]}]}
                    }
                }
                // Sending the OTN Template
                action = null;
                PSID = null;
                await callSendAPI(PSID, response, action, 'inbox', "OTN", userToken);
                // Deactivitaing the previous approval and wait fro new one.
                const update = await updateState(sender_psid, "Notification", "Neutral", "");
            // If not approved, do nothing to avoid errors.
            } else{
                console.log("not approved");
            }
        }
    } // The second case if the Admin want to send regular text.
    else if (!type.includes("template")){
        all = await getAll();
        for (i = 0 ; i < all.length ; ++i){
            sender_psid = all[i].PSID.S;
            t = await passThread(sender_psid, 'first');
            check = await updateCheck(sender_psid, "SENDING", "OTN");
            status = check[13];
            console.log("state " + status);
            if (status.includes("APPROVED")){
                userToken = check[14].substring(1);
                console.log("token" + userToken);
                action = null;
                PSID = null;
                // The main difference is in the respone.
                response = {"text":type};
                console.log("sender"+ sender_psid);
                await callSendAPI(PSID, response, action, 'inbox', "OTN", userToken);
                const update = await updateState(sender_psid, "Notification", "Neutral", "");
            } else{
                console.log("not approved");
            }
        }
    }
}