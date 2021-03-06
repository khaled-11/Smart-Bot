const _ = require("lodash");
const AWS = require("aws-sdk");
const fs = require ("fs");

const Polly = new AWS.Polly;
module.exports = async (file,sender_psid,voiceId) => {
  try{
var data;
const params = {
  'Text': fs.readFileSync(file, 'utf8'),
  'OutputFormat': 'mp3',
  'VoiceId': voiceId
}

const request = Polly.synthesizeSpeech(params);
data = await request.promise();
if (voiceId === 'Kimberly') {
const state = fs.writeFile(`./files/${sender_psid}/audio.mp3`, data.AudioStream, function(err) {
  if (err) {
            return console.log(err)
            }
            console.log("The file was saved!")
    })
  } else {
    const state = fs.writeFile(`./files/${sender_psid}/audio_translation.mp3`, data.AudioStream, function(err) {
      if (err) {
                return console.log(err)
                }
                console.log("The file was saved!")
        })
  }
} catch (e){
  return;
}
    return data;
}