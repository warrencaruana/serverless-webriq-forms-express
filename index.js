const awsServerlessExpress = require("aws-serverless-express");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const server = awsServerlessExpress.createServer(app);
const cors = require("cors");
const multer = require("multer");
const multerS3 = require("multer-s3");

const { BUCKET, s3 } = require("./config/constants");

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
const jwtMiddleware = require("./middleware/jwt");

// Load controllers
const form = require("./controllers/form");
const submission = require("./controllers/submissions");
const user = require("./controllers/user");

/**
 * GET /
 */
app.get("/", (req, res) => {
  res.json({ message: "Welcome to WebriQ Forms API!", version: 2 });
});

/**
 * Forms
 */
app.get("/forms", jwtMiddleware.verifyToken, form.getForms);
app.get("/forms/:id", form.getFormsByIdOrURL);
app.get("/forms/:url/url", form.getFormsByURL);
app.post(
  "/forms",
  [jwtMiddleware.verifyToken, formMiddleware.sanitizeFormData],
  form.postForms
);
app.put(
  "/forms/:id",
  [jwtMiddleware.verifyToken, submissionMiddleware.checkFormIdIsValid],
  form.putUpdateForms
);
app.delete(
  "/forms/:id",
  [jwtMiddleware.verifyToken, submissionMiddleware.checkFormIdIsValid],
  form.deleteFormsById
);

/**
 * Submissions
 */
app.get(
  "/forms/:formId/submissions",
  jwtMiddleware.verifyToken,
  submission.getFormSubmissions
);
app.get(
  "/forms/:formId/submissions/:id",
  jwtMiddleware.verifyToken,
  submission.getFormSubmissionsByIdAndFormId
);
app.post(
  "/forms/:formId/submissions",
  [
    upload.any(),
    submissionMiddleware.checkFormIdIsValid,
    submissionMiddleware.checkNonceIsPresent,
    // submissionMiddleware.checkNonceIsValid,
    submissionMiddleware.checkSiteReferrerIsValid,
    submissionMiddleware.checkBodyIsNotEmpty,
  ],
  submission.postFormSubmissions
);
app.delete(
  "/forms/:formId/submissions",
  [jwtMiddleware.verifyToken, submissionMiddleware.checkFormIdIsValid],
  submission.deleteFormSubmissionsByByFormId
);
app.delete(
  "/forms/:formId/submissions/:id",
  [
    // submissionMiddleware.checkFormIdIsValid,
    [jwtMiddleware.verifyToken, submissionMiddleware.checkSubmissionIdIsValid],
  ],
  submission.deleteFormSubmissionsByIdAndFormId
);

/**
 * Authenticate via JWT
 */
app.get("/tokentest", jwtMiddleware.verifyToken, (req, res) => {
  return res.json({
    message: "ok",
  });
});
app.get("/setup/users/admin", user.setupAdminUser);
app.post("/login", user.postLogin);
app.get("/logout", user.logout);

/**
 * JS Library
 */
app.get("/js/initForms", form.getJSLib);
app.get("/js/initReactForms", form.getReactJSLib);
app.post("/siteVerify", form.siteVerify);

// module.exports.handler = serverless(app);
exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
