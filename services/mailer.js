const AWS = require("aws-sdk");
const nodemailer = require("nodemailer");
const IS_OFFLINE = process.env.IS_OFFLINE;

let transporter;

if (IS_OFFLINE === "true") {
  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.ACCESS_SECRET_KEY,
    region: process.env.APP_REGION || "us-west-2",
  });

  transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: "2010-12-01",
    }),
  });
  // transporter = nodemailer.createTransport({
  //   host: "smtp.mailtrap.io",
  //   port: 2525,
  //   auth: {
  //     user: process.env.MAILTRAP_USER,
  //     pass: process.env.MAILTRAP_PASSWORD,
  //   },
  // });
} else {
  transporter = nodemailer.createTransport({
    service: "Mailgun",
    auth: {
      user: process.env.MAILGUN_USER,
      pass: process.env.MAILGUN_PASSWORD,
    },
  });
}

module.exports = transporter;
