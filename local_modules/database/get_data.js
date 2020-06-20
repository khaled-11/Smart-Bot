const _ = require("lodash");
const AWS = require("aws-sdk");

var ddb = new AWS.DynamoDB();
module.exports = async sender_psid => {
    const params = {
        TableName: 'CLIENTS',
        Key: {
          'PSID': {S: sender_psid}
        },
        ProjectionExpression: 'PSID, first_name, Locale, general_state, forms_categories, image_count, document_count, documents, Textract_Limit, Translate_Limit, Learn_More_Limit, Summary_Limit, Audio_Limit, Notification, Notification_token, documents_categories, passport_categories'
      };
      
    const request = ddb.getItem(params);
        const data = await request.promise();
        
            // in case no blocks are found return undefined
            return data;
          };

          