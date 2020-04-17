const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const multerS3 = require("multer-s3");

const { BUCKET, IS_OFFLINE, s3 } = require("./config/constants");

const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + "--" + file.originalname);
    },
  }),
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.set("view engine", "pug");

// Load middlewares
const formMiddleware = require("./middleware/form");
const submissionMiddleware = require("./middleware/submission");

// Load controllers
const form = require("./controllers/form");
const submission = require("./controllers/submissions");
const nonce = require("./controllers/nonces");

/**
 * GET /
 */
app.get("/", (req, res) => {
  res.json({ message: "Welcome to WebriQ Forms API!", version: 2 });
});

/**
 * Forms
 */
app.get("/forms", form.getForms);
app.get("/forms/:id", form.getFormsByIdOrURL);
app.get("/forms/:url/url", form.getFormsByURL);
app.post("/forms", [formMiddleware.sanitizeFormData], form.postForms);
app.put(
  "/forms/:id",
  [submissionMiddleware.checkFormIdIsValid, formMiddleware.sanitizeFormData],
  form.putUpdateForms
);
app.delete(
  "/forms/:id",
  [submissionMiddleware.checkFormIdIsValid],
  form.deleteFormsById
);

/**
 * Submissions
 */
app.get("/forms/:formId/submissions", submission.getFormSubmissions);
app.get(
  "/forms/:formId/submissions/:id",
  submission.getFormSubmissionsByIdAndFormId
);
app.post(
  "/forms/:formId/submissions",
  [
    upload.any(),
    submissionMiddleware.checkFormIdIsValid,
    // submissionMiddleware.checkNonceIsValid,
    submissionMiddleware.checkSiteReferrerIsValid,
    submissionMiddleware.checkBodyIsNotEmpty,
  ],
  submission.postFormSubmissions
);
app.delete(
  "/forms/:formId/submissions",
  [submissionMiddleware.checkFormIdIsValid],
  submission.deleteFormSubmissionsByByFormId
);
app.delete(
  "/forms/:formId/submissions/:id",
  [
    // submissionMiddleware.checkFormIdIsValid,
    submissionMiddleware.checkSubmissionIdIsValid,
  ],
  submission.deleteFormSubmissionsByIdAndFormId
);

/**
 * Nonces
 */
app.get("/formnonces", nonce.getNonces);
app.post("/formnonces", nonce.createNonce);
app.delete(
  "/formnonces/:id",
  submissionMiddleware.checkNonceIsValid,
  nonce.deleteNonce
);

/**
 * JS Library
 */
app.get("/js/initForms", form.getJSLib);
app.get("/js/initReactForms", form.getReactJSLib);

module.exports.handler = serverless(app);
