const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb
} = require("../config/constants");

/**
 * GET /formnonces
 */
exports.getNonces = (req, res) => {
  dynamoDb.scan(
    {
      TableName: FORMNONCES_TABLE
    },
    (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: "Forms not found!" });
      }

      if (result) {
        res.json(result.Items);
      } else {
        res.status(404).json({ error: "Forms not found!" });
      }
    }
  );
};
