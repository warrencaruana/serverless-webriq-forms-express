const AWS = require("aws-sdk");

const WEBRIQ_FORMS_TABLE = process.env.WEBRIQ_FORMS_TABLE;
const FORMS_TABLE = process.env.FORMS_TABLE;
const FORM_SUBMISSIONS_TABLE = process.env.FORM_SUBMISSIONS_TABLE;
const FORMNONCES_TABLE = process.env.FORMNONCES_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;

let dynamoDb;
if (IS_OFFLINE === "true") {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8000",
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

module.exports = {
  WEBRIQ_FORMS_TABLE,
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb,
};
