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
      ['time-before']: {required: true, type: 'string'},
      ['time-start']: {required: false, type: 'string'},
      ['options']: {required: false, type: 'object'},
      //==============================================================
    },
  },
  outputFormat: {
    itemName: 'reportPackage',
    jsonPath: '$.isSuccess["reportPackage"]',
  },
  preProcessFunctions: [{
    functionName: 'logbase-get-presearched-report',
    event: {'basketId': event['basketId'],'time-before': event['time-before'],'time-start': event['time-start'], 'options': event['options']},
    runCondition: {event: {required: 'basketId'}},
  }],
  conditionalFunctions: [{ // size created by account
    require: ['isSuccess.reportSearchPackage.reportItem'],
    runThis: (event, context, outputFormat, resolve, reject, preProcessResult) => {
      //==============================================================
      console.log('[1]----------------------------------------');
      console.log(preProcessResult.isSuccess.reportSearchPackage);
      //==============================================================
      delete preProcessResult.isSuccess.reportSearchPackage.event['_previousFunctionResult'];
      let _item = {
        basketId: preProcessResult.isSuccess.reportSearchPackage.searchHistoryItem.basketId,
        timestamp: preProcessResult.isSuccess.reportSearchPackage.searchHistoryItem.timestamp,
        searchHistoryItem: preProcessResult.isSuccess.reportSearchPackage.searchHistoryItem,
        searchHistoryQuery: preProcessResult.isSuccess.reportSearchPackage.searchHistoryQuery,
        reportItem: preProcessResult.isSuccess.reportSearchPackage.reportItem,
        requestParams: preProcessResult.isSuccess.reportSearchPackage.event,
      };
      //==============================================================
      awsContainer.dynamoDBClient.put({
        TableName: process.env.DYNAMODB_TABLE_NAME_LOGBASE_REPORT,
        Item: _item,
      }, (err, dbResult) => {
        if(err){
          console.log(err);
          reject(err);
        }else{
          resolve({
            outputFormat: outputFormat,
            isDynamoDBResult: {Item: _item}
          });
        }
      });
      //==============================================================
    }
  }],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    console.log(event);
    console.log('[2]----------------------------------------');
    console.log(preProcessResult.isSuccess.reportSearchPackage);
    //==============================================================
    let _key = {
      basketId: preProcessResult.isSuccess.reportSearchPackage.searchHistoryItem.basketId,
      timestamp: preProcessResult.isSuccess.reportSearchPackage.searchHistoryItem.timestamp,
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
  }
}).then(param => {
  return returnThen(param);
}).catch(err => {
  return returnCatch(context, err);
});
} catch(err) {
  return returnCatch(context, err);
}};