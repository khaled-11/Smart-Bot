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
  }
    return s;
  }