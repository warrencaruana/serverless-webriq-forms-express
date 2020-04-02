const bytes = require("bytes");
const get = require("lodash.get");
const axios = require("axios");
const validator = require("validator");

const { FORM_SUBMISSIONS_TABLE, dynamoDb } = require("../config/constants");
const { fileTransport, mailer } = require("../services");
const {
  constructFormSubmissionData,
  sanitizeSubmissions,
} = require("../helpers");

const { submissions, nonces } = require("../services/db");

/**
 * GET /forms/:id/submissions
 */
exports.getFormSubmissions = async (req, res) => {
  try {
    const result = await submissions.getByFormId(req.params.formId);

    if (result && result.Items) {
      return res.json(sanitizeSubmissions(result.Items));
    }

    return res.json([]);
  } catch (error) {
    console.log("error", error);
    return res.status(404).json({
      error: "Forms submissions not found!",
      message: error && error.message,
    });
  }
};

/**
 * POST /forms/:id/submissions
 */
exports.postFormSubmissions = async (req, res) => {
  // @todo: validation goes here
  const form = req.formById;
  console.log("form", form);
  const files = req.files;
  const [{ error, message }, data] = constructFormSubmissionData({
    data: {
      ...req.body,
      formId: req.params.formId,
    },
    attachments: {
      ...req.files,
    },
  });
  const formData = data;

  if (error) {
    res.status(400).json(message);
    return;
  }

  const createSubmission = (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        await submissions.create(data);

        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  };

  const deleteNonce = (data) => {
    return new Promise((resolve, reject) => {
      try {
        if (!req.nonceById) {
          reject("Nonce not found!");
        }

        nonces.delete(req.nonceById._id, req.nonceById);

        console.log("[OK] Nonce is deleted!");
        resolve(data);
      } catch (err) {
        console.log("err", err);
        reject(err);
      }
    });
  };

  const sendCreatedResponse = (data) => {
    console.log("data", data);
    res.status(201).json(sanitizeSubmissions(data));

    return data;
  };

  const processUploads = async (data) => {
    const fileSizeLimit = bytes((form && form.uploadSize) || 0);

    const doUpload = (upload) => {
      return new Promise((resolve, reject) => {
        if (upload.size > fileSizeLimit) {
          reject("Skipping file upload due to size!");
          resolve("File attachment upload skipped!");
        }

        const file = fileTransport
          .upload(upload.path)
          .then((fileupload) => {
            attachData = {
              fieldName: upload.fieldName,
              file_type: upload.type,
              public_id: fileupload.public_id,
              url: fileupload.secure_url,
            };

            resolve(attachData);
          })
          .catch(reject);
      });
    };

    const uploads = Object.entries(files).map(([index, upload]) =>
      doUpload(upload)
    );

    try {
      return await Promise.all(uploads).then((allUploads) => {
        allUploads.forEach((upload) => {
          data["payload"][`${upload.fieldName}`] = upload && upload.url;
          data.attachments.push(upload);
        });

        console.log("[OK] Uploads successful");

        // @todo: update dynamodb here

        console.log("data", data);
        return data;
      });
    } catch (err) {
      console.log(
        "[ERROR] Something went wrong processing uploads",
        err && err.message
      );

      return data;
    }
  };

  const sendEmails = (data) => {
    console.log("[OK] Start sending emails!");
    const emailTos = get(form, "notifications.email.to", []);
    console.log("emailTos", emailTos);

    emailTos.map((email) => console.log(email));

    const sendEmail = (emailTo) => {
      return new Promise((resolve, reject) => {
        if (!emailTo || !validator.isEmail(emailTo)) {
          console.log(
            "Email address To not set or invalid. Skipping sending emails..."
          );
          return;
        }

        return res.render(
          "mail",
          { data, formName: form.name },
          (err, submissionEmail) => {
            if (err) {
              // @todo: log as sending email processing failed
              console.log("Email template processing failed!", err);
              return;
            }

            // Send email
            let mailOptions = {
              to: emailTo,
              cc: form.notifications.email.cc || null,
              bcc: form.notifications.email.bcc || null,
              from:
                form.notifications.email.from || "no-reply@forms.webriq.com",
              subject: form.notifications.email.subject
                ? form.notifications.email.subject
                : "New Form Submission via WebriQ Forms",
              html: submissionEmail,
            };

            mailer.sendMail(mailOptions, (err) => {
              if (err) {
                // @todo: log as sending email sending failed
                console.log({
                  message: "Something went wrong",
                  errors: [{ msg: err }],
                });
                reject(err);
              }

              console.log("[OK] Email sent to " + mailOptions.to);
              resolve("OK");
            });
          }
        );
      });
    };

    return Promise.all(emailTos.map(sendEmail)).then((all) => {
      console.log("all", all);
      console.log("data", data);
      return data;
    });
  };

  const sendWebhooks = (data) => {
    console.log("[OK] Start sending webhooks!");
    const submissions = data;

    get(form, "notifications.webhooks", []).forEach((hook) => {
      if (hook.status !== "enabled") {
        return;
      }

      function handleWebhookError(error) {
        if (error.response) {
          console.log("[ERR] Slack webhook not sent!");
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log("Error", error.message);
        }
        console.log(error.config);
      }

      // Handling Slack webhooks
      if (hook && hook.url.includes("hooks.slack.com")) {
        const payload = submissions && submissions.payload;
        const slackText =
          `New form submission from ${
            (form && form.name) || "Form"
          }\n\nDetails below:\n--------------\n` +
          Object.keys(payload)
            .map((key) => key + ": " + payload[key])
            .join("\n");

        axios({
          method: "post",
          url: hook.url,
          data: {
            text: slackText,
          },
        })
          .then((res) => console.log("[OK] Slack webhook sent!"))
          .catch((err) => handleWebhookError(err));
        return;
      }

      // Normal webhooks
      return axios
        .post(hook.url, submissions)
        .then((res) => console.log("[OK] Webhook sent to " + hook.url))
        .then(() => {
          return data;
        })
        .catch((err) => handleWebhookError(err));
    });
  };

  return processUploads(data)
    .then(createSubmission)
    .then(deleteNonce)
    .then(async (data) => {
      console.log("sending notifications!");
      return await Promise.all([sendEmails(data), sendWebhooks(data)])
        .then((allData) => {
          return allData[0];
        })
        .catch((err) => console.log("error", error));

      // return data;
    })
    .then(sendCreatedResponse)
    .catch((error) => {
      console.log(error);
      res.status(400).json({ error: "Could not create form submission!" });
    });
};

/**
 * GET /forms/:formId/submissions/:id
 */
exports.getFormSubmissionsByIdAndFormId = async (req, res) => {
  try {
    let result = [];
    result = await submissions.getByFormIdAndId(
      req.params.formId,
      req.params.id
    );
    console.log("result", result);

    if (result && result.Count < 1) {
      return res.status(404).json({
        message: "Resource not found!",
      });
    }

    if (result && result.Items) {
      result = sanitizeSubmissions(result.Items[0]);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: true,
      message: error && error.message,
    });
  }
};

/**
 * DELETE /forms/:formId/submissions/:id
 */
exports.deleteFormSubmissionsByIdAndFormId = async (req, res) => {
  const data = req.submissionById;
  console.log("data", data);

  try {
    const result = await submissions.deleteByFormIdAndId(
      req.params.formId,
      req.params.id,
      data
    );

    return res.status(204).json();
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: "Could not delete submission!",
      message: error && error.message,
    });
  }
};

/**
 * DELETE /forms/:formId/submissions
 */
exports.deleteFormSubmissionsByByFormId = async (req, res) => {
  try {
    const result = await submissions.deleteByFormId(req.params.formId);

    return res.status(204).json();
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: "Could not delete submission!",
      message: error && error.message,
    });
  }
};
