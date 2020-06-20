const rp = require('request-promise'),
session = require('express-session');

module.exports = async (sender_psid, s) => {
  var result = "";
  try {
    var options = {
        method: 'GET',
        url: 'https://meaningcloud-deep-categorization-v1.p.rapidapi.com/deepcategorization-1.0',
        qs: {
          txt: s,
          model: 'IAB_2.0_en'
        },
        headers: {
          'x-rapidapi-host': 'meaningcloud-deep-categorization-v1.p.rapidapi.com',
          'x-rapidapi-key': '1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5',
          accept: 'application/json',
          useQueryString: true
        }
      };
  body = await(rp(options));
  if (body){
  for (i = 0 ; i < body.length ; ++i){
    if (body[i] == 'c' && body[i+1] == 'a' && body[i+2] == 't' && body[i+3] == 'e' && body[i+4] == 'g'){
        i += 25;
        for (j = 0 ; j < 10 ; ++j){
        if (!body[i]){
          ++j;
          result = "Other";
        }
        else {
          if(body[i] == '"' || body[i] == '>'){
j = 10;
        } else{
          result += body[i];
++i;
        }}}
  }
}
if (result){
    fs.writeFile(`./files/${sender_psid}/forms/${image_count}_${result}.txt`, s, function (err) {
    if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("TXT file has been saved."); 
    });
   }
  }
    
  }
  catch (e) {
    console.log(e);
  }
return result;
}



