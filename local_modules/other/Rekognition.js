const _ = require("lodash");
const aws = require("aws-sdk");
var newData = [];


aws.config.update({region: 'us-east-1'});

const Rekognition = new aws.Rekognition();

module.exports = async buffer => {
  const params = {
    Image: {
      /* required */
      Bytes: buffer
    },
    //FeatureTypes: ["FORMS"]
  };

  const request = Rekognition.detectText(params);
  const data = await request.promise();
  if (data) {
    for(var i = 0, j = 0; i < data.TextDetections.length;i++){  
        if(data.TextDetections[i].Confidence > 90 && data.TextDetections[i].Type === 'WORD')
        {
          newData[j] = data.TextDetections[i];
          j++;
        }
      }       
    return newData;
  }
  // in case no blocks are found return undefined
  return undefined;
};