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

        UpdateExpression : `SET #attrName.#Name = :attrValue`,
    ExpressionAttributeNames : {
        "#attrName" : "documents",
        "#Name" : `${data[1]}`,
      },
      ExpressionAttributeValues : {
        ":attrValue" :  `${data[2]}`                   
      } 
    };
    const request = docClient.update(params);
    const result = await request.promise();
         return result;
  };

//   UpdateExpression: "SET forms_categories[1] =  :attrValue",

//   ExpressionAttributeValues: {
//     ":attrValue": ["jhhk"]
//          }         