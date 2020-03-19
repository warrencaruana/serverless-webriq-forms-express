const uuidValidate = require("uuid-validate");
const {
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb
} = require("../config/constants");

const forms = {
  all() {
    const params = {
      TableName: FORMS_TABLE
    };

    return dynamoDb.scan(params).promise();
  },

  getById(id) {
    const params = {
      TableName: FORMS_TABLE,
      Key: {
        _id: id
      }
    };

    return dynamoDb.get(params).promise();
  },

  getByUrl(url) {
    const params = {
      TableName: FORMS_TABLE,
      FilterExpression: "contains (siteUrls, :siteUrls)",
      ExpressionAttributeValues: {
        ":siteUrls": url
      }
    };

    return dynamoDb.scan(params).promise();
  },

  create(data) {
    const params = {
      TableName: FORMS_TABLE,
      Item: data
    };

    return new Promise((resolve, reject) => {
      dynamoDb.put(params, (error, data) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(data);
      });
    });
  },

  update({ id, data }) {
    let UpdateExpressionList = [];
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};

    Object.entries(data).forEach(([key, value]) => {
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

    const params = {
      TableName: FORMS_TABLE,
      Key: {
        _id: id
      },
      UpdateExpression: "SET " + UpdateExpressionList.join(","),
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "UPDATED_NEW"
    };

    return new Promise((resolve, reject) => {
      dynamoDb.update(params, (error, data) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(data);
      });
    });
  }
};

const submissions = {};

const nonces = {};

module.exports = {
  forms,
  submissions,
  nonces
};
