const uuid = require("uuid/v4");
const get = require("lodash.get");
const omit = require("lodash.omit");

const constructFormData = data => {
  console.log("construct1111");
  const _id = uuid();

  return {
    _id,
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
      )
    },
    uploadSize: get(data, "uploadSize", "10MB"),
    notifications: {
      email: {
        subject: get(data, "notifications.email.subject", null),
        to: get(data, "notifications.email.to", null),
        cc: get(data, "notifications.email.cc", null),
        from: get(data, "notifications.email.from", null),
        bcc: get(data, "notifications.email.bcc", null)
      },
      webhooks: get(data, "notifications.webhooks", [])
      // {
      // name: { type: String, default: null },
      // url: { type: String, default: null },
      // status: {
      // type: String,
      // enum: ["enabled", "disabled"],
      // default: "enabled"
      // },
      // }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const constructFormSubmissionData = ({ data, attachments = [] }) => {
  const _id = uuid();
  const error = false;
  const message = null;

  const formId = get(data, "formId");
  if (!formId) {
    error = true;
    message = "Form ID is not found in form submission!";
  }

  let formData = data;
  formData = omit(formData, "g-recaptcha-response");
  formData = omit(formData, "_nonce");

  if (Object.entries(attachments).length > 0) {
    Object.entries(attachments).forEach(([index, upload]) => {
      formData[`${upload.fieldName}`] = `Processing attachment...`;
    });
  }

  return [
    {
      error,
      message
    },
    {
      _id,
      _form: formId,
      payload: formData,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
};

const sanitizeForms = json => {
  if (json.length) {
    let str = [];
    for (let i = json.length - 1; i >= 0; i--) {
      str[i] = JSON.stringify(json[i]);
      str[i] = str[i].replace(/\"_id\":/g, '"id":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    json = JSON.parse(str);
  }

  return json;
};

const sanitizeSubmissions = json => {
  if (json.length) {
    let str = [];
    for (let i = json.length - 1; i >= 0; i--) {
      str[i] = JSON.stringify(json[i]);
      str[i] = str[i].replace(/\"_id\":/g, '"id":');
      str[i] = str[i].replace(/\"_form\":/g, '"form":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    str = str.replace(/\"_form\":/g, '"form":');
    json = JSON.parse(str);
  }

  return json;
};

const removeSiteProtocols = urls => {
  if (urls && Array.isArray(urls)) {
    return urls.map(url => url.replace(/^https?\:\/\//i, ""));
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
  sanitizeSubmissions
};
