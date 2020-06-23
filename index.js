// Importing Dependencies //
const express = require('express'),
bodyParser = require('body-parser'),
path = require("path"),
i18n = require("./i18n.js"),
// Importing Local Modules //
firstMessages = require("./local_modules/messenger/first_handle_messages"),
firstPostbacks = require("./local_modules/messenger/first_handle_postbacks"),
secondMessages = require("./local_modules/messenger/second_handle_messages"),
secondPostpacks = require("./local_modules/messenger/second_handle_postbacks"),
takeControl = require("./local_modules/messenger/take_thread"),
updateState = require("./local_modules/database/update_state"),
createTable = require("./local_modules/database/create_table");

// Calling Create Table to create a DynamoDB Table.
// If exists, nothing will be done.
createTable();

//notification("HI, This is testing for OTN. You can send a template as well!");
// Creating App Object and using BodyParser.
app = express();
app.use(bodyParser.json());

// Setting Views folder and using EJS engine for rendering
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Sending the main index Page //  
app.get('/', function(request, response) {
	response.render("index");
});

/////////////////////////////////////////////////////////////
/// Webhook Endpoint For the First Facebook Messenger App ///
/////////////////////////////////////////////////////////////
app.post('/webhook', (req, res) => {  
  let body = req.body;
  // Checks this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
    let webhook_event;

    // Gets the body of the webhook event
    if(entry.messaging){
      webhook_event = entry.messaging[0]; 

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      // Check if the event is Pass Thread Control and if the user is coming from the Inbox.
      // If so, will send the user to Handle Message Function in First Bot regardless the previous Bot.
      if(webhook_event.pass_thread_control && webhook_event.pass_thread_control.metadata){
        if (webhook_event.pass_thread_control.metadata.includes("from Page Inbox")){
          firstMessages(sender_psid, "BACK", app);
      }}
      
      // If OTN Approval, will update variables in the DB and trigger the First App to confirm.
      if (webhook_event.optin){
        payload = webhook_event.optin.payload;
        PSID = webhook_event.sender.id;
        userToken =  webhook_event.optin.one_time_notif_token;
        update = updateState(PSID, "Notification", "User", `${payload}`);
        update = updateState(PSID, "Notification_token", "",`${userToken}`);
        firstMessages(sender_psid, "AGREED", app);
      }

      // Check if the event is a Message or Postback or Quick Replies.
      // Pass the event to handlePostBack function if Quick Reply or Postback.
      // Otherwise, pass the event to handleMessage function.
      if (sender_psid != process.env.PAGE_ID && webhook_event.message && !webhook_event.message.quick_reply) {
        console.log('The First App is Active for user ' + sender_psid);
        firstMessages(sender_psid, webhook_event,app);  
      } else if (sender_psid != process.env.PAGE_ID && (webhook_event.postback || (webhook_event.message && webhook_event.message.quick_reply))) {
        console.log('The First App is Active for user ' + sender_psid);
        firstPostbacks(sender_psid, webhook_event,app);
      }
    } else {
      // If it is a standby event track and listen to the coversation by the secondary receivers.
      webhook_event = entry.standby[0]; 
      let sender_psid = webhook_event.sender.id;
      // The case which the message is sent from the page inbox.
      if (webhook_event.message && sender_psid == process.env.PAGE_ID){
          if (!webhook_event.message.app_id){
            console.log("Message (" + webhook_event.message.text + ") was sent from the page inbox");
            check_message = webhook_event.message.text;
            recipient_id = webhook_event.recipient.id;
            // It will be easier to send a like to move the user back to the Bot is the representative is using phone.
            if(!check_message){
              console.log("customer service sent like");
              takeControl(recipient_id);
            }
          }
      }
      // The case which the user is sending a message to any of the secondary Apps.
      if (webhook_event.message && webhook_event.message.text && sender_psid != process.env.PAGE_ID){
        console.log("The First App is Listening for user " + sender_psid);
        console.log("User " + sender_psid + " sent (" + webhook_event.message.text + ") to the secondary Apps!");
        check_message = webhook_event.message.text;
        recipient_id = webhook_event.recipient.id;
        // If no customer service available, the user can send a text to go back to the main Bot.
        check_message = check_message.toLowerCase();

        if(check_message.includes("#back to bot") || (check_message.includes("#")) && check_message.includes("back")){
          console.log("user ask for back");
          takeControl(sender_psid);
        }
      }}
    });
  // Returns a '200 OK' response to all requests
  res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];      
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {   
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);  
    } else {
    // Responds with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);      
    }
  }
});

//////////////////////////////////////////////////////////////
/// Webhook Endpoint For the Second Facebook Messenger App ///
//////////////////////////////////////////////////////////////
app.post('/webhook2', (req, res) => {  
  let body = req.body;
  // // Checks this is an event from a page subscription
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {
    let webhook_event;
    // Gets the body of the webhook event
    if(entry.messaging){
      webhook_event = entry.messaging[0]; 
      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      // Check if the event is a Message or Postback or Quick Replies.
      // Pass the event to handlePostBack function if Quick Reply or Postback.
      // Otherwise, pass the event to handleMessage function.
      if (webhook_event.message && !webhook_event.message.quick_reply && sender_psid != process.env.PAGE_ID) {
        console.log('The Second App is Active for user ' + sender_psid);
        secondMessages(sender_psid, webhook_event, app);        
      } else if (sender_psid != process.env.PAGE_ID && (webhook_event.postback || (webhook_event.message && webhook_event.message.quick_reply))) {
        console.log('The Second App is Active for user ' + sender_psid);
        secondPostpacks(sender_psid, webhook_event, app);
      }
    } else {
      // If it is a standby event, just console log that the app is listening.
      webhook_event = entry.standby[0]; 
      let sender_psid = webhook_event.sender.id;
      if (webhook_event.message){
        if (sender_psid != process.env.PAGE_ID){
      console.log("The Second App is Listening for USER " + sender_psid);
        }
      }
    }
  });
  // Returns a '200 OK' response to all requests
  res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook2', (req, res) => {    
// Parse the query params
let mode = req.query['hub.mode'];
let token = req.query['hub.verify_token'];
let challenge = req.query['hub.challenge'];
// Checks if a token and mode is in the query string of the request
if (mode && token) {
  // Checks the mode and token sent is correct
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {   
    // Responds with the challenge token from the request
    console.log('WEBHOOK-2_VERIFIED');
    res.status(200).send(challenge);  
  } else {
  // Responds with '403 Forbidden' if verify tokens do not match
  res.sendStatus(403);      
  }
}
});

// listen for webhook events //
app.listen(process.env.PORT || 3370, () => console.log('webhook is listening'));