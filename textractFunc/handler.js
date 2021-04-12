const AWS = require("aws-sdk");
const { EOL } = require("os");
const textract = new AWS.Textract();
const comprehend = new AWS.Comprehend();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.textractStartHandler = async (event, context, callback) => {
    try {
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
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
            console.log(textResult.replace(/,/g,''));
            const parameters = {
                LanguageCode: "en",
                Text: textResult.replace(/,/g,'')
                };
            const response = await comprehend.detectEntities(parameters).promise();
            console.log(response['Entities']);
            const fullName = getFullName(response['Entities']);
            const fileUrl = `https://${S3Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${S3ObjectName}`;
            console.log(fullName);
            const params = {
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
            });
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