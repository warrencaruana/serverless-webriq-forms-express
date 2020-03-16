const AWS = require("aws-sdk");

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

const constructFormSubmissionData = require("../helpers")
  .constructFormSubmissionData;

/**
 * GET /forms/:id/submissions
 */
exports.getFormSubmissions = (req, res) => {
  dynamoDb.scan(
    {
      TableName: FORM_SUBMISSIONS_TABLE,
      Key: {
        id: req.params.formId
      }
    },
    (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Forms submissions not found!" });
      }

      if (result) {
        res.json(result.Items);
      } else {
        res.status(404).json({ error: "Forms submissions not found!" });
      }
    }
  );
};

/**
 * POST /forms/:id/submissions
 */
exports.postFormSubmissions = (req, res) => {
  // @todo: validation goes here
  const [error, data] = constructFormSubmissionData({
    ...req.body,
    formId: req.params.formId
  });

  if (error) {
    res.status(400).json(error);
  }

  const params = {
    TableName: FORM_SUBMISSIONS_TABLE,
    Item: data
  };

  dynamoDb.put(params, error => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Could not create form submissions!" });
    }

    res.status(201).json(data);
  });
};

/**
 * GET /forms/:formId/submissions/:id
 */
exports.getFormSubmissionsByIdAndFormId = (req, res) => {
  dynamoDb.get(
    {
      TableName: FORM_SUBMISSIONS_TABLE,
      Key: {
        _id: req.params.id,
        _form: req.params.formId
      }
    },
    (error, result) => {
      console.log("result", result);
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Form submission not found!" });
      }

      if (result) {
        res.json(result.Item);
      } else {
        res.status(404).json({ error: "Form submission not found!" });
      }
    }
  );
};

/**
 * DELETE /forms/:formId/submissions/:id
 */
exports.deleteFormSubmissionsByIdAndFormId = (req, res) => {
  dynamoDb.delete(
    {
      TableName: FORM_SUBMISSIONS_TABLE,
      Key: {
        _id: req.params.id,
        _form: req.params.formId
      }
    },
    (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Form submission not found!" });
      }

      res.status(204).json();
    }
  );
};
