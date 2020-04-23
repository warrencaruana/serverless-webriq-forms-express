const { forms, submissions, nonces } = require("../services/db");
const { removeSiteProtocols } = require("../helpers");

exports.checkBodyIsNotEmpty = async (req, res, next) => {
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      message: "Validation Failed",
      errors: [
        {
          msg: "Form body must not be empty",
        },
      ],
    });
  }

  next();
};

exports.checkNonceIsValid = async (req, res, next) => {
  const origin = req.get("origin");
  const referer = req.get("referer");

  const { _nonce } = req.body;

  if (!_nonce) {
    return res.status(400).json({
      message: "Invalid form submission request. Security feature not met!",
    });
  }

  let nonceItem = null;

  try {
    nonceItem = await nonces.getByToken(_nonce);
  } catch (err) {
    console.log("err", err);
    return res.status(500).json({
      message: "Something went validating security feature!",
    });
  }
  console.log("nonceItem", nonceItem);

  if (
    !nonceItem ||
    !nonceItem.Items ||
    (nonceItem.Items && nonceItem.Items.length !== 1)
  ) {
    return res.status(403).json({
      message:
        "Unauthorized to perform form submission because security feature is invalid or not found!",
    });
  }

  const hasNonceExpired = (expiryDate) => {
    const nowEpochDate = Math.round(new Date() / 1000);

    return nowEpochDate > expiryDate;
  };

  if (hasNonceExpired(nonceItem.Items[0].expiresAt)) {
    return res.status(400).json({
      message: "Security feature has expired. Please try again!",
    });
  }

  // Save nonce
  req.nonceById = nonceItem.Items[0];

  next();
};

exports.checkSubmissionIdIsValid = async (req, res, next) => {
  const submissionById = await submissions.getByFormIdAndId(
    req.params.formId,
    req.params.id
  );
  // console.log("submissionById", submissionById);

  if (!submissionById || !submissionById.Items) {
    res.status(404).json({
      message: "Form resource not found by ID!",
    });
    return;
  }

  // If found, attach submissionById for use later
  req.submissionById = submissionById.Items[0];

  next();
};

exports.checkFormIdIsValid = async (req, res, next) => {
  // console.log(
  //   "req.params.formId || req.params.id",
  //   req.params.formId || req.params.id
  // );
  const formById = await forms.getById(req.params.formId || req.params.id);
  // console.log("formById", formById);

  if (!formById || !formById.Items) {
    res.status(404).json({
      message: "Form resource not found by ID!",
    });
    return;
  }

  // If found, attach formById for use later
  req.formById = formById.Items[0];

  next();
};

exports.checkSiteReferrerIsValid = (req, res, next) => {
  const origin = req.get("origin");
  const referer = req.get("referer");
  const form = req.formById;
  console.log("[LOG] siteUrls: " + removeSiteProtocols(form.siteUrls));
  console.log(
    "[LOG] referer || origin: " + removeSiteProtocols(origin || referer)
  );
  if (
    form &&
    !removeSiteProtocols(form.siteUrls).includes(
      removeSiteProtocols(origin || referer)
    )
  ) {
    return res.status(403).json({
      message:
        "Unauthorized to perform form submission because host/origin is not allowed for this resource!",
    });
  }

  next();
};
