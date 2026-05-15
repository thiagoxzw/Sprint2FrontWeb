const fs = require("fs");
const os = require("os");
const path = require("path");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveRuntimeRoot() {
  if (process.env.JOVI_DATA_DIR) {
    return process.env.JOVI_DATA_DIR;
  }

  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "JOVI", "modo-aula-app");
  }

  if (process.env.XDG_DATA_HOME) {
    return path.join(process.env.XDG_DATA_HOME, "jovi-modo-aula-app");
  }

  return path.join(os.homedir(), ".jovi-modo-aula-app");
}

const runtimeRoot = resolveRuntimeRoot();
const dataDir = ensureDir(path.join(runtimeRoot, "data"));
const uploadsDir = ensureDir(path.join(runtimeRoot, "uploads"));

function getUploadDir(type) {
  return ensureDir(path.join(uploadsDir, type));
}

function uploadUrlToFilePath(assetUrl) {
  const prefix = "/uploads/";
  if (!assetUrl || !assetUrl.startsWith(prefix)) {
    return null;
  }

  const relativeParts = assetUrl.slice(prefix.length).split("/").filter(Boolean);
  return path.join(uploadsDir, ...relativeParts);
}

module.exports = {
  dataDir,
  uploadsDir,
  getUploadDir,
  uploadUrlToFilePath
};
