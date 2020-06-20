const _ = require("lodash");
const AWS = require("aws-sdk");
const fs = require ("fs");

const Polly = new AWS.Polly;
module.exports = async (file,sender_psid,documents_length,voiceId) => {

const params = {
  'Text': fs.readFileSync(file, 'utf8'),
  'OutputFormat': 'mp3',
  'VoiceId': voiceId
}

const request = Polly.synthesizeSpeech(params);
const data = await request.promise();
if (voiceId === 'Kimberly') {
const state = fs.writeFile(`./files/${sender_psid}/${documents_length}.mp3`, data.AudioStream, function(err) {
  if (err) {
            return console.log(err)
            }
            console.log("The file was saved!")
    })
  } else {
    const state = fs.writeFile(`./files/${sender_psid}/${documents_length - 1}_translation.mp3`, data.AudioStream, function(err) {
      if (err) {
                return console.log(err)
                }
                console.log("The file was saved!")
        })
  }
    return data;
}