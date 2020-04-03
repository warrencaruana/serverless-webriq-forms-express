const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileTransport = {
  upload: (file) => {
    return cloudinary.v2.uploader.upload(
      file,
      { use_filename: true, resource_type: "raw" },
      (err, res) => {
        if (err) {
          console.log(err);
        }
      }
    );
  },

  delete: (file) => {
    return cloudinary.v2.uploader.destroy(file, (err, res) => {
      if (err) {
        console.log(err);
      }
    });
  },

  deleteMultiple: (file) => {
    return cloudinary.v2.api.delete_resources(file, (err, res) => {
      if (err) {
        console.log(err);
      }
    });
  },
};

module.exports = fileTransport;
