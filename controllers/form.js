const flatten = require("lodash.flatten");
const uniq = require("lodash.uniq");
const uuidValidate = require("uuid-validate");
const isEmpty = require("lodash.isempty");
const JavaScriptObfuscator = require("javascript-obfuscator");
var v3VerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

const { IS_OFFLINE } = require("../config/constants");

const { forms } = require("../services/db");

const {
  constructFormData,
  constructFormUpdateData,
  sanitizeForms,
  getValidURLs,
} = require("../helpers");

const initialFormData = {
  referer: null,
  forms: [],
  formNonces: [],
  siteUrls: [],
};

/**
 * GET /forms
 */
exports.getForms = async (req, res) => {
  try {
    const result = await forms.all();

    if (result && result.Items) {
      return res.status(200).json(sanitizeForms(result.Items));
    }

    return res.status(200).json([]);
  } catch (error) {
    console.log("error", error);
    return res
      .status(404)
      .json({ error: "Forms not found!", message: error && error.message });
  }
};

exports.getFormsByURL = async (req, res) => {
  try {
    let formsResult = [];
    formsResult = await forms.getByUrl(req.params.id || req.params.url);

    if (formsResult && formsResult.Items) {
      formsResult = sanitizeForms(formsResult.Items);
    }

    return res.status(200).json(sanitizeForms(formsResult));
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: true,
      message: error && error.message,
    });
  }
};

/**
 * GET /forms/:id
 *
 * Allows fetching form by id or url.
 * Need to stick with :id route parameter because serverless limitation to match parameters
 * so can't rename to something else.
 */
exports.getFormsByIdOrURL = async (req, res) => {
  const isRequestParamValidId = (val) => {
    // regex for valid Mongo ObjectId
    const objectIdRegex = new RegExp("^[0-9a-fA-F]{24}$");

    return uuidValidate(val, 4) || objectIdRegex.test(val);
  };

  if (!isRequestParamValidId(req.params.id)) {
    return this.getFormsByURL(req, res);
  }

  try {
    const result = await forms.getById(req.params.id);
    console.log("result", result);

    if (result && result.Count > 0) {
      return res.json(sanitizeForms(result.Items[0]));
    }

    return res.status(404).json({ error: "Resource not found!" });
  } catch (error) {
    if (error) {
      console.log("error", error);
      return res.status(400).json({ error: "Form error!" });
    }
  }
};

/**
 * POST /forms
 */
exports.postForms = async (req, res) => {
  const data = constructFormData(req.body);

  try {
    const result = await forms.create(data);
  } catch (error) {
    console.log("error", error);
    res.status(400).json({
      error: "Could not create form!",
      message: error && error.message,
    });
    return;
  }

  res.status(201).json(sanitizeForms(data));
};

/**
 * PUT /forms/:id
 */
exports.putUpdateForms = async (req, res) => {
  const originalForm = req.formById;
  const id = req.params.id;

  if (!originalForm) {
    return res.status(400).json({ message: "Form is not found!" });
  }

  if (isEmpty(req.body)) {
    return res
      .status(400)
      .json({ message: "You need to pass data to update form!" });
  }
  const data = constructFormUpdateData(req.body, originalForm);

  console.log("exports.putUpdateForms -> req.body", req.body);
  console.log("exports.putUpdateForms -> originalForm", originalForm);
  console.log("exports.putUpdateForms -> data", data);

  try {
    const result = await forms.update(id, {
      ...data,
      timestamp: originalForm.timestamp, // hash key
    });
    console.log("result", result);

    if (result) {
      res.status(200).json(sanitizeForms({ ...originalForm, ...result }));
    }
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: "Could not update form!",
      message: error && error.message,
    });
  }
};

/**
 * DELETE /forms/:id
 */
exports.deleteFormsById = async (req, res) => {
  const data = req.formById;
  console.log("data", data);
  try {
    const result = await forms.delete(req.params.id, data);

    return res.status(204).json();
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      error: "Could not delete form!",
      message: error && error.message,
    });
  }
};

exports.prepareJSLib = async (req, res, viewFile = "js") => {
  const {
    error,
    message,
    data: { formNonces, siteUrls, forms, referer },
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

  res.render(
    viewFile,
    {
      apiUrl: IS_OFFLINE
        ? "http://localhost:3000/"
        : process.env.WEBRIQ_FORMS_API_URL || "http://forms.webriq.com/",
      formNonces: JSON.stringify(formNonces),
      docsUrl: process.env.WEBRIQ_API_DOCS_URL || process.env.APP_URL + "/docs",
    },
    (err, js) => {
      if (err) {
        console.log("error preparing js", err);
        return res.type(".js").send(`console.error("${err}");`);
      }

      const jsOutput = js.replace("<script>", "").replace("</script>", "");

      // See options at: https://obfuscator.io/ or https://www.npmjs.com/package/javascript-obfuscator
      const jsFile = JavaScriptObfuscator.obfuscate(jsOutput, {
        compact: true,
        controlFlowFlattening: true,
        // deadCodeInjection: true,
        selfDefending: true, // code resilient against formating and variable renaming
        domainLock: getValidURLs(siteUrls), // prevents code executing from domain
        transformObjectKeys: true,
        unicodeEscapeSequence: true,
      });

      res.type("js").send(jsFile.getObfuscatedCode());
      // res.type("js").send(jsOutput);
    }
  );
};

exports.initLib = async (req, res) => {
  let formsData = [];

  let url;
  try {
    url = new URL(req.headers && req.headers.referer);
  } catch (err) {
    return {
      error: true,
      message: "Unauthorized: unrecognized client!",
      data: initialFormData,
    };
  }

  const referer = url && !url.host ? url.href : url.host;
  console.log("referer", referer);

  if (referer) {
    try {
      const result = await forms.getByUrl(referer);

      if (result && result.Items) {
        formsData = result.Items;
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  // console.log("formsData", formsData);
  if (!formsData || formsData.length < 1) {
    return {
      error: true,
      message: `WebriQ Forms: Site is not registered and/or '${referer}' is not present in its 'siteUrls'. When using multiple forms in a page, make sure to specify the form ID in the form 'data-form-id' attribute. See ${process.env.APP_URL}/docs for more info.`,
      data: initialFormData,
    };
  }

  let formNonces = [];
  let siteUrls = [];

  formsData.forEach(async (form) => {
    const currentNonce = generateNonce();

    // Push new _nonces and siteUrls
    try {
      formNonces.push({
        formId: form && form._id,
        nonce: currentNonce,
      });

      siteUrls.push(form.siteUrls);
    } catch (err) {
      console.log("err", err);
      // unable to push nonce or siteUrls
      return {
        error: true,
        message: "Unable to push nonce or siteUrls!",
        data: [],
      };
    }
  });

  siteUrls = uniq(flatten(siteUrls));
  siteUrls = getValidURLs(siteUrls);
  console.log("siteUrls", siteUrls);

  return {
    error: false,
    message: "Successfully init WebriQ Forms requirements",
    data: {
      forms: formsData,
      referer,
      formNonces,
      siteUrls,
    },
  };
};

/**
 * GET /js/initForms
 */
exports.getJSLib = async (req, res) => {
  try {
    return this.prepareJSLib(req, res);
    console.log("lib", lib);
  } catch (error) {
    console.log("error", error);
  }
};

/**
 * GET /js/initReactForms
 */
exports.getReactJSLib = async (req, res) => {
  let lib;
  try {
    lib = await this.prepareJSLib(req, res, "jsReact");
  } catch (error) {
    console.log("error", error);
  }

  return lib;
};

const generateNonce = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

/**
 * POST /siteVerify
 */
exports.siteVerify = async (req, res) => {
  try {
    let body = req.body;

    let result = await fetch(
      v3VerifyUrl + "?secret=" + body.secret + "&response=" + body.token,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    let bodyObj = await result.json();

    return res.status(200).json(bodyObj);
  } catch (err) {
    return res.status(500).json({
      error: "Invalid",
      message: err && err.message,
    });
  }
};
