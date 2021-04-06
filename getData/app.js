const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: "us-east-2"});

exports.handler = (event, context, callback) => {
    let scanningItems = {
        TableName : process.env.DbTable,
    };
    
    docClient.scan(scanningItems, function(err, data) {
        if(err){
            callback(err, null);
        } else {
            callback(null, data);
        }
    })
};