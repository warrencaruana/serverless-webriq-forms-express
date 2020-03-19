const { validationResult } = require("express-validator");
const flatten = require("lodash.flatten");
const uniq = require("lodash.uniq");
const uuid = require("uuid/v4");
const get = require("lodash.get");
const uuidValidate = require("uuid-validate");
const JavaScriptObfuscator = require("javascript-obfuscator");

const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb
} = require("../config/constants");

const { forms, submissions, nonces } = require("../services/db");

const { constructFormData, sanitizeForms } = require("../helpers");

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
exports.getForms = async (req, res) => {
  let result;

  try {
    result = await forms.all();

    res.json(result.Items.map(form => sanitizeForms(form)));
  } catch (error) {
    console.log("error", error);
    res.status(404).json({ error: "Forms not found!" });
  }

  // dynamoDb.scan(params, (error, result) => {
  //   if (error) {
  //     console.log(error);
  //     res.status(400).json({ error: "Forms not found!" });
  //   }

  //   if (result) {
  //     res.json(result.Items.map(form => sanitizeForms(form)));
  //   } else {

  //   }
  // });
};

exports.getFormsByURL = async (req, res) => {
  let formsResult = [];

  try {
    formsResult = await forms.getByUrl(req.params.id || req.params.url);

    if (formsResult && formsResult.Items) {
      formsResult = formsResult.Items.map(form => sanitizeForms(form));
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: true,
      message: `Internal error retrieving forms data!`,
      data: null
    });
  }

  // const formsData = forms.map(form => ({
  //   id: form._id,
  //   name: form.name,
  //   recaptcha: {
  //     key: get(form, "recaptcha.key", null)
  //   }
  // }));

  return res.status(200).json(sanitizeForms(formsResult));
};

/**
 * GET /forms/:id
 *
 * Allows fetching form by id or url.
 * Need to stick with :id route parameter because serverless limitation to match parameters
 * so can't rename to something else.
 */
exports.getFormsByIdOrURL = async (req, res) => {
  const resultForms = [];
  const isParamsUuid = val => uuidValidate(val, 4);

  // If passed parameter is URL, handle separately
  if (!isParamsUuid()) {
    this.getFormsByURL(req, res);
    return;
  }

  try {
    resultForms = await forms.getById(req.params.id);

    if (resultForms) {
      res.json(resultForms.Item.map(form => sanitizeForms(form)));
    } else {
      res.status(404).json({ error: "Resource not found!" });
    }
  } catch (error) {
    if (error) {
      console.log(error);
      res.status(400).json({ error: "Form error!" });
    }
  }
};

/**
 * POST /forms
 */
exports.postForms = async (req, res) => {
  const data = constructFormData(req.body);
  console.log("data", JSON.stringify(data, null, 2));

  try {
    const result = await forms.create(data);
  } catch (error) {
    console.log("error", error);
    res.status(400).json({ error: "Could not create form!" });
    return;
  }

  res.status(201).json(sanitizeForms(data));
};

/**
 * PUT /forms/:id
 *
 * @todo: Update other fields
 */
exports.putUpdateForms = (req, res) => {
  console.info("req.formById", req.formById);

  // const { name, siteUrls, testUrls } = req.body;

  let UpdateExpressionList = [];
  let ExpressionAttributeNames = {};
  let ExpressionAttributeValues = {};
  // if (name) {
  //   ExpressionAttributeNames["#name"] = "name";
  //   ExpressionAttributeValues[":n"] = name;
  //   UpdateExpressionList.push("#name = :n");
  // }

  Object.entries(req.body).forEach(([key, value]) => {
    const isImmutableKey = value => {
      return ["id", "_id"].includes(value);
    };

    if (isImmutableKey(key)) {
      return; // skip
    }

    ExpressionAttributeNames[`#${key}`] = key;
    ExpressionAttributeValues[`:${key}`] = value;
    UpdateExpressionList.push(`#${key} = :${key}`);
  });

  // Update updatedAt
  ExpressionAttributeNames["#updatedAt"] = "updatedAt";
  ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
  UpdateExpressionList.push("#updatedAt = :updatedAt");

  // console.log(
  //   "UpdateExpressionList",
  //   JSON.stringify(UpdateExpressionList, null, 2)
  // );
  // console.log(
  //   "ExpressionAttributeNames",
  //   JSON.stringify(ExpressionAttributeNames, null, 2)
  // );
  // console.log(
  //   "ExpressionAttributeValues",
  //   JSON.stringify(ExpressionAttributeValues, null, 2)
  // );

  try {
    const result = await forms.update(id, data)

    if (result) {
      res.status(200).json(sanitizeForms(data));
    }
  } catch(error) {
    console.log("error", error);
    res.status(400).json({ error: "Could not create form!" });
    return;
  }

  // const params = {
  //   TableName: FORMS_TABLE,
  //   Key: {
  //     _id: req.params.id
  //   },
  //   UpdateExpression: "SET " + UpdateExpressionList.join(","),
  //   ExpressionAttributeNames,
  //   ExpressionAttributeValues,
  //   ReturnValues: "UPDATED_NEW"
  // };

  // dynamoDb.update(params, (error, data) => {
  //   if (error) {
  //     console.log(error);
  //     res.status(400).json({ error: "Could not create form!" });
  //   }

  //   res.status(200).json(sanitizeForms(data));
  // });
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

exports.prepareJSLib = async (req, res, viewFile = "js") => {
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
    viewFile,
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

/**
 * GET /js/initForms
 */
exports.getJSLib = async (req, res) => {
  return this.prepareJSLib(req, res);
};

/**
 * GET /js/initReactForms
 */
exports.getReactJSLib = async (req, res) => {
  return this.prepareJSLib(req, res, "jsReact");
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
