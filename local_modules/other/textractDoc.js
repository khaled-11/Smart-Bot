// const _ = require("lodash");
// const aws = require("aws-sdk");
// const config = require("./config");

// aws.config.update({
//   accessKeyId: config.awsAccesskeyID,
//   secretAccessKey: config.awsSecretAccessKey,
//   region: config.awsRegion
// });

// const textract = new aws.Textract();

// const getText = (result, blocksMap) => {
//   let text = "";

//   if (_.has(result, "Relationships")) {
//     result.Relationships.forEach(relationship => {
//       if (relationship.Type === "CHILD") {
//         relationship.Ids.forEach(childId => {
//           const word = blocksMap[childId];
//           if (word.BlockType === "WORD") {
//             text += `${word.Text} `;
//           }
//           if (word.BlockType === "SELECTION_ELEMENT") {
//             if (word.SelectionStatus === "SELECTED") {
//               text += `X `;
//             }
//           }
//         });
//       }
//     });
//   }

//   return text.trim();
// };

// const findValueBlock = (keyBlock, valueMap) => {
//   let valueBlock;
//   keyBlock.Relationships.forEach(relationship => {
//     if (relationship.Type === "VALUE") {
//       relationship.Ids.every(valueId => {
//         if (_.has(valueMap, valueId)) {
//           valueBlock = valueMap[valueId];
//           return false;
//         }
//       });
//     }
//   });

//   return valueBlock;
// };

// const getKeyValueRelationship = (keyMap, valueMap, blockMap) => {
//   const keyValues = {};

//   const keyMapValues = _.values(keyMap);

//   keyMapValues.forEach(keyMapValue => {
//     const valueBlock = findValueBlock(keyMapValue, valueMap);
//     const key = getText(keyMapValue, blockMap);
//     const value = getText(valueBlock, blockMap);
//     keyValues[key] = value;
//   });

//   return keyValues;
// };

// const getKeyValueMap = blocks => {
//   const keyMap = {};
//   const valueMap = {};
//   const blockMap = {};

//   let blockId;
//   blocks.forEach(block => {
//     blockId = block.Id;
//     blockMap[blockId] = block;

//     if (block.BlockType === "KEY_VALUE_SET") {
//       if (_.includes(block.EntityTypes, "KEY")) {
//         keyMap[blockId] = block;
//       } else {
//         valueMap[blockId] = block;
//       }
//     }
//   });

//   return { keyMap, valueMap, blockMap };
// };

// module.exports = async buffer => {
//   const params = {
//     Document: {
//       /* Convert to base-64 */
//       Bytes: buffer
//     },
//     FeatureTypes: ["FORMS"]
//   };

//   const request = textract.analyzeDocument(params);
//   const data = await request.promise();
//   if (data && data.Blocks) {
//     const { keyMap, valueMap, blockMap } = getKeyValueMap(data.Blocks);
//     const keyValues = getKeyValueRelationship(keyMap, valueMap, blockMap);
//     return keyValues;
//   }

//   // in case no blocks are found return undefined
//   return undefined;
// };



// /////////////////////////////////////////////////////////////////////////////////////////////////
// /// Uncomment and use below to Read the entire image without processing or classification ///////
// /////////////////////////////////////////////////////////////////////////////////////////////////


const _ = require("lodash");
const aws = require("aws-sdk");

aws.config.update({region: 'us-east-1'});

const textract = new aws.Textract();

module.exports = async buffer => {
  const params = {
    Document: {
      /* required */
      Bytes: buffer
    },
    FeatureTypes: ["FORMS"]
  };
  try{
    const request = textract.analyzeDocument(params);
    data = await request.promise();
  } catch (e) {
    return;
  }
  return data;  
};









/////////////////////////////////////////////////////////////////////////////////////////////////
////// Uncomment and use below to use Rekognition to recognize and analyze text in images ///////
/////////////////////////////////////////////////////////////////////////////////////////////////


// const _ = require("lodash");
// const aws = require("aws-sdk");
// const config = require("./config");
// var newData = [];


// aws.config.update({

//   region: config.awsRegion
// });

// const Rekognition = new aws.Rekognition();

// module.exports = async buffer => {
//   const params = {
//     Image: {
//       /* required */
//       Bytes: buffer
//     },
//     //FeatureTypes: ["FORMS"]
//   };

//   const request = Rekognition.detectText(params);
//   const data = await request.promise();
//   if (data) {
//     for(var i = 0, j = 0; i < data.TextDetections.length;i++){  
//         if(data.TextDetections[i].Confidence > 90 && data.TextDetections[i].Type === 'WORD')
//         {
//           newData[j] = data.TextDetections[i];
//           j++;
//         }
//       }       
//     return newData;
//   }
//   // in case no blocks are found return undefined
//   return undefined;
// };