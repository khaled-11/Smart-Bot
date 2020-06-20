const _ = require("lodash");
const AWS = require("aws-sdk");

var ddb = new AWS.DynamoDB();

var docClient = new AWS.DynamoDB.DocumentClient();
 module.exports = async data => {
    const params = {
        TableName: 'CLIENTS',
        Key: {
        "PSID" : data[0],
        },
  UpdateExpression: `SET ${data[1]}_categories[${data[2]}] =  :attrValue`,
  ExpressionAttributeValues: {
    ":attrValue": `${data[3]}`
         }    
    };
    const request = docClient.update(params);
    const result = await request.promise();
         return result;
  };
     