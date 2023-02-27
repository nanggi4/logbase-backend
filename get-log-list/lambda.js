const { processLambdaFunction, returnThen, returnCatch } = require("@sizeko/awslambda-builder");
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
      ['seq-first']: {required: true, type: 'number'},
      ['seq-last']: {required: true, type: 'number'},
      ['limit']: {required: false, type: 'number', default: 100, maximum: 500},
      ['options']: {required: false, type: 'object'},
      // ['previous-last-key']: {required: false, type: 'number'},
      //==============================================================
    },
  },
  outputFormat: {
    itemName: 'log',
    jsonPath: '$.isSuccess["log"]',
  },
  preProcessFunctions: [],
  conditionalFunctions: [],
  defaultFunction: (event, context, outputFormat, resolve, reject, preProcessResult) => {
    //==============================================================
    const mysql = require('mysql');
    const connection = mysql.createConnection({
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME, 
      database: process.env.RDS_DATABASE,
      password: process.env.RDS_PASSWORD,
    });
    //==============================================================
    let _limit = `100`;
    let _where = `basketId="${event['basketId']}"`;
    if(event['limit']) _limit = event['limit'];
    if(event['seq-first']&&event['seq-last']&&(event['seq-first']===event['seq-last']))
    {
      _where = `${_where} AND seq = "${event['seq-last']}"`;
    }
    else
    {
      if(event['previous-last-key']) _where = `${_where} AND seq < ${event['previous-last-key']}`;
      else if(event['seq-last']) _where = `${_where} AND seq <= "${event['seq-last']}"`;
      if(event['seq-first']) _where = `${_where} AND seq >= "${event['seq-first']}"`;
    }
    //==============================================================
    for(var i in event['options'])
    {
      let _option = JSON.parse(event['options'][i]);
      _option.value = _option.value.replace(/"/g,'\\"'); // replace " ==> \"
      let _keyword = _option.value;
      if(_option.rule==='start') _keyword = `${_option.value}%`;
      if(_option.rule==='end') _keyword = `%${_option.value}`;
      if(_option.rule==='include') _keyword = `%${_option.value}%`;
      if(_option.rule==='not included') _keyword = `%${_option.value}%`;
      _where = _option.rule==='not included' ? `${_where} AND ${_option.target} NOT LIKE '${_keyword}'` : `${_where} AND ${_option.target} LIKE '${_keyword}'`;
    }
    //==============================================================
    let _query = `_query`;
    //==============================================================
    console.log(_query);
    //==============================================================
    connection.query(_query, (err, RowDataPacket, fields) => {
      if(err){
        connection.destroy();
        reject(err);
      } else {
        connection.end(function(err){
          if(err){
            console.log(err);
            reject(err);
          }
        });
        resolve({
          outputFormat: outputFormat,
          isMySQLResultRow: RowDataPacket
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