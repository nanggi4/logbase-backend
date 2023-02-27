const { processLambdaFunction, returnThen, returnCatch } = require("@sizeko/awslambda-builder");
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
      ['time-before']: {required: false, type: 'string'},
      ['time-start']: {required: false, type: 'string'},
      ['options']: {required: false, type: 'object'},
      //==============================================================
    },
  },
  outputFormat: {
    itemName: 'reportSearchPackage',
    jsonPath: '$.isSuccess["reportSearchPackage"]',
  },
  preProcessFunctions: [],
  conditionalFunctions: [],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    const mysql = require('mysql');
    const escape_quotes = require('escape-quotes');
    //==============================================================
    const connection = mysql.createConnection({
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME,
      database: process.env.RDS_DATABASE,
      password: process.env.RDS_PASSWORD,
    });
    //==============================================================
    let customer = '';
    if (event['basketId'] === 'basketId') customer = 'yongin';
    if (event['basketId'] === 'basketId' || event['basketId'] === 'basketId') customer = 'hanwha';
    //==============================================================
    const processError = (err) => {
      console.log(err);
      connection.destroy();
      reject(err);
    };
    const connectionEnd = () => {
      connection.end(function(err){
        if(err) {
          console.log(err);
          reject(err);
        }
      });
    };
    //==============================================================
    const changeTimezone = (originalTime,timezone) => {
      console.log('IST now(): ' + originalTime);
      let convertedTime = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
      }).format(originalTime);
      console.log('Seoul: ' + convertedTime);
      return convertedTime;
    };
    const _nowSeoulTime = new Date(changeTimezone(new Date(Date.now()),'Asia/Seoul'));
    let _where = `basketId='${event['basketId']}'`;
    if(event['time-start']) _where = `${_where} AND timestamp >= '${event['time-start']}'`;
    if(event['time-before'])
    {
      let _timeBefore = event['time-before'];
      if(new Date(event['time-before']) >= new Date(_nowSeoulTime)) // 'time-before' is Future
      {
        _timeBefore = _nowSeoulTime.toISOString().split('.')[0]; // set 'time-before' - Date.now()
      }
      _where = `${_where} AND timestamp < '${_timeBefore}'`;
    }
    //==============================================================
    let _optionList = [];
    for(var i in event['options'])
    {
      let _option = JSON.parse(event['options'][i]);
      let _keyword = _option.value;
      if(_option.target==='ip') _option.target = 'ipaddress';
      if(_option.rule==='start') _keyword = `${_option.value}%`;
      if(_option.rule==='end') _keyword = `%${_option.value}`;
      if(_option.rule==='include') _keyword = `%${_option.value}%`;
      if(_option.rule==='not included') _keyword = `%${_option.value}%`;
      _where = _option.rule==='not included' ? `${_where} AND ${_option.target} NOT LIKE '${_keyword}'` : `${_where} AND ${_option.target} LIKE '${_keyword}'`;
      _where = _where.replace(/"/g,'\\"'); // replace " ==> \"
      _optionList.push(_option);
      if(event['options'].length===(Number(i)+1))
      {
        event['options'] = _optionList;
      }
    }
    //==============================================================
    let _queryYongin = '';
    let _queryHanwha = '';
    //==============================================================
    if (customer === 'yongin') _queryYongin = `_queryYongin`;
    if (customer === 'hanwha') _queryHanwha = `_queryHanwha`;
    //==============================================================
    const _queryTarget = `_queryTarget`;
    const _queryDevice = `_queryDevice`;
    const _querySearch = `_querySearch`;
    const _queryGetHourlyCount = `_queryGetHourlyCount`;
    const _querySourcecode = `_querySourcecode`;
    const _querySourcecodeCount = `_querySourcecodeCount`;
    //==============================================================
    connection.query(_querySearch, (err, RowDataPacketPreSearchedReport, fields) => {
      if(err) processError(err);
      else {
        //==============================================================
        if(RowDataPacketPreSearchedReport.length>0)
        {
          connectionEnd();
          resolve({
            outputFormat: outputFormat,
            isJSON: {
              searchHistoryItem: RowDataPacketPreSearchedReport[0]
            }
          });
        }
        else
        {
          let _item = {
            basketId: event['basketId'],
            timestamp: Date.now(),
          };
          const _queryInsertBasicInfoQUERY = `INSERT INTO ${process.env.RDS_TABLE_NAME_LOGBASE_REPORT_SEARCH} (datetime, basketId, timestamp, query) VALUES (FROM_UNIXTIME(${_item.timestamp}*0.001),"${_item.basketId}","${_item.timestamp}","${escape_quotes(_queryTarget)}");`;
          connection.query(_queryInsertBasicInfoQUERY, (err, ResultInsertOkPacket, fields) => {
            if(err) processError(err);
            else {
              const _queryGetReportBasicInfo = `SELECT * FROM ${process.env.RDS_TABLE_NAME_LOGBASE_REPORT_SEARCH} WHERE seq = ${ResultInsertOkPacket.insertId};`;
              connection.query(_queryGetReportBasicInfo, (err, RowDataPacketGetReportBasicInfoQUERY, fields) => {
                if(err) processError(err);
                else {
                  connection.query(RowDataPacketGetReportBasicInfoQUERY[0].query, (err, RowDataPacketReportBasicInfo, fields) => {
                    if(err) processError(err);
                    else {
                      connection.query(_queryGetHourlyCount, (err, RowDataPacketGetHourlyCount, fields) => {
                        if(err) processError(err);
                        else {
                          connection.query(_queryDevice, (err, RowDataPacketDevice, fields) => {
                            if(err) processError(err);
                            else {
                              connection.query(_querySourcecode, (err, RowDataPacketSourcecode, fields) => {
                                if(err) processError(err);
                                else {
                                  connection.query(_querySourcecodeCount, (err, RowDataPacketSourcecodeCount, fields) => {
                                    if(err) processError(err);
                                    else {
                                      if(RowDataPacketSourcecode.length>7000) RowDataPacketSourcecode={result:"limit over"};
                                      if(customer === 'yongin') {
                                        connection.query(_queryYongin, (err, RowDataPacketYongin, fields) => {
                                          if(err) processError(err);
                                          else {
                                            connectionEnd();
                                            resolve({
                                              outputFormat: outputFormat,
                                              isJSON: {
                                                searchHistoryItem: RowDataPacketGetReportBasicInfoQUERY[0],
                                                searchHistoryQuery: {
                                                  targetQuery: _queryTarget,
                                                  deviceQuery: _queryDevice,
                                                  searchQuery: _querySearch,
                                                  hourlyCountQuery: _queryGetHourlyCount,
                                                  sourcecodeQuery: _querySourcecode,
                                                  yonginQuery: _queryYongin,
                                                  sourcecodeCountQuery: _querySourcecodeCount
                                                },
                                                reportItem: {
                                                  basicInfo: RowDataPacketReportBasicInfo[0],
                                                  hourlyCount: RowDataPacketGetHourlyCount,
                                                  deviceCount: RowDataPacketDevice,
                                                  sourcecode: RowDataPacketSourcecode,
                                                  sourcecodeCount: RowDataPacketSourcecodeCount,
                                                  yongin: RowDataPacketYongin
                                                },
                                                event: event,
                                              }
                                            });                                      
                                          }
                                        });
                                      } else if(customer === 'hanwha') {
                                        connection.query(_queryHanwha, (err, RowDataPacketHanwha, fields) => {
                                          if(err) processError(err);
                                          else {
                                            connectionEnd();
                                            resolve({
                                              outputFormat: outputFormat,
                                              isJSON: {
                                                searchHistoryItem: RowDataPacketGetReportBasicInfoQUERY[0],
                                                searchHistoryQuery: {
                                                  targetQuery: _queryTarget,
                                                  deviceQuery: _queryDevice,
                                                  searchQuery: _querySearch,
                                                  hourlyCountQuery: _queryGetHourlyCount,
                                                  sourcecodeQuery: _querySourcecode,
                                                  hanwhaQuery: _queryHanwha,
                                                  sourcecodeCountQuery: _querySourcecodeCount
                                                },
                                                reportItem: {
                                                  basicInfo: RowDataPacketReportBasicInfo[0],
                                                  hourlyCount: RowDataPacketGetHourlyCount,
                                                  deviceCount: RowDataPacketDevice,
                                                  sourcecode: RowDataPacketSourcecode,
                                                  sourcecodeCount: RowDataPacketSourcecodeCount,
                                                  hanwha: RowDataPacketHanwha
                                                },
                                                event: event,
                                              }
                                            });                                      
                                          }
                                        });                                   
                                      } else {
                                        connectionEnd();
                                        resolve({
                                          outputFormat: outputFormat,
                                          isJSON: {
                                            searchHistoryItem: RowDataPacketGetReportBasicInfoQUERY[0],
                                            searchHistoryQuery: {
                                              targetQuery: _queryTarget,
                                              deviceQuery: _queryDevice,
                                              searchQuery: _querySearch,
                                              hourlyCountQuery: _queryGetHourlyCount,
                                              sourcecodeQuery: _querySourcecode,
                                              sourcecodeCountQuery: _querySourcecodeCount
                                            },                                          
                                            reportItem: {
                                              basicInfo: RowDataPacketReportBasicInfo[0],
                                              hourlyCount: RowDataPacketGetHourlyCount,
                                              sourcecode: RowDataPacketSourcecode,
                                              sourcecodeCount: RowDataPacketSourcecodeCount,
                                              deviceCount: RowDataPacketDevice
                                            },
                                            event: event,
                                          }
                                        });                                   
                                      }                                      
                                    }
                                  });
                                }
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
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
