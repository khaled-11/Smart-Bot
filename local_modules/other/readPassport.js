const _ = require("lodash");
const aws = require("aws-sdk");

aws.config.update({region: 'us-east-1'});

const sagemakerruntime = new aws.SageMakerRuntime();

module.exports = async buffer => {
  const params = {
    Body: buffer,
    EndpointName: 'Pass-AI-end',
    ContentType: 'application/x-image'
  };

  try{
          const request = sagemakerruntime.invokeEndpoint(params);
          const data = await request.promise();
          let result = data['Body'];
          newResult = JSON.parse(result);
        } catch (e) {
          return;
        }
        return newResult;
      };