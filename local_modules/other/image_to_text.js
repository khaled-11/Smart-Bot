// Text Async function
const rp = require('request-promise'),
request = require('request'),
textractScan = require("./textractDoc");
fs = require("fs");

module.exports = async (sender_psid, documents_length) => {
    var data = fs.readFileSync(`./files/${sender_psid}/${documents_length}.jpg`);
    var results;
    try {
      results = await textractScan(data);
    } catch (e) {
      throw e;
    } 
    let s = "";
    if (results){
    for (i = 0 ; i < results.Blocks.length ; ++i) {
      if (results.Blocks[i].Text && results.Blocks[i].BlockType === 'LINE'){
       s += results.Blocks[i].Text + " ";
        s += '\n';
  }}
  fs.writeFile(`./files/${sender_psid}/${documents_length}.txt`, s, function (err) {
    if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("TXT file has been saved."); 
    });
    var options = {
      method: 'GET',
      url: 'https://meaningcloud-summarization-v1.p.rapidapi.com/summarization-1.0',
      qs: {txt: s, sentences: '20'},
        headers: {
        'x-rapidapi-host': 'meaningcloud-summarization-v1.p.rapidapi.com',
        'x-rapidapi-key': '1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5',
        accept: 'application/json',
        useQueryString: true
      }
    };
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
    
      console.log(body);

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
      
      request(options, function (error, response, body) {
        if (error) throw new Error(error);
      
        console.log(body);
      });

      
  var options = {
    method: 'POST',
    url: 'https://dandelion-datatxt.p.rapidapi.com/nex/v1/',
    headers: {
      'x-rapidapi-host': 'dandelion-datatxt.p.rapidapi.com',
      'x-rapidapi-key': '1390cea5damshd570a5f82509daep1cb503jsncbc3c74853d5',
      'content-type': 'application/x-www-form-urlencoded',
      useQueryString: true
    },
    form: {
      text: s,
      min_confidence: '0.6',
      include: 'types, categories, abstract, lod, image, alternate_labels',
      min_length: '2',
      lang: 'en'
    }
  };
  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
  
    console.log(body);
  });  
  


    });

  }
    return s;
  }