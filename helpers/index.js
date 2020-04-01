const uuid = require("uuid/v4");
const get = require("lodash.get");
const omit = require("lodash.omit");

const constructFormData = (data) => {
  const _id = uuid();
  const now = new Date();

  return {
    _id,
    _type: "FORM",
    _timestamp: get(data, "_timestamp", Math.round(now / 1000)),
    name: get(data, "name", "WebriQ Form"),
    siteUrls: get(data, "siteUrls", []),
    testUrls: get(data, "testUrls", []),
    tags: get(data, "tags", []),
    formNonces: get(data, "formNonces", []),
    recaptcha: {
      key: get(data, "recaptcha.key", process.env.APP_DEFAULT_RECAPTCHA_KEY),
      secret: get(
        data,
        "recaptcha.secret",
        process.env.APP_DEFAULT_RECAPTCHA_SECRET
      ),
    },
    uploadSize: get(data, "uploadSize", "10MB"),
    notifications: {
      email: {
        subject: get(data, "notifications.email.subject", null),
        from: get(data, "notifications.email.from", null),
        to: get(data, "notifications.email.to", []),
        cc: get(data, "notifications.email.cc", []),
        bcc: get(data, "notifications.email.bcc", []),
      },
      webhooks: get(data, "notifications.webhooks", []),
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

const constructFormSubmissionData = ({ data, attachments = [] }) => {
  const _id = uuid();
  const now = new Date();
  const error = false;
  const message = null;

  const formId = get(data, "formId");
  if (!formId) {
    error = true;
    message = "Form ID is not found in form submission!";
  }

  let formData = data;
  formData = omit(formData, "g-recaptcha-response");
  formData = omit(formData, "formId");
  formData = omit(formData, "_nonce");

  if (Object.entries(attachments).length > 0) {
    Object.entries(attachments).forEach(([index, upload]) => {
      formData[`${upload.fieldName}`] = `Processing attachment...`;
    });
  }

  return [
    {
      error,
      message,
    },
    {
      _id,
      _type: "SUBMISSION",
      _timestamp: Math.round(now / 1000),
      _form: formId,
      payload: formData,
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

const sanitizeForms = (json) => {
  if (json.length) {
    let str = [];
    for (let i = json.length - 1; i >= 0; i--) {
      str[i] = JSON.stringify(json[i]);
      str[i] = str[i].replace(/\"_id\":/g, '"id":');
      str[i] = str[i].replace(/\"_timestamp\":/g, '"timestamp":');
      str[i] = str[i].replace(/\"_type\":/g, '"type":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    str = str.replace(/\"_timestamp\":/g, '"timestamp":');
    str = str.replace(/\"_type\":/g, '"type":');
    json = JSON.parse(str);
  }

  return json;
};

const sanitizeSubmissions = (json) => {
  if (json.length) {
    let str = [];
    for (let i = json.length - 1; i >= 0; i--) {
      str[i] = JSON.stringify(json[i]);
      str[i] = str[i].replace(/\"_id\":/g, '"id":');
      str[i] = str[i].replace(/\"_form\":/g, '"form":');
      str[i] = str[i].replace(/\"_type\":/g, '"type":');
      str[i] = str[i].replace(/\"_timestamp\":/g, '"timestamp":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    str = str.replace(/\"_form\":/g, '"form":');
    str = str.replace(/\"_type\":/g, '"type":');
    str = str.replace(/\"_timestamp\":/g, '"timestamp":');
    json = JSON.parse(str);
  }

  return json;
};

const removeSiteProtocols = (urls) => {
  if (urls && Array.isArray(urls)) {
    return urls.map((url) => url.replace(/^https?\:\/\//i, ""));
  }

  if (urls && (typeof urls === "string" || urls instanceof String)) {
    return urls.replace(/^https?\:\/\//i, "");
  }

  return urls;
};

module.exports = {
  constructFormData,
  constructFormSubmissionData,
  removeSiteProtocols,
  sanitizeForms,
  sanitizeSubmissions,
};
