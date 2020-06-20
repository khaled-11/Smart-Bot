const _ = require("lodash");
const AWS = require("aws-sdk");
AWS.config.update({region: 'us-east-1'});


var ddb = new AWS.DynamoDB();
module.exports = async sender_psid => {
    const params = {
        TableName: 'CLIENTS',
        Key: {
          'PSID': {S: sender_psid}
        },
        ProjectionExpression: 'first_name',
      };
  
    const request = ddb.getItem(params);
        const data = await request.promise();
            if(data.Item)
            exists = true;
            else
            exists = false;
            return exists;
          };