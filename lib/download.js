const download = require('download-git-repo');
const fs = require('fs-extra');
const { stopSpinner, error, logWithSpinner } = require('@vue/cli-shared-utils');

/**
 *
 * @param {String} repository 远程仓库
 * @param {String} localSystemTemplatePath 模板在本地操作系统的路径
 * @param {String} clone 是否使用clone下载
 */
function _download(repository, localSystemTemplatePath, clone = false) {
  return new Promise((resolve, reject) => {
    logWithSpinner('downloading remote template');

    // Remove if local template exists
    if (fs.existsSync(localSystemTemplatePath)) {
      fs.remove(localSystemTemplatePath);
    }

    download(repository, localSystemTemplatePath, { clone }, (err) => {
      stopSpinner();
      if (err) {
        error('Failed to download repo ' + repository + ': ' + err.message.trim());

        reject(err);
      } else {
        resolve('download template success');
      }
    });
  });
}

module.exports = {
  download: (...args) => {
    return _download(...args).catch((err) => {
      stopSpinner(false); // do not persist
      error(err);
    });
  },
};
