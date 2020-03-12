const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const AWS = require("aws-sdk");
const get = require("lodash.get");
const multer = require("multer");

const constructFormData = require("./helpers").constructFormData;
const constructFormSubmissionData = require("./helpers")
  .constructFormSubmissionData;

app.use(bodyParser.urlencoded({ extended: false })).use(bodyParser.json());
app.set("view engine", "pug");

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

const params = {
  TableName: FORMS_TABLE
};

// Load controllers
const form = require("./controllers/form");
const submission = require("./controllers/submissions");
const nonce = require("./controllers/nonces");

/**
 * GET /
 */
app.get("/", (req, res) => {
  res.json({ message: "Welcome to WebriQ Forms API!" });
});

/**
 * Forms
 */
app.get("/forms", form.getForms);
app.get("/forms/:url/url", form.getFormsByURL);
app.get("/forms/:id", form.getFormsById);
app.post("/forms", form.postForms);
app.put("/forms/:id", form.putUpdateForms);
app.delete("/forms/:id", form.deleteFormsById);

/**
 * Submissions
 */
app.get("/forms/:formId/submissions", submission.getFormSubmissions);
app.get(
  "/forms/:formId/submissions/:id",
  submission.getFormSubmissionsByIdAndFormId
);
app.post("/forms/:formId/submissions", submission.postFormSubmissions);
app.delete(
  "/forms/:formId/submissions/:id",
  submission.deleteFormSubmissionsByIdAndFormId
);

/**
 * Nonces
 */
app.get("/formnonces", nonce.getNonces);

/**
 * JS Library
 */
app.get("/js/initForms", form.getJSLib);
app.get("/js/initReactForms", form.getReactJSLib);

module.exports.handler = serverless(app);
