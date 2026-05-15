const multer = require("multer");
const { getUploadDir } = require("../runtime-paths");

function createUploader(type) {
  const dir = getUploadDir(type);

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, dir);
    },
    filename: function (_req, file, cb) {
      const safeBase = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, Date.now() + "-" + safeBase);
    }
  });

  return multer({ storage });
}

module.exports = {
  imageUpload: createUploader("images"),
  audioUpload: createUploader("audio")
};
