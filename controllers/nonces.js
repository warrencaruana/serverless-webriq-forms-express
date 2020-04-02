const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb,
} = require("../config/constants");

const { nonces } = require("../services/db");

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
