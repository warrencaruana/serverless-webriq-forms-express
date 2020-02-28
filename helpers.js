const uuid = require("uuid/v4");

module.exports = function constructFormData(data) {
  const _id = uuid();

  return {
    _id,
    name: data && data.name,
    siteUrls: (data && data.siteUrls) || [],
    testUrls: (data && data.testUrls) || [],
    tags: (data && data.tags) || [],
    formNonces: (data && data.formNonces) || []
  };
};
