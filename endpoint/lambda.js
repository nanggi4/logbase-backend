const AWS = require('aws-sdk');
const dynamoDBClient = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');
//==============================================================
exports.handler = async (event, context) => {
  let lambdaResponse;
  let sendResponse = (param) => {
    let response = {headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,HEAD',
      'Content-Type': 'application/json',
      'Content-Encoding': 'UTF-8',
    }};
    if(event.Records){
      response.headers = {
        'access-control-allow-origin':[{
          key: 'Access-Control-Allow-Origin',
          value: '*'
        }],
        'access-control-allow-methods':[{
          key: 'Access-Control-Allow-Methods',
          value: 'OPTIONS,POST,GET,HEAD'
        }],
        'content-type': [{
          key: 'Content-Type',
          value: 'application/json'
        }],
        'content-encoding': [{
          key: 'Content-Encoding',
          value: 'UTF-8'
        }],
      };
    }
    response.body = JSON.stringify({});
    if(param.headers) response.headers = param.headers;
    if(param.result&&param.result.body) response.body = JSON.stringify(param.result.body);
    if(param.result&&param.result.file) response.body = param.result.file;
    if(param.option&&param.option.Return&&param.option.Return.Type=='ReturnTypeBodyOnly')
    {
      response = param.result.body;
    }
    if(event.Records)
    {
      response.status = 200;
    }
    if(param.err) param.promise.reject(param.err);
    else param.promise.resolve(response);
  };
  try {
    //==============================================================
    console.log(event);
    //==============================================================
    lambdaResponse = await new Promise((resolve, reject) => {
      if(event.httpMethod!=='POST')
      {
        sendResponse({
          promise: {resolve: resolve, reject: reject},
          result: {body: {message: event.headers.Host}},
          err: false
        });
        return;
      }
      const eventBody = JSON.parse(event.body);
      
      if(
        (eventBody && eventBody.put && eventBody.put.basketId)
        ||(eventBody && eventBody.update && eventBody.update.basketId)
      )
      {
        let _item = {};
        if(eventBody.put) _item = eventBody.put;
        if(eventBody.update) _item = eventBody.update;
        _item['timestamp'] = Date.now();
        _item['uuid'] = uuidv4();
        _item['headers'] = event.headers;
        //==============================================================
        dynamoDBClient.put({
          TableName: process.env.DYNAMODB_TABLE_NAME_LOGBASE_TRUNKPOOL,
          Item: _item
        }, (err, dbResult) => {
          delete _item.headers; // delete TMI for response
          let _body = {isSuccess: _item};
          if(err) _body = {isFailure: {error: err}};
          sendResponse({
            promise: {resolve: resolve, reject: reject},
            result: {body: _body},
            err: false
          });
        });
        //==============================================================
      }
      else
      {
        let _body = {isFailure: {error: {message: "request unavailable"}}};
        sendResponse({
          promise: {resolve: resolve, reject: reject},
          result: {body: _body},
          err: false
        });
      }
    });
    //==============================================================
  }
  catch (err) {
    console.log(err);
    lambdaResponse = await new Promise((resolve, reject) => {
      let _body = {isFailure: {error: err}};
      sendResponse({
        promise: {resolve: resolve, reject: reject},
        result: {body: _body},
        err: false
      });
    });
    return lambdaResponse;
  }
  return lambdaResponse;
};