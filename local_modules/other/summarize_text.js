const rp = require('request-promise'),
session = require('express-session');

// Translate a text into different languages
module.exports = async (sender_psid, documents, pers) => {
  var result;
  try {
    // Get approximate number of sentences.
    t = 0;
    for (i = 0 ; i < documents.length ; ++i){
      if(documents[i] === "."){
        t++;
      }
    }
    count = (t*pers)/100;
    // Go over summary to remove non-sense text.
    var options = {
      method: 'GET',
      url: 'https://meaningcloud-summarization-v1.p.rapidapi.com/summarization-1.0',
      qs: {txt: documents, sentences: count},
        headers: {
        'x-rapidapi-host': 'meaningcloud-summarization-v1.p.rapidapi.com',
        'x-rapidapi-key': '1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5',
        accept: 'application/json',
        useQueryString: true
      }
    };
    result2 = await(rp(options));
    s = ""
    if (result2){
    for (i = 88 ; i < result2.length-2 ; ++i){
      s += result2[i];
      if(result2[i].includes(".") && result2[i+1].includes(".")){
        i += 3
        s += "]"
      } else if (result2[i].includes(".")){
        s += "\n";
      }
    }}
    fs.writeFile(`./files/${sender_psid}/summary.txt`, s, function (err) {
      if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log("File is Online."); 
    });
  }
  catch (e) {
    console.log(e);
  }
return result;
}