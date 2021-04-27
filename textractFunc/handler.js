const AWS = require("aws-sdk");
const { EOL } = require("os");
const textract = new AWS.Textract();
const comprehend = new AWS.Comprehend();
const docClient = new AWS.DynamoDB.DocumentClient();
var lambda = new AWS.Lambda({
  region: 'us-east-2' //change to your region
});

exports.textractStartHandler = async (event, context, callback) => {
    try {
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
    console.log(key);
    const params = {
        DocumentLocation: {
            S3Object: {
            Bucket: bucket,
            Name: key
            }
        },
        FeatureTypes: ["TABLES", "FORMS"],
        NotificationChannel: {
            RoleArn: process.env.TEXT_EXTRACT_ROLE,
            SNSTopicArn: process.env.SNS_TOPIC
        }
    };
    const reponse = await textract.startDocumentAnalysis(params).promise();
    console.log(reponse);
    } catch (err) {
        console.log(err);
    } finally {
        callback(null);
    }
};

exports.textractEndHandler = async (event, context, callback) => {
    function getFullName (Entities) {
                for (const entity of Entities) {
                    if (entity.Type == 'PERSON') {
                        const person = entity.Text;
                        console.log(person);
                        return person
                    } else {
                        console.log('false')
                }
            }};
    try {
        const {
            Sns: { Message }
        } = event.Records[0];
        console.log(Message);
        const {
            JobId: jobId,
            Status: status,
            DocumentLocation: { S3ObjectName, S3Bucket }
        } = JSON.parse(Message);
        if (status === "SUCCEEDED") {
            const textResult = await getDocumentText(jobId, null);
            const textResume = textResult.replace(/,/g,'')
            console.log(textResume);
            const parameters = {
                LanguageCode: "en",
                Text: textResult.replace(/,/g,'')
                };
            
            const response = await comprehend.detectEntities(parameters).promise();
            console.log(response['Entities']);
            const fullName = getFullName(response['Entities']);
            const fileUrl = `https://${S3Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${S3ObjectName}`;
            console.log(fullName);
            const fname =  fullName.split(' ').slice(0, -1).join(' ')
            const lname = fullName.split(' ').slice(-1).join(' ')
            lambda.invoke({
                FunctionName: 'arn:aws:lambda:us-east-2:175628237821:function:S3uploader-OnSuccessFunction-1AEKFLEEYA5QS',
                Payload: JSON.stringify({"key1":textResume, "key2":fname, "key3":lname, "key4":fileUrl}, null, 2),
                }, function(error, data) {
                    if (error) {
                    context.done('error', error);
                    } if(data.Payload) {
                    context.succeed(data.Payload)
                    }
                });
/*            const params = {
                Item: {
                    id: Date.now().toString(),
                    fname: fullName.split(' ').slice(0, -1).join(' '),
                    lname: fullName.split(' ').slice(-1).join(' '),
                    resume: fileUrl
                },
                TableName: process.env.DbTable
            };
            console.log(params);
            docClient.put(params, function(err, data) {
                if (err) console.log(err);
                else console.log(data);
            });*/
        }
    } catch (error) {
        callback(error);
    } finally {
        callback(null);
    }
};

const getDocumentText = async (jobId, nextToken) => {
    console.log("nextToken", nextToken);
    const params = {
        JobId: jobId,
        MaxResults: 500,
        NextToken: nextToken
    };
    if (!nextToken) delete params.NextToken;
    let {
        JobStatus: _jobStatus,
        NextToken: _nextToken,
        Blocks: _blocks
        } = await textract.getDocumentAnalysis(params).promise();
    let textractResult = _blocks
    .map(({ BlockType, Text }) => {
        if (BlockType === "LINE") return `${Text}${EOL}`;
    })
    .join();
    if (_nextToken) {
        textractResult += await getDocumentText(jobId, _nextToken);
    }
    return textractResult;
};