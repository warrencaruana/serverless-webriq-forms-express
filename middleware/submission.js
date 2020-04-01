const AWS = require("aws-sdk");

const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb,
} = require("../config/constants");

const { forms, submissions } = require("../services/db");
const { removeSiteProtocols } = require("../helpers");

exports.checkBodyIsNotEmpty = async (req, res, next) => {
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      message: "Validation Failed",
      errors: [
        {
          msg: "Form body must not be empty",
        },
      ],
    });
  }

  next();
};

exports.checkNonceIsValid = async (req, res, next) => {
  const origin = req.get("origin");
  const referer = req.get("referer");

  const { _nonce } = req.body;

  if (!_nonce) {
    return res.status(400).json({
      message: "Invalid form submission request. Security feature not met!",
    });
  }

  const nonceItem = await dynamoDb
    .get({
      TableName: FORMNONCES_TABLE,
      Key: {
        token: _nonce,
      },
    })
    .promise();

  if (!nonceItem || !nonceItem.Item) {
    return res.status(403).json({
      message:
        "Unauthorized to perform form submission because _nonce is invalid or not found!",
    });
  }

  const hasNonceExpired = (expiryDate) => {
    return new Date().getTime() > expiryDate;
  };

  if (hasNonceExpired(nonceItem.Item.expiryDate)) {
    return res.status(400).json({
      message: "Form nonce has expired. Please try again!",
    });
  }

  const form = req.formById;
  if (form && !form.siteUrls.includes(removeSiteProtocols(origin || referer))) {
    return res.status(403).json({
      message:
        "Unauthorized to perform form submission because host/origin is not allowed for this resource!",
    });
  }

  next();
};

exports.checkSubmissionIdIsValid = async (req, res, next) => {
  const submissionById = await submissions.getByFormIdAndId(
    req.params.formId,
    req.params.id
  );
  console.log("submissionById", submissionById);

  if (!submissionById || !submissionById.Items) {
    res.status(404).json({
      message: "Form resource not found by ID!",
    });
    return;
  }

  // If found, attach submissionById for use later
  req.submissionById = submissionById.Items[0];

  next();
};

exports.checkFormIdIsValid = async (req, res, next) => {
  console.log(
    "req.params.formId || req.params.id",
    req.params.formId || req.params.id
  );
  const formById = await forms.getById(req.params.formId || req.params.id);
  console.log("formById", formById);

  if (!formById || !formById.Items) {
    res.status(404).json({
      message: "Form resource not found by ID!",
    });
    return;
  }

  // If found, attach formById for use later
  req.formById = formById.Items[0];

  next();
};

exports.checkSiteReferrerIsValid = (req, res, next) => {
  console.log("req.originalUrl", req.originalUrl);

  next();
};
