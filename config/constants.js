const AWS = require("aws-sdk");

const WEBRIQ_FORMS_TABLE = process.env.WEBRIQ_FORMS_TABLE;
const WEBRIQ_FORMS_USERS_TABLE = process.env.WEBRIQ_FORMS_USERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
const BUCKET = process.env.BUCKET;
const REGION = process.env.APP_REGION;
const APP_JWT_SECRET =
  process.env.APP_JWT_SECRET ||
  "cqW8Mgj5QSLxHutxFlh8fckcBVvJ0t3kWEv7lgBD1W48ThnpcOc4WMje70rrM2s468LTmVMyrrB3IhE0eqnPVzeD47Tk7ghtvxnl";
const WEBRIQ_DEFAULT_USER =
  process.env.WEBRIQ_DEFAULT_USER || "info@webriq.com";
const WEBRIQ_DEFAULT_PASSWORD =
  process.env.WEBRIQ_DEFAULT_PASSWORD || "WebriQForm2018!";

let dynamoDb, s3;
if (IS_OFFLINE === "true") {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8000",
    convertEmptyValues: true,
  });
  s3 = new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: "S3RVER", // This specific key is required when working offline
    secretAccessKey: "S3RVER",
    endpoint: new AWS.Endpoint("http://localhost:8001"),
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
  s3 = new AWS.S3();
}

module.exports = {
  WEBRIQ_FORMS_TABLE,
  WEBRIQ_FORMS_USERS_TABLE,
  WEBRIQ_DEFAULT_USER,
  WEBRIQ_DEFAULT_PASSWORD,
  APP_JWT_SECRET,
  IS_OFFLINE,
  BUCKET,
  REGION,
  dynamoDb,
  s3,
};
