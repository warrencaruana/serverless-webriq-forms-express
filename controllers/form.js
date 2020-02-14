const JavaScriptObfuscator = require("javascript-obfuscator");
const AWS = require("aws-sdk");

const FORMS_TABLE = process.env.FORMS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === "true") {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8000"
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

const initialFormData = {
  referer: null,
  forms: [],
  formNonces: [],
  siteUrls: []
};

exports.initLib = async (req, res) => {
  let forms = [];

  let url;
  try {
    url = new URL(req.headers && req.headers.referer);
  } catch (err) {
    return {
      error: true,
      message: "Unauthorized: unrecognized client!",
      data: initialFormData
    };
  }

  const referer = url && !url.host ? url.href : url.host;

  if (referer) {
    const params = {
      TableName: FORMS_TABLE,
      FilterExpression: "contains (siteUrls, :siteUrls)",
      ExpressionAttributeValues: {
        ":siteUrls": referer
      }
    };

    dynamoDb.scan(params, (error, result) => {
      if (error) {
        console.log(error);
        return {
          error: true,
          message: `Internal error retrieving form data!`,
          data: initialFormData
        };
      }

      if (result.Items) {
        forms = result.Items;
      }
    });
  }

  if (!forms || forms.length < 1) {
    return {
      error: true,
      message: `WebriQ Forms: Site is not registered and/or ${referer}' is not present in its 'siteUrls'. When using multiple forms in a page, make sure to specify the form ID in the form 'data-form-id' attribute. See ${process.env.APP_URL}/docs for more info.`,
      data: initialFormData
    };
  }

  // let formNonces = [];
  // let siteUrls = [];

  // // Create _nonces
  // forms.forEach(async form => {
  //   const currentNonce = generateNonce();

  //   let data = {
  //     token: currentNonce,
  //     expiresAt: moment()
  //       .add("1", "days")
  //       .toDate()
  //   };

  //   // Push new _nonces
  //   formNonces.push({
  //     formId: form._id.toString(),
  //     nonce: currentNonce
  //   });

  //   // Push new site urls
  //   siteUrls.push(form.siteUrls);

  //   Forms.updateOne(
  //     { _id: form._id },
  //     {
  //       $addToSet: {
  //         validNonces: [data]
  //       }
  //     },
  //     (err, result) => console.log(err, result)
  //   );
  // });

  // siteUrls = _.uniq(_.flatten(siteUrls));

  return {
    forms,
    referer,
    formNonces: [],
    siteUrls: []
  };
};

exports.getJSLib = async (req, res) => {
  const {
    error,
    message,
    data: { formNonces, siteUrls, forms, referer }
  } = await this.initLib(req, res);

  // if (error) {
  //   return res.type(".js").send(`console.error("${message}");`);
  // }

  // if (!error && forms.length < 1) {
  //   return res
  //     .type(".js")
  //     .send(
  //       `console.error("WebriQ Forms: Site is not registered and/or '${referer}' is not present in its 'siteUrls'. When using multiple forms in a page, make sure to specify the form ID in the form 'data-form-id' attribute. See ${process.env.APP_URL}/docs for more info.");`
  //     );
  // }

  res.render(
    "js",
    {
      apiUrl: process.env.WEBRIQ_API_URL,
      formNonces: JSON.stringify(formNonces),
      docsUrl: process.env.WEBRIQ_API_DOCS_URL || process.env.APP_URL + "/docs"
    },
    (err, js) => {
      if (err) {
        throw err;
      }

      const jsOutput = js.replace("<script>", "").replace("</script>", "");

      // See options at: https://obfuscator.io/ or https://www.npmjs.com/package/javascript-obfuscator
      const jsFile = JavaScriptObfuscator.obfuscate(jsOutput, {
        compact: true,
        controlFlowFlattening: true,
        // deadCodeInjection: true,
        selfDefending: true, // code resilient against formating and variable renaming
        domainLock: siteUrls, // prevents code executing from domain
        transformObjectKeys: true,
        unicodeEscapeSequence: true
      });

      // res.type("js").send(jsFile.getObfuscatedCode());
      res.type("js").send(jsOutput);
    }
  );
};

const generateNonce = () => {
  return (
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
};
