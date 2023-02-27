const { runSocket } = require("@sizeko/awslambda-interface");
const _ENVJSON = require('./env.json');
//==============================================================
exports.handler = async (event, context) => {
  let apiResponse;
  try {
    //==============================================================
    console.log(event);
    console.log(context);
    //==============================================================
    apiResponse = await runSocket({
      _ENVJSON: _ENVJSON,
      event: event,
      context: context,
      protocol: ['https'],
    });
    //==============================================================
  }
  catch (err) {
    console.log(err);
    return err;
  }
  return apiResponse;
};
