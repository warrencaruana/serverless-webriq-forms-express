const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb,
} = require("../config/constants");

const { nonces } = require("../services/db");

const { constructNonceData } = require("../helpers");

/**
 * GET /formnonces
 */
exports.getNonces = async (req, res) => {
  try {
    const result = await nonces.all();

    if (result && result.Items) {
      return res.json(result.Items);
    }

    return res.json([]);
  } catch (error) {
    console.log("error", error);
    return res
      .status(404)
      .json({ error: "Nonces not found!", message: error && error.message });
  }
};

exports.createNonce = async (req, res) => {
  const generateNonce = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const currentNonce = generateNonce();

  let data = constructNonceData({
    token: currentNonce,
    _form: 1,
  });

  try {
    const createNonce = await nonces.create(data);
    console.log("createNonce", createNonce);

    console.log(`Successfully created nonce: ${currentNonce}`);

    return res.json(createNonce);
  } catch (error) {
    console.log(error);
    return {
      error: true,
      message: "Unable to generate nonce for form!",
      data: [],
    };
  }
};

exports.deleteNonce = async (req, res) => {
  console.log("req.nonceById", req.nonceById);
  try {
    await nonces.delete(req.params.id, req.nonceById);

    res.json({ message: "Successfully deleted nonce" });
  } catch (err) {
    console.log("error", error);
    res.status(500).json({ message: "Unable to delete nonce" });
  }
};
