const uuid = require("uuid/v4");
const get = require("lodash.get");

exports.constructFormData = function(data) {
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
        "recaptcha.key",
        process.env.APP_DEFAULT_RECAPTCHA_SECRET
      )
    },
    uploadSize: "10MB",
    notifications: {
      email: {
        subject: get(data, "notifications.email.subject", null),
        to: get(data, "notifications.email.to", null),
        from: get(data, "notifications.email.from", null),
        bcc: get(data, "notifications.email.bcc", null)
      },
      webhooks: []
    }
  };
};

exports.constructFormSubmissionData = function(data) {
  const _id = uuid();
  const error = false;

  const formId = get(data, "formId");
  if (!formId) {
    error = true;
  }

  return [
    error,
    {
      _id,
      _form: formId,
      payload: get(data, ""),
      attachments: []
    }
  ];
};

exports.removeSiteProtocols = urls => {
  if (urls && Array.isArray(urls)) {
    return urls.map(url => url.replace(/^https?\:\/\//i, ""));
  }

  if (urls && (typeof urls === "string" || urls instanceof String)) {
    return urls.replace(/^https?\:\/\//i, "");
  }

  return urls;
};
