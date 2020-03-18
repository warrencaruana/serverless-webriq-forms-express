const bytes = require("bytes");
const get = require("lodash.get");
const axios = require("axios");
const validator = require("validator");

const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb
} = require("../config/constants");

const { fileTransport, mailer } = require("../services");
const {
  constructFormSubmissionData,
  sanitizeSubmissions
} = require("../helpers");

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
exports.postFormSubmissions = async (req, res) => {
  console.log("here");
  // @todo: validation goes here

  const [{ error, message }, data] = constructFormSubmissionData({
    data: {
      ...req.body,
      formId: req.params.formId
    },
    attachments: {
      ...req.files
    }
  });
  console.log("data", data);

  const form = req.formById;
  const files = req.files;
  const formData = data;

  if (error) {
    res.status(400).json(message);
    return;
  }

  console.log(req.files);

  const createSubmission = async data => {
    return new Promise((resolve, reject) => {
      dynamoDb.put(
        {
          TableName: FORM_SUBMISSIONS_TABLE,
          Item: data
        },
        (error, result) => {
          if (error) {
            console.log(error);
            reject(error);
          }

          resolve(data);
        }
      );
    });
  };

  const sendCreatedResponse = data => {
    res.status(201).json(data);

    return data;
  };

  const processUploads = async data => {
    const fileSizeLimit = bytes((form && form.uploadSize) || 0);

    const doUpload = upload => {
      return new Promise((resolve, reject) => {
        if (upload.size > fileSizeLimit) {
          reject("Skipping file upload due to size!");
          resolve("File attachment upload skipped!");
        }

        const file = fileTransport
          .upload(upload.path)
          .then(fileupload => {
            attachData = {
              fieldName: upload.fieldName,
              file_type: upload.type,
              public_id: fileupload.public_id,
              url: fileupload.secure_url
            };

            resolve(attachData);
          })
          .catch(reject);
      });
    };

    const uploads = Object.entries(files).map(([index, upload]) =>
      doUpload(upload)
    );

    await Promise.all(uploads).then(allUploads => {
      console.log("allUploads", allUploads);

      allUploads.forEach(upload => {
        data["payload"][`${upload.fieldName}`] = upload && upload.url;
        data.attachments.push(upload);
      });

      // @todo: update dynamodb here

      console.log("data", data);
    });

    return data;
  };

  const sendEmails = data => {
    const emailTo = get(form, "notifications.email.to", null);
    console.log("emailTo", emailTo);

    if (!emailTo || !validator.isEmail(emailTo)) {
      console.log(
        "Email address To not set or invalid. Skipping sending emails..."
      );
      return;
    }

    res.render(
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
          to: form.notifications.email.to,
          cc: form.notifications.email.cc || null,
          bcc: form.notifications.email.bcc || null,
          from: form.notifications.email.from || "no-reply@forms.webriq.com",
          subject: form.notifications.email.subject
            ? form.notifications.email.subject
            : "New Form Submission via WebriQ Forms",
          html: submissionEmail
        };

        mailer.sendMail(mailOptions, err => {
          if (err) {
            // @todo: log as sending email sending failed
            console.log(err);
            return res.status(400).json({
              message: "Something went wrong",
              errors: [{ msg: err }]
            });
          }
        });
      }
    );

    return data;
  };

  const sendWebhooks = data => {
    const submissions = data;

    form.notifications.webhooks.forEach(hook => {
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
          `New form submission from ${(form && form.name) ||
            "Form"}\n\nDetails below:\n--------------\n` +
          Object.keys(payload)
            .map(key => key + ": " + payload[key])
            .join("\n");

        axios({
          method: "post",
          url: hook.url,
          data: {
            text: slackText
          }
        })
          .then(res => console.log("[OK] Slack webhook sent!"))
          .catch(err => handleWebhookError(err));
        return;
      }

      // Normal webhooks
      axios
        .post(hook.url, submissions)
        .then(res => console.log("[OK] Webhook sent successfully!"))
        .catch(err => handleWebhookError(err));
    });

    return data;
  };

  return createSubmission(data)
    .then(sendCreatedResponse)
    .then(processUploads)
    .then(sendEmails)
    .then(sendWebhooks)
    .catch(error => {
      console.log(error);
      res.status(400).json({ error: "Could not create form submission!" });
    });
};

exports.processUploads = async ({ form, files, formData }) => {
  console.log("files", files);
  const fileSizeLimit = bytes((form && form.uploadSize) || 0);

  const doUpload = (upload, fileSizeLimit) => {
    return new Promise((resolve, reject) => {
      console.log("upload, fileSizeLimit", upload, fileSizeLimit);
      if (upload.size > fileSizeLimit) {
        reject("Skipping file upload due to size!");
        return;
      }

      resolve("ok");
      // console.log("uploading via cloudinary and update resource when done");
    });
  };

  const uploads = Object.entries(files).map(([index, upload]) =>
    doUpload(upload, fileSizeLimit)
  );

  Promise.all(uploads).then(allUploads => {
    // update dynamodb here
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
