const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const formData = require("express-form-data");
const os = require("os");
const cors = require("cors");

const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};

app.use(formData.parse(options));
app.use(formData.format());
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
    submissionMiddleware.checkFormIdIsValid,
    submissionMiddleware.checkNonceIsValid,
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
