const rp = require('request-promise'),
session = require('express-session');

module.exports = async (sender_psid, documents) => {
  var result;
  try {
    var options = {
      uri: `https://microsoft-azure-translation-v1.p.rapidapi.com/translate`,
      qs: {
        "from": "en",
        "to": "ar",
        "text": documents[documents.length-1].S
      },
      headers: {
        "x-rapidapi-host": "microsoft-azure-translation-v1.p.rapidapi.com",
        "x-rapidapi-key": "1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5",
        "accept": "application/json",
        "useQueryString": true
      },
      json: true
  };  
  result = await(rp(options));
  s = "";
  if (result){
  for (i = 69 ; i < result.length - 10 ; ++i){
    s += result[i];
  }
}
if (!fs.existsSync(`./views/${sender_psid}/${documents.length - 1}_translation`)){
  fs.mkdirSync(`./views/${sender_psid}/${documents.length - 1}_translation`);
}
fs.writeFile(`./views/${sender_psid}/${documents.length - 1}_translation/index.ejs`, s, function (err) {
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