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

  deleteByFormId(formId) {
    return new Promise(async (resolve, reject) => {
      let submissions = [];
      try {
        submissions = await this.getByFormId(formId);
      } catch (err) {
        reject(err);
      }

      const itemsForDeletion = submissions.Items.map((submission) => {
        return {
          DeleteRequest: {
            Key: {
              _type: submission._type,
              _timestamp: submission._timestamp,
            },
          },
        };
      });

      const chunk = (arr, size) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
          arr.slice(i * size, i * size + size)
        );

      // batchWrite can only process 25 items of 1MB data
      const submissionsOperation = chunk(itemsForDeletion, 25).map(
        (submissions) => {
          const params = {
            RequestItems: {
              [WEBRIQ_FORMS_TABLE]: submissions,
            },
          };

          try {
            return dynamoDb.batchWrite(params).promise();
          } catch (error) {
            console.log("error", error);
            reject(err);
          }
        }
      );

      Promise.all(submissionsOperation).then((result) => resolve(result));
    });
  },
};

const nonces = {
  all() {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "_type",
      },
      ExpressionAttributeValues: {
        ":type": "NONCE",
      },
      ScanIndexForward: false,
    };

    return dynamoDb.query(params).promise();
  },

  getByToken(token) {
    console.log("here");
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      KeyConditionExpression: "#type = :type",
      FilterExpression: "#token = :token",
      ExpressionAttributeNames: {
        "#type": "_type",
        "#token": "token",
      },
      ExpressionAttributeValues: {
        ":type": "NONCE",
        ":token": token,
      },
    };
    console.log("params", params);

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

  delete(id, data) {
    const params = {
      TableName: WEBRIQ_FORMS_TABLE,
      Key: {
        _type: "NONCE",
        _timestamp: data._timestamp,
      },
      ConditionExpression: "#id = :id",
      ExpressionAttributeNames: {
        "#id": "_id",
      },
      ExpressionAttributeValues: {
        ":id": id,
      },
    };
    console.log("params", params);

    return dynamoDb.delete(params).promise();
  },
};

module.exports = {
  forms,
  submissions,
  nonces,
};
