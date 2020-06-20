/////////////////////////////////////////////////////////////////
// Asynchronous Module to Request the user Info from Facebook. //
/////////////////////////////////////////////////////////////////
const rp = require('request-promise');

module.exports = async sender_psid => {
    var result;
    try{
      var options = {
        uri: `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic,locale`,
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN_FOR_LOCALE
        },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };
    result = await(rp(options));
    console.log(result);
    }
    catch (e){
    console.log(e);
    }
     return result;  
};