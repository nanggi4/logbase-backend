let AWS = require('aws-sdk');
let dynamoDBClient = new AWS.DynamoDB.DocumentClient();
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');
const querystring = require('query-string');
//==============================================================
exports.handler = async (event, context) => {
  let lambdaResponse;
  try {
    //==============================================================
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
      if(event.Records){
        response.status = 200;
      }
      if(param.err) param.promise.reject(param.err);
      else param.promise.resolve(response);
    };
    //==============================================================
    lambdaResponse = await new Promise((resolve, reject) => {
      //==============================================================
      event.Records.forEach((record) => {
        // console.log('Stream record: ', JSON.stringify(record, null, 2));
        //==============================================================
        if (record.eventName == 'INSERT')
        {
          let _newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
          //==============================================================
          let connection = mysql.createConnection({
            host: process.env.RDS_HOSTNAME,
            user: process.env.RDS_USERNAME,
            database: process.env.RDS_DATABASE,
            password: process.env.RDS_PASSWORD,
          });
          //==============================================================
          let _query_columns = '';
          let _query_valuues = '';
          //==============================================================
          _query_columns = `${_query_columns}timestamp`;
          _query_valuues = `${_query_valuues}FROM_UNIXTIME(${_newImage.timestamp}*0.001)`;
          //==============================================================
          _query_columns = `${_query_columns},uuid`;
          _query_valuues = `${_query_valuues},"${_newImage.uuid}"`;
          //==============================================================
          _query_columns = `${_query_columns},basketId`;
          _query_valuues = `${_query_valuues},"${_newImage.basketId}"`;
          //==============================================================
          _query_columns = `${_query_columns},ipaddress`;
          _query_valuues = `${_query_valuues},"${_newImage.headers['X-Forwarded-For'].split(',')[0]}"`;
          //==============================================================
          let _device = 'desktop';
          if(_newImage.headers['CloudFront-Is-Mobile-Viewer']==='true') _device = 'mobile';
          if(_newImage.headers['CloudFront-Is-Tablet-Viewer']==='true') _device = 'tablet';
          if(_newImage.headers['CloudFront-Is-SmartTV-Viewer']==='true') _device = 'smarttv';
          _query_columns = `${_query_columns},device`;
          _query_valuues = `${_query_valuues},"${_device}"`;
          //==============================================================
          if(_newImage.data&&_newImage.data.location)
          {
            let _parsed_location = JSON.parse(_newImage.data.location);
            
            if(_parsed_location.hostname)
            {
              _query_columns = `${_query_columns},hostname`;
              _query_valuues = `${_query_valuues},"${_parsed_location.hostname}"`;
            }
            if(_parsed_location.pathname)
            {
              _query_columns = `${_query_columns},pathname`;
              _query_valuues = `${_query_valuues},"${_parsed_location.pathname}"`;
            }
            if(_parsed_location.search)
            {
              _query_columns = `${_query_columns},search`;
              _query_valuues = `${_query_valuues},"${_parsed_location.search.replace('\\', '')}"`;
              let _parsed_search = querystring.parse(_parsed_location.search);
              if(_parsed_search.utm_source)
              {
                _query_columns = `${_query_columns},sourcecode`;
                _query_valuues = `${_query_valuues},"${_parsed_search.utm_source}"`;
              }
              if(_parsed_search.utm_medium)
              {
                _query_columns = `${_query_columns},mediumcode`;
                _query_valuues = `${_query_valuues},"${_parsed_search.utm_medium}"`;
              }
              if(_parsed_search.utm_campaign)
              {
                _query_columns = `${_query_columns},campaigncode`;
                _query_valuues = `${_query_valuues},"${_parsed_search.utm_campaign}"`;
              }
              if(_parsed_search.utm_term)
              {
                _query_columns = `${_query_columns},termcode`;
                _query_valuues = `${_query_valuues},"${_parsed_search.utm_term}"`;
              }
              if(_parsed_search.utm_content)
              {
                _query_columns = `${_query_columns},contentscode`;
                _query_valuues = `${_query_valuues},"${_parsed_search.utm_content}"`;
              }
              if(_parsed_search.afccd||_parsed_search.AFCCD)
              {
                let _afccd = _parsed_search.afccd;
                if(_parsed_search.AFCCD) _afccd = _parsed_search.AFCCD.toLowerCase();
                _query_columns = `${_query_columns},extradata`;
                _query_valuues = `${_query_valuues},"{\\"afccd\\":\\"${_afccd}\\"}"`;
              }
            }
          }
          //==============================================================
          if(_newImage.data.status&&_newImage.data.status==='L')
          {
          }
          //==============================================================
          if(
            (_newImage.data.status&&_newImage.data.status!=='L')
            ||(!_newImage.data.status&&_newImage.data.rtnCode)
          )
          {
            delete _newImage.data['location'];
            let _userData =  JSON.stringify(_newImage.data);
            _userData = _userData.replace('"__cpLocation": "{\\"passiveMode\\":false}"', '');
            _userData = _userData.split('"').join('\\"');
            _query_columns = `${_query_columns},userdata`;
            _query_valuues = `${_query_valuues},"${_userData}"`;
          }
          else if(
            (_newImage.data.userdata)  // hanwha - hwgi.kr
          )
          {
            delete _newImage.data['location'];
            let _userData =  JSON.stringify(_newImage.data.userdata);
            _userData = _userData.split('"').join('\\"');
            _query_columns = `${_query_columns},userdata`;
            _query_valuues = `${_query_valuues},"${_userData}"`;
          }
          //==============================================================
          let _query = `_query`;
          //==============================================================
          connection.query(_query, (error, results, fields) => {
            if (error) {
              console.log(error);
              connection.destroy();
              throw error;
            } else {
              // console.log(results);
              connection.end(function(err){
                if(err) console.log(err);
              });
            }
          });
        }
        // INSERT
      });
      // forEach
    });
    //==============================================================
  }
  catch (err) {
    console.log(err);
    return err;
  }
  return lambdaResponse;
};