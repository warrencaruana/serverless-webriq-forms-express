const uuid = require("uuid/v4");
const get = require("lodash.get");
const omit = require("lodash.omit");

const constructFormData = (data) => {
  const _id = uuid();
  const now = new Date();

  return {
    _id,
    _type: "FORM",
    timestamp: get(data, "timestamp", now.getTime()),
    name: get(data, "name", "WebriQ Form"),
    siteUrls: get(data, "siteUrls", []),
    testUrls: get(data, "testUrls", []),
    tags: get(data, "tags", []),
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

const constructFormUpdateData = (data, originalData) => {
  let finalData = {
    _type: "FORM",
  };

  const {
    name,
    siteUrls,
    testUrls,
    tags,
    recaptcha,
    uploadSize,
    notifications,
  } = data;

  if (name) {
    finalData = { ...finalData, name };
  }
  if (siteUrls) {
    finalData = {
      ...finalData,
      siteUrls: siteUrls.map((url) => removeSiteProtocols(url)),
    };
  }
  if (testUrls) {
    finalData = {
      ...finalData,
      testUrls: testUrls.map((url) => removeSiteProtocols(url)),
    };
  }
  if (tags) {
    finalData = {
      ...finalData,
      tags: typeof tags === "string" ? [tags] : tags,
    };
  }
  if (typeof recaptcha != "undefined" && recaptcha.key && recaptcha.secret) {
    finalData = {
      ...finalData,
      recaptcha,
    };
  }
  if (uploadSize && uploadSize === "string") {
    finalData = {
      ...finalData,
      uploadSize,
    };
  }

  let finalNotifications = {};
  if (
    typeof notifications != "undefined" &&
    notifications.email &&
    typeof notifications.email.to != "undefined"
  ) {
    const emailTo = notifications.email.to;
    const to =
      emailTo === null ? [] : typeof emailTo === "string" ? [emailTo] : emailTo;

    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        to,
      },
    };
  } else {
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        to:
          (originalData &&
            originalData.notifications &&
            originalData.notifications.email &&
            originalData.notifications.email.to) ||
          [],
      },
    };
  }

  if (
    typeof notifications != "undefined" &&
    notifications.email &&
    typeof notifications.email.cc != "undefined"
  ) {
    const emailCc = notifications.email.cc;
    const cc =
      emailCc === null ? [] : typeof emailCc === "string" ? [emailCc] : emailCc;

    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        cc,
      },
    };
  } else {
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        cc:
          (originalData &&
            originalData.notifications &&
            originalData.notifications.email &&
            originalData.notifications.email.cc) ||
          [],
      },
    };
  }

  if (
    typeof notifications != "undefined" &&
    notifications.email &&
    typeof notifications.email.bcc != "undefined"
  ) {
    const emailBcc = notifications.email.bcc;
    const bcc =
      emailBcc === null
        ? []
        : typeof emailBcc === "string"
        ? [emailBcc]
        : emailBcc;

    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        bcc,
      },
    };
  } else {
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        bcc:
          (originalData &&
            originalData.notifications &&
            originalData.notifications.email &&
            originalData.notifications.email.bcc) ||
          [],
      },
    };
  }

  if (
    typeof notifications != "undefined" &&
    notifications.email &&
    typeof notifications.email.subject != "undefined"
  ) {
    const emailSubject = notifications.email.subject;
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        subject: emailSubject,
      },
    };
  } else {
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        subject:
          (originalData &&
            originalData.notifications &&
            originalData.notifications.email &&
            originalData.notifications.email.subject) ||
          null,
      },
    };
  }

  if (
    typeof notifications != "undefined" &&
    notifications.email &&
    typeof notifications.email.from != "undefined"
  ) {
    const emailFrom = notifications.email.from;
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        from: emailFrom,
      },
    };
  } else {
    finalNotifications = {
      ...finalNotifications,
      email: {
        ...finalNotifications.email,
        from:
          (originalData &&
            originalData.notifications &&
            originalData.notifications.email &&
            originalData.notifications.email.from) ||
          null,
      },
    };
  }

  if (typeof notifications != "undefined" && notifications.webhooks) {
    const notificationWebhooks = notifications.webhooks.map((webhook) =>
      cleanupWebhook(webhook)
    );
    finalNotifications = {
      ...finalNotifications,
      webhooks: notificationWebhooks,
    };
  } else {
    console.log("yere");
    finalNotifications = {
      ...finalNotifications,
      webhooks: originalData.notifications.webhooks,
    };
  }

  return { ...finalData, ...{ notifications: finalNotifications } };
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
  formData = omit(formData, "Referer");
  formData = omit(formData, "Origin");

  if (Object.entries(attachments).length > 0) {
    Object.entries(attachments).forEach(([index, upload]) => {
      formData[`${upload.fieldname}`] = `Processing attachment...`;
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
      timestamp: now.getTime(),
      _form: formId,
      payload: formData,
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

const constructNonceData = (data) => {
  const _id = uuid();
  const now = new Date();
  const getTomorrowsDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow;
  };
  const tomorrowDate = getTomorrowsDate();

  return {
    _id,
    _type: "NONCE",
    timestamp: get(data, "timestamp", now.getTime()),
    expiresAt: Math.round(tomorrowDate / 1000),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    token: get(data, "token"),
    _form: get(data, "_form"),
  };
};

function cleanupWebhook(webhook) {
  if (webhook && !webhook.url) {
    console.log("Invalid webhook without URL");
    return null;
  }

  return {
    url: webhook && webhook.url,
    name: (webhook && webhook.name) || "New Webhook",
    status:
      (webhook &&
        webhook.status &&
        ["enabled", "disabled"].includes(webhook.status) &&
        webhook.status) ||
      "enabled",
  };
}

const sanitizeForms = (json) => {
  if (json.length) {
    let str = [];
    for (let i = json.length - 1; i >= 0; i--) {
      str[i] = JSON.stringify(json[i]);
      str[i] = str[i].replace(/\"_id\":/g, '"id":');
      str[i] = str[i].replace(/\"timestamp\":/g, '"timestamp":');
      str[i] = str[i].replace(/\"_type\":/g, '"type":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    str = str.replace(/\"timestamp\":/g, '"timestamp":');
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
      str[i] = str[i].replace(/\"timestamp\":/g, '"timestamp":');
      json[i] = JSON.parse(str[i]);
    }
  } else {
    let str;
    str = JSON.stringify(json);
    str = str.replace(/\"_id\":/g, '"id":');
    str = str.replace(/\"_form\":/g, '"form":');
    str = str.replace(/\"_type\":/g, '"type":');
    str = str.replace(/\"timestamp\":/g, '"timestamp":');
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
  constructFormUpdateData,
  constructFormSubmissionData,
  constructNonceData,
  removeSiteProtocols,
  sanitizeForms,
  sanitizeSubmissions,
};
