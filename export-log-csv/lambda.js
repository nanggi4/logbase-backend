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
      ['customer']: {required: false, type: 'string'}
      //==============================================================
    },
  },
  outputFormat: {
    itemName: 'fileInfo',
    jsonPath: '$.isSuccess["fileInfo"]',
  },
  preProcessFunctions: [],
  conditionalFunctions: [],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    //==============================================================
    console.log(event);
    console.log(preProcessResult);
    //==============================================================
    const _report = event._previousFunctionResult.isSuccess.report;
    //==============================================================
    const getPreSignedURLResolve = (param) => {
      const _preSignedURL = awsContainer.s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_LOGBASE_REPORT_TRUNKPOOL,
        Key: param.fileName,
        Expires: 60*5
      });
      let _result = {
        fileName: param.fileName,
        preSignedURL: _preSignedURL
      };
      if(param.report) _result.report = param.report;
      resolve({
        outputFormat: outputFormat,
        isJSON: _result
      });
    };
    //==============================================================
    const formatDate = (date) => {
      var d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear(),
          hours = d.getHours(),
          minutes = d.getMinutes(),
          seconds = d.getSeconds();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      if (hours.length < 2) hours = '0' + hours;
      if (minutes.length < 2) minutes = '0' + minutes;
      if (seconds.length < 2) seconds = '0' + seconds;
      return [`${year}${month}${day}`,`${hours}${minutes}${seconds}`].join('-');
    };
    //==============================================================
    const convertTimestampToDate = (timestamp) => {
      let _timestamp = timestamp;
      if(typeof timestamp == 'string')
      {
        _timestamp = parseInt(timestamp,10);
      }
      let convertedTime = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
      }).format(_timestamp);
      let result = formatDate(convertedTime);
      return result;
    };
    //==============================================================
    if(_report.fileName)
    {
      getPreSignedURLResolve({fileName: _report.fileName});
    }
    else 
    {
      const ExcelJS = require('exceljs');
      const mysql = require('mysql');
      const connection = mysql.createConnection({
        host: process.env.RDS_HOSTNAME,
        user: process.env.RDS_USERNAME,
        database: process.env.RDS_DATABASE,
        password: process.env.RDS_PASSWORD,
      });
      //==============================================================
      const customer = event['customer'] !== undefined ? event['customer'] : '';
      //==============================================================
      let _fileName = '';
      if(event['customer'] !== undefined && event['customer'] !== '')
      {
        _fileName = `${_report.searchHistoryItem.basketId}-${convertTimestampToDate(_report.searchHistoryItem.timestamp)}-${event['customer']}.xlsx`;
      }
      else
      {
        _fileName = `${_report.searchHistoryItem.basketId}-${convertTimestampToDate(_report.searchHistoryItem.timestamp)}.xlsx`;
      }
      //==============================================================
      let _query = '';
      if(customer === 'yongin')
      {
        _query = '_query';
      }
      else
      {
        _query = '_query';
      }
      const _exportFields = ['seq','timestamp','ipaddress','device','hostname','pathname','search','sourcecode','mediumcode','campaigncode','termcode','contentscode','userdata','extradata'];
      //==============================================================
      connection.query(_query, (err, RowDataPacket, fields) => {
        if(err){
          connection.destroy();
          reject(err);
        } else {
          let _columns = [];
          for(var i in fields)
          {
            if(_exportFields.includes(fields[i].name))
            {
              _columns.push({
                header: fields[i].name,
                key: fields[i].name,
              });
            }
          }
          //==============================================================
          connection.end(function(err){
            if(err){
              console.log(err);
              reject(err);
            }
          });
          //==============================================================
          const jsonResult = JSON.parse(JSON.stringify(RowDataPacket));
          //==============================================================
          let workbook = new ExcelJS.Workbook(); //creating workbook
          let worksheet = workbook.addWorksheet(_report.searchHistoryItem.basketId); //creating worksheet
          worksheet.columns = _columns;
          worksheet.addRows(jsonResult);
          const autoWidth = (worksheet, minimalWidth = 10) => {
            worksheet.columns.forEach((column) => {
              let maxColumnLength = 0;
              column.eachCell({ includeEmpty: true }, (cell) => {
                maxColumnLength = Math.max(
                  maxColumnLength,
                  minimalWidth,
                  cell.value ? cell.value.toString().length : 0
                );
                if(maxColumnLength>40) maxColumnLength = 40;
              });
              column.width = maxColumnLength + 2;
            });
          };
          //==============================================================
          autoWidth(worksheet);
          //==============================================================
          const uploadProcess = async (workbook) => {
            const buffer = await workbook.xlsx.writeBuffer();
            awsContainer.s3.upload({
              Bucket: process.env.S3_BUCKET_LOGBASE_REPORT_TRUNKPOOL,
              Key: _fileName,
              Body: buffer,
            }, function(err, data) {
              if (err) console.log(err);
              getPreSignedURLResolve({fileName: _fileName, report: _report});
            });
          };
          uploadProcess(workbook);
          //==============================================================
        }
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
