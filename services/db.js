const uuidValidate = require("uuid-validate");
const omit = require("lodash.omit");
const {
  WEBRIQ_FORMS_TABLE,
  FORMS_TABLE,
  FORM_SUBMISSIONS_TABLE,
  FORMNONCES_TABLE,
  IS_OFFLINE,
  dynamoDb,
} = require("../config/constants");

const attachFormKeys = (data) => {
  return {
    _type: "FORM",
    _timestamp: new Date().getTime() / 1000,
    ...data,
  };
};

const forms = {
  all() {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "_type",
      },
      ExpressionAttributeValues: {
        ":type": "FORM",
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  getById(id) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      FilterExpression: "#id = :id",
      ExpressionAttributeNames: {
        "#type": "_type",
        "#id": "_id",
      },
      ExpressionAttributeValues: {
        ":type": "FORM",
        ":id": id,
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  getByUrl(url) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      FilterExpression: "contains (#siteUrls, :siteUrls)",
      ExpressionAttributeNames: {
        "#type": "_type",
        "#siteUrls": "siteUrls",
      },
      ExpressionAttributeValues: {
        ":type": "FORM",
        ":siteUrls": url,
      },
    };

    return dynamoDb.query(params).promise();
  },

  create(data) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Item: data,
    };

    return new Promise((resolve, reject) => {
      dynamoDb.put(params, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(data);
      });
    });
  },

  update(id, data) {
    let UpdateExpressionList = [];
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};

    const skipImmutables = (data) => {
      const ignoreList = [
        "id",
        "_id",
        "timestamp",
        "_timestamp",
        "type",
        "_type",
        "createdAt",
        "updatedAt",
      ];
      return omit(data, ignoreList);
    };

    const formData = Object.entries(skipImmutables(data));

    formData.forEach(([key, value]) => {
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = value;
      UpdateExpressionList.push(`#${key} = :${key}`);
    });

    // Update updatedAt
    ExpressionAttributeNames["#updatedAt"] = "updatedAt";
    ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
    UpdateExpressionList.push("#updatedAt = :updatedAt");

    // Expression attribute for id for _id & _type
    ExpressionAttributeNames["#id"] = "_id";
    ExpressionAttributeValues[":id"] = id;

    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Key: {
        _type: "FORM",
        _timestamp: data._timestamp,
      },
      ConditionExpression: "#id = :id",
      UpdateExpression: "SET " + UpdateExpressionList.join(","),
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "UPDATED_NEW",
    };

    return new Promise((resolve, reject) => {
      dynamoDb.update(params, (error, data) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(data && data.Attributes);
      });
    });
  },

  delete(id, data) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Key: {
        _type: "FORM",
        _timestamp: data._timestamp,
      },
    };

    return dynamoDb.delete(params).promise();
  },
};

const submissions = {
  all() {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "_type",
      },
      ExpressionAttributeValues: {
        ":type": "SUBMISSION",
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  getByFormId(formId) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      FilterExpression: "#form = :form",
      ExpressionAttributeNames: {
        "#type": "_type",
        "#form": "_form",
      },
      ExpressionAttributeValues: {
        ":type": "SUBMISSION",
        ":form": formId,
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  getByFormIdAndId(formId, id) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      FilterExpression: "#id = :id AND #form = :form",
      ExpressionAttributeNames: {
        "#type": "_type",
        "#form": "_form",
        "#id": "_id",
      },
      ExpressionAttributeValues: {
        ":type": "SUBMISSION",
        ":form": formId,
        ":id": id,
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  create(data) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Item: data,
    };

    return new Promise((resolve, reject) => {
      dynamoDb.put(params, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(data);
      });
    });
  },

  deleteByFormIdAndId(formId, id, data) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Key: {
        _type: "SUBMISSION",
        _timestamp: data._timestamp,
      },
      ConditionExpression: "#id = :id AND #form = :form",
      ExpressionAttributeNames: {
        "#form": "_form",
        "#id": "_id",
      },
      ExpressionAttributeValues: {
        ":form": formId,
        ":id": id,
      },
    };

    return dynamoDb.delete(params).promise();
  },
};

const nonces = {};

module.exports = {
  forms,
  submissions,
  nonces,
};
