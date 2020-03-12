const JavaScriptObfuscator = require("javascript-obfuscator");
const AWS = require("aws-sdk");
const flatten = require("lodash.flatten");
const uniq = require("lodash.uniq");
const uuid = require("uuid/v4");
const get = require("lodash.get");

const FORMS_TABLE = process.env.FORMS_TABLE;
const FORMNONCES_TABLE = process.env.FORMNONCES_TABLE;
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

const constructFormData = require("../helpers").constructFormData;

const initialFormData = {
  referer: null,
  forms: [],
  formNonces: [],
  siteUrls: []
};

const params = {
  TableName: FORMS_TABLE
};

/**
 * GET /forms
 */
exports.getForms = (req, res) => {
  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Forms not found!" });
    }

    if (result) {
      res.json(result.Items);
    } else {
      res.status(404).json({ error: "Forms not found!" });
    }
  });
};

/**
 * GET /forms/:url/url
 */
exports.getFormsByURL = async (req, res) => {
  console.log("req.params.url", req.params.url);
  let forms = [];

  const params = {
    TableName: FORMS_TABLE,
    FilterExpression: "contains (siteUrls, :siteUrls)",
    ExpressionAttributeValues: {
      ":siteUrls": req.params.url
    }
  };

  await dynamoDb
    .scan(params, (error, result) => {
      if (error) {
        console.log(error);
        return {
          error: true,
          message: `Internal error retrieving forms data!`,
          data: null
        };
      }

      if (result.Items) {
        forms = result.Items;
      }
    })
    .promise();

  const formsData = forms.map(form => ({
    id: form._id,
    name: form.name,
    recaptcha: {
      key: get(form, "recaptcha.key", null)
    }
  }));

  return res.status(200).json(formsData);
};

/**
 * GET /forms/:id
 */
exports.getFormsById = (req, res) => {
  dynamoDb.get(
    {
      TableName: FORMS_TABLE,
      Key: {
        _id: req.params.id
      }
    },
    (error, result) => {
      console.log("result", result);
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Form error!" });
      }

      if (result) {
        res.json(result.Item);
      } else {
        res.status(404).json({ error: "Resource not found!" });
      }
    }
  );
};

/**
 * POST /forms
 */
exports.postForms = (req, res) => {
  // @todo: validation goes here

  return res.json({});

  const data = constructFormData(req.body);
  const params = {
    TableName: FORMS_TABLE,
    Item: data
  };

  dynamoDb.put(params, error => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Could not create form!" });
    }

    res.status(201).json(data);
  });
};

/**
 * PUT /forms/:id
 *
 * @todo: Update other fields
 */
exports.putUpdateForms = (req, res) => {
  const { name } = req.body;
  const params = {
    TableName: FORMS_TABLE,
    Key: {
      _id: req.params.id
    },
    UpdateExpression: "set #name = :n",
    ExpressionAttributeNames: {
      "#name": "name"
    },
    ExpressionAttributeValues: {
      ":n": name
    },
    ReturnValues: "UPDATED_NEW"
  };

  dynamoDb.update(params, (error, data) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Could not create form!" });
    }

    res.status(200).json({ name });
  });
};

/**
 * DELETE /forms/:id
 */
exports.deleteFormsById = (req, res) => {
  dynamoDb.delete(
    {
      ...params,
      Key: {
        _id: req.params.id
      }
    },
    error => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Could not create form!" });
      }

      res.status(204).json();
    }
  );
};

/**
 * GET /js/initForms
 */
exports.getJSLib = async (req, res) => {
  const {
    error,
    message,
    data: { formNonces, siteUrls, forms, referer }
  } = await this.initLib(req, res);

  if (error) {
    return res.type(".js").send(`console.error("${message}");`);
  }

  if (!error && forms.length < 1) {
    return res
      .type(".js")
      .send(
        `console.error("WebriQ Forms: Site is not registered and/or '${referer}' is not present in its 'siteUrls'. When using multiple forms in a page, make sure to specify the form ID in the form 'data-form-id' attribute. See ${process.env.APP_URL}/docs for more info.");`
      );
  }

  console.log(process.env.WEBRIQ_API_URL || "http://localhost:3000");

  res.render(
    "js",
    {
      apiUrl: process.env.WEBRIQ_API_URL || "http://localhost:3000",
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

    await dynamoDb
      .scan(params, (error, result) => {
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
      })
      .promise();
  }

  console.log("forms", forms);
  if (!forms || forms.length < 1) {
    return {
      error: true,
      message: `WebriQ Forms: Site is not registered and/or ${referer}' is not present in its 'siteUrls'. When using multiple forms in a page, make sure to specify the form ID in the form 'data-form-id' attribute. See ${process.env.APP_URL}/docs for more info.`,
      data: initialFormData
    };
  }

  let formNonces = [];
  let siteUrls = [];

  const getTomorrowsDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow;
  };

  // // Create _nonces
  forms.forEach(async form => {
    const currentNonce = generateNonce();
    const tomorrowDate = getTomorrowsDate();

    let data = {
      _id: uuid(),
      _formId: form && form._id,
      token: currentNonce,
      expiresAt: tomorrowDate.getTime() // timestamp
    };

    // Push new _nonces and siteUrls
    try {
      formNonces.push({
        formId: form && form._id,
        nonce: currentNonce
      });

      siteUrls.push(form.siteUrls);
    } catch (err) {
      // unable to push nonce or siteUrls
      return {
        error: true,
        message: "Unable to push nonce or siteUrls!",
        data: []
      };
    }

    const params = {
      TableName: FORMNONCES_TABLE,
      Item: data
    };

    dynamoDb.put(params, error => {
      if (error) {
        console.log(error);
        return {
          error: true,
          message: "Unable to generate nonce for form!",
          data: []
        };
      }

      console.log(`Successfully created nonce: ${currentNonce}`);
    });
  });

  siteUrls = uniq(flatten(siteUrls));

  return {
    error: false,
    message: "Successfully init WebriQ Form requirements",
    data: {
      forms,
      referer,
      formNonces,
      siteUrls
    }
  };
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
