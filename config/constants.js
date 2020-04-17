const AWS = require("aws-sdk");

const WEBRIQ_FORMS_TABLE = process.env.WEBRIQ_FORMS_TABLE;
const FORMS_TABLE = process.env.FORMS_TABLE;
const FORM_SUBMISSIONS_TABLE = process.env.FORM_SUBMISSIONS_TABLE;
const FORMNONCES_TABLE = process.env.FORMNONCES_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
const BUCKET = process.env.BUCKET;
const REGION = process.env.APP_REGION;

let dynamoDb, s3;
if (IS_OFFLINE === "true") {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8000",
  });
  s3 = new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: "S3RVER", // This specific key is required when working offline
    secretAccessKey: "S3RVER",
    endpoint: new AWS.Endpoint("http://localhost:8001"),
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
  s3 = new AWS.S3();
}

module.exports = {
  WEBRIQ_FORMS_TABLE,
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  BUCKET,
  REGION,
  dynamoDb,
  s3,
};
