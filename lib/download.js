const download = require("download-git-repo");
const fs = require("fs-extra");
const path = require("path");
const home = require("user-home");
const { stopSpinner, error, logWithSpinner } = require("@vue/cli-shared-utils");

const tmp = path.join(home, ".babyfs-templates-v2");

function _download(template) {
  return new Promise((resolve, reject) => {
    logWithSpinner("downloading remote template");
    // Remove if local template exists
    if (fs.existsSync(tmp)) {
      fs.remove(tmp);
    }

    download(template, tmp, { clone: false }, (err) => {
      // todo: 是否选择clone
      stopSpinner();
      if (err) {
        error(
          "Failed to download repo " + template + ": " + err.message.trim()
        );

        reject(err);
      } else {
        resolve("download template success");
      }
    });
  });
}

module.exports = {
  tmp,
  download: (...args) => {
    return _download(...args).catch((err) => {
      stopSpinner(false); // do not persist
      error(err);
    });
  },
};
