const get = require("lodash.get");
const { removeSiteProtocols } = require("../helpers");

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

exports.sanitizeFormData = (req, res, next) => {
  const to = get(req.body, "notifications.email.to", []);
  const cc = get(req.body, "notifications.email.cc", []);
  const bcc = get(req.body, "notifications.email.bcc", []);
  const webhooks = get(req.body, "notifications.webhooks", []);

  if (to && typeof to === "string") {
    req.body.notifications.email.to = [to];
  }
  if (cc && typeof cc === "string") {
    req.body.notifications.email.cc = [cc];
  }
  if (bcc && typeof bcc === "string") {
    req.body.notifications.email.bcc = [bcc];
  }

  // Convert string siteUrls if strings
  let siteUrls = get(req.body, "siteUrls", []);
  let testUrls = get(req.body, "testUrls", []);

  if (siteUrls && typeof siteUrls === "string") {
    siteUrls = [siteUrls];
  }

  if (testUrls && typeof testUrls === "string") {
    testUrls = [testUrls];
  }

  // Cleanup HTTP protocols for site and test urls
  req.body.siteUrls = siteUrls.map((url) => removeSiteProtocols(url));
  req.body.testUrls = testUrls.map((url) => removeSiteProtocols(url));
  req.body.notifications = {
    ...req.body.notifications,
    ...{ webhooks: webhooks.map((webhook) => cleanupWebhook(webhook)) },
  };

  // console.log("req.body", JSON.stringify(req.body, null, 2));

  next();
};
