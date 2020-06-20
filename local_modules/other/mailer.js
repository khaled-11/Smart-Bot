"use strict";

const nodemailer = require('nodemailer');
require('dotenv').config();

function sendConfirmation(recipient_email) {
   const eAddress = "cap.khaled.ledo@gmail.com";
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        secureConnection: 'tls',
        port: 587,
        requiresAuth: true,
        domains: ["gmail.com", "googlemail.com"],
        auth: {
          user:"cap.khaled.ledo@gmail.com",
          pass:"dbarmbbpgqawerhy"
        },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
    ciphers:'SSLv3'
      },
    requireTLS : false,
    debug: false,
    logger: true
});

    let eConfirm= {
        from: eAddress, 
        to: recipient_email,
        subject: "Mail from COVID MAPS",
        text: "Hey, please confirm here.",
 
    }

    transporter.sendMail(eConfirm, function(err){
        if(err){
            console.log(err);
            console.log("Failed to send email.\n");
            return;
        }
        else{
            console.log("Confirmation sent successfully!");
        }
    });
}


module.exports.sendConfirmation = sendConfirmation;
