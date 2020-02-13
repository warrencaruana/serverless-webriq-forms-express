const uuid = require("uuid/v4");

module.exports = function constructFormData(data) {
  return {
    id: uuid(),
    name: data && data.name,
    siteUrls: data && data.siteUrls,
    testUrls: data && data.testUrls,
    tags: data && data.tags
  };
};
