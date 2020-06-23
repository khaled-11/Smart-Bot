const _ = require("lodash");
const AWS = require("aws-sdk");

var ddb = new AWS.DynamoDB();
module.exports = async (data, app, current) => {
    const params = {
        TableName: 'CLIENTS',
        Item: {
        'PSID' : {S: `${data.id}`},
        'Locale' : {S: `${data.locale}`},
        'first_name' : {S: `${data.first_name}`},
        'last_name' : {S: `${data.last_name}`},
        'general_state' : {S: `new`},
        'email' : {S: ""},
        'forms_categories' : {L:  [{"S": "Forms"}]},
        'passport_categories' : {L:  [{"S": "passports"}]},
        'documents_categories' : {L:  [{"S": "documents"}]},
        'documents' : {M:  {"Docs": {"S":"path to doc"}}},
        'image_count' : {N: `0`},
        'document_count' : {N: `0`},
        'Textract_Limit' : {N: `10`},
        'Translate_Limit' : {N: `20`},
        'Learn_More_Limit' : {N: `20`},
        'Summary_Limit' : {N: `20`},
        'Audio_Limit' : {N: `20`},
        'Notification' : {S: 'Neutral'},
        'Notification_token' : {S: ''}
        }};
    const request = ddb.putItem(params);
    const result = await request.promise();
    return result;
};

          