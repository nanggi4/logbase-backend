const { AWSContainer, processLambdaFunction, returnThen, returnCatch } = require("@sizeko/awslambda-builder");
const awsContainer = new AWSContainer();
//==============================================================
exports.handler = async (event, context) => {
try { return await processLambdaFunction({
  permission: {
    commandline: {},
    urlquery: {},
    preprocess: {}
  },
  validation: {
    input: {event: event, context: context},
    rule: {
      //==============================================================
      ['basketId']: {required: true, type: 'string'},
      ['timestamp']: {required: true, type: 'string'},
      //==============================================================
    },
  },
  outputFormat: {
    itemName: 'report',
    jsonPath: '$.isSuccess["report"]',
  },
  preProcessFunctions: [],
  conditionalFunctions: [],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    //==============================================================
    let _key = {
      basketId: event['basketId'],
      timestamp: event['timestamp'],
    };
    awsContainer.dynamoDBClient.get({
      TableName: process.env.DYNAMODB_TABLE_NAME_LOGBASE_REPORT,
      Key: _key
    }, (err, dbResult) => {
      if(err){
        console.log(err);
        reject(err);
      }else{
        resolve({
          outputFormat: outputFormat,
          isDynamoDBResult: dbResult
        });
      }
    });
    //==============================================================
  }
}).then(param => {
  return returnThen(param);
}).catch(err => {
  return returnCatch(context, err);
});
} catch(err) {
  return returnCatch(context, err);
}};