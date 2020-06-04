const uuid = require("uuid/v4");
const fs = require("fs");
const { BUCKET, REGION, s3 } = require("../config/constants");

const fileTransport = {
  upload: (file) => {
    const _id = uuid();
    const fileExtension = file.mimetype.split("/").pop();
    const fileName = _id + "." + fileExtension;
    console.log("file", file);

    return s3
      .upload({
        Bucket: BUCKET,
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read",
      })
      .promise()
      .then((result) => {
        console.log("result", result);
        console.log("fileName", fileName);

        return {
          public_id: _id,
          secure_url: result && result.Location,
        };
      });
  },
};

module.exports = fileTransport;
