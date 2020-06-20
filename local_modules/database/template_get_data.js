const _ = require("lodash");
const AWS = require("aws-sdk");

var ddb = new AWS.DynamoDB();
module.exports = async () => {
    const params = {
        TableName: 'CLIENTS',
        Key: {
          'PSID': {S: "4476484539044126"}
        },
        ProjectionExpression: `template_title, template_SubTitle, template_image_url, template_main_url`
      };
      
    const request = ddb.getItem(params);
        const data = await request.promise();
        
            // in case no blocks are found return undefined
            return data;
          };

          