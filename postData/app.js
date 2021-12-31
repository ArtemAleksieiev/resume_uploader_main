const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: "us-east-2"});

exports.handler = (event, context, callback) => {
    console.log("Processing...");
    let requestJSON = JSON.parse(event.body);
    console.log(requestJSON);

    var params = {
    TableName: process.env.DbTable,
    Key:{
        "id": requestJSON.id        
    },
    UpdateExpression: "set fname=:f, lname=:l, email=:e, phone=:p, skills=:s",
    ExpressionAttributeValues:{
        ":f":requestJSON.key1,
        ":l":requestJSON.key2,
        ":p":requestJSON.key3,
        ":e":requestJSON.key4,
        ":s":requestJSON.key5,
    },
    ReturnValues:"UPDATED_NEW"
};
    const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers" : "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
    body: JSON.stringify('Hello from new Lambda!'),
  };
    
    docClient.update(params, function(err, data) {
        if(err){
            callback(err, null);
        } else {
            callback(null, data);
        }
    })
};