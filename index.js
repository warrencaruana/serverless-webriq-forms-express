const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const AWS = require("aws-sdk");

const constructFormData = require("./helpers");

app.set("view engine", "pug");
app.use(bodyParser.json({ strict: false }));

const FORMS_TABLE = process.env.FORMS_TABLE;
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
const formController = require("./controllers/form");

/**
 * GET /
 */
app.get("/", (req, res) => {
  res.json({ message: "Welcome to WebriQ Forms API!" });
});

app.put("/test/:id", (req, res) => {
  const { siteUrls } = req.body;
  console.log("siteUrls", siteUrls);
  console.log("req.params.id", req.params.id);

  var params = {
    TableName: FORMS_TABLE,
    Key: {
      id: req.params.id
    },
    UpdateExpression: "SET #formNonces = list_append(#formNonces, :vals)",
    ExpressionAttributeNames: {
      "#formNonces": "formNonces"
    },
    ExpressionAttributeValues: {
      ":vals": typeof siteUrls !== "object" ? [siteUrls] : siteUrls
    },
    ReturnValues: "UPDATED_NEW"
  };

  dynamoDb.update(params, function(err, data) {
    if (err) console.log(err);
    else console.log(data);

    return res.json(data);
  });
});

/**
 * GET /js/initForms
 */
app.get("/js/initForms", formController.getJSLib);

/**
 * GET /forms
 */
app.get("/forms", (req, res) => {
  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Forms not found!" });
    }

    if (result) {
      res.json(result.Items);
    } else {
      res.status(404).json({ error: "Forms not found!" });
    }
  });
});

app.get("/formnonces", (req, res) => {
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
});

/**
 * GET /forms/:id
 */
app.get("/forms/:id", function(req, res) {
  dynamoDb.get(
    {
      TableName: FORMS_TABLE,
      Key: {
        id: req.params.id
      }
    },
    (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Form error!" });
      }

      if (result.Item) {
        res.json(result.Item);
      } else {
        res.status(404).json({ error: "Resource not found!" });
      }
    }
  );
});

/**
 * POST /forms
 */
app.post("/forms", (req, res) => {
  // @todo: validation goes here

  const data = constructFormData(req.body);
  const params = {
    TableName: FORMS_TABLE,
    Item: data
  };

  dynamoDb.put(params, error => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Could not create form!" });
    }

    res.status(201).json(data);
  });
});

/**
 * DELETE /forms/:id
 */
app.delete("/forms/:id", (req, res) => {
  dynamoDb.delete(
    {
      ...params,
      Key: {
        id: req.params.id
      }
    },
    error => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Could not create form!" });
      }

      res.status(200).json({});
    }
  );
});

/**
 * PUT /forms/:id
 */
app.put("/forms/:id", (req, res) => {
  const { name } = req.body;
  const params = {
    TableName: FORMS_TABLE,
    Key: {
      id: req.params.id
    },
    UpdateExpression: "set #name = :n",
    ExpressionAttributeNames: {
      "#name": "name"
    },
    ExpressionAttributeValues: {
      ":n": name
    },
    ReturnValues: "UPDATED_NEW"
  };

  dynamoDb.update(params, (error, data) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Could not create form!" });
    }

    res.status(200).json({ name });
  });
});

module.exports.handler = serverless(app);
