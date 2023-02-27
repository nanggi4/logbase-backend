const { AWSContainer, processLambdaFunction, returnThen, returnCatch } = require("@sizeko/aws-serverless-builder");
const awsContainer = new AWSContainer();
//==============================================================
exports.handler = async (event, context) => {
try { return await processLambdaFunction({
  permission: {
    commandline: {},
    urlquery: {}
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
    itemName: 'fileLinkSet',
    jsonPath: '$.isSuccess["fileLinkSet"]',
  },
  preProcessFunctions: [
    {
      functionName: 'logbase-check-log-report',
      event: {'basketId': event['basketId'], 'timestamp': event['timestamp']},
      runCondition: {event: {required: 'basketId'}},
    },
    {
      functionName: 'logbase-export-log-csv',
      event: {'basketId': event['basketId'], 'timestamp': event['timestamp'], 'customer': event['customer']},
      runCondition: {event: {required: 'basketId'}},
    }
  ],
  conditionalFunctions: [],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    //==============================================================
    // console.log(event);
    // console.log(preProcessResult);
    //==============================================================
    let _fileInfo = preProcessResult.isSuccess.fileInfo;
    let _result = preProcessResult.isSuccess.fileInfo;
    if(_fileInfo.report)
    {
      _result = _fileInfo;
      awsContainer.dynamoDBClient.put({
        TableName: process.env.DYNAMODB_TABLE_NAME_LOGBASE_REPORT,
        Item: _fileInfo.report
      }, (err, dbResult) => {
        if(err){
          console.log(err);
          reject(err);
        }else{
          resolve({
            outputFormat: outputFormat,
            isJSON: _result
          });
        }
      });
    }
    else
    {
      resolve({
        outputFormat: outputFormat,
        isJSON: _result
      });
    }
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