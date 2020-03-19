const SimpleSchema = require("simpl-schema");

const formSchema = new SimpleSchema({
  name: String,
  siteUrls: { type: [String], required: true },
  testUrls: { type: [String] },
  tags: { type: Array, defaultValue: [] },
  recaptcha: {
    isDefaultValue: { type: Boolean, defaultValue: true },
    version: { type: Number, defaultValue: 3 },
    key: { type: String, defaultValue: null },
    secret: { type: String, defaultValue: null }
  },
  uploadSize: { type: String, defaultValue: "10MB" },
  notifications: {
    email: {
      subject: { type: String, defaultValue: null },
      from: { type: String, defaultValue: null },
      to: { type: Array, defaultValue: [] },
      cc: { type: Array, defaultValue: [] },
      bcc: { type: Array, defaultValue: [] }
    },
    webhooks: [
      {
        name: { type: String, defaultValue: null },
        url: { type: String, defaultValue: null, required: true },
        status: {
          type: String,
          defaultValue: "enabled",
          allowedValues: ["enabled", "disabled"]
        }
      }
    ]
  },
  isTest: {
    type: Boolean,
    defaultValue: false,
    allowedValues: [true, false]
  }
});

SimpleSchema.messageBox.messages({
  en: {
    webhookStatusInvalid: "Webhook status must either be true ofalsed'"
  }
});

module.exports = Form;
