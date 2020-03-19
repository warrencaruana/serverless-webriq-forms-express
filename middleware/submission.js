const AWS = require("aws-sdk");

const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb
} = require("../config/constants");

exports.checkBodyIsNotEmpty = async (req, res, next) => {
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      message: "Validation Failed",
      errors: [
        {
          msg: "Form body must not be empty"
        }
      ]
    });
  }

  next();
};

exports.checkNonceIsValid = async (req, res, next) => {
  const { _nonce } = req.body;

  const nonceItem = await dynamoDb
    .get({
      TableName: FORMNONCES_TABLE,
      Key: {
        token: _nonce
      }
    })
    .promise();

  if (!nonceItem || !nonceItem.Item) {
    res.status(403).json({
      message: "Unauthorized to perform form submission!"
    });
    return;
  }

  next();
};

exports.checkFormIdIsValid = async (req, res, next) => {
  console.log("req.originalUrl", req.originalUrl);
  const formById = await dynamoDb
    .get({
      TableName: FORMS_TABLE,
      Key: {
        _id: req.params.formId || req.params.id
      }
    })
    .promise();

  if (!formById || !formById.Item) {
    res.status(404).json({
      message: "Form resource not found by ID!"
    });
    return;
  }

  // If found, attach formById for use later
  req.formById = formById.Item;

  next();
};

exports.checkSiteReferrerIsValid = (req, res, next) => {
  console.log("req.originalUrl", req.originalUrl);

  next();
};
