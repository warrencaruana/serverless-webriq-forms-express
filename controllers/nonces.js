const AWS = require("aws-sdk");
const flatten = require("lodash.flatten");
const uniq = require("lodash.uniq");
const uuid = require("uuid/v4");
const get = require("lodash.get");

const FORMS_TABLE = process.env.FORMS_TABLE;
const FORM_SUBMISSIONS_TABLE = process.env.FORM_SUBMISSIONS_TABLE;
const FORMNONCES_TABLE = process.env.FORMNONCES_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === "true") {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8000"
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

/**
 * GET /formnonces
 */
exports.getNonces = (req, res) => {
  dynamoDb.scan(
    {
      TableName: FORMNONCES_TABLE
    },
    (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Forms not found!" });
      }

      if (result) {
        res.json(result.Items);
      } else {
        res.status(404).json({ error: "Forms not found!" });
      }
    }
  );
};
