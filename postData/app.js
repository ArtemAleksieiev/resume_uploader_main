const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: "us-east-2"});

exports.handler = (event, context, callback) => {
    console.log("Processing...");
    const dict = JSON.parse(event.body);
    const params = {
        Item: {
            id: Date.now().toString(),
            fname: dict['key1'],
            lname: dict['key2'],
            resume: dict['key3']
        },
        TableName: process.env.DbTable
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
    
    docClient.put(params, function(err, data) {
        if(err){
            callback(err, null);
        } else {
            callback(null, data);
        }
    })
};