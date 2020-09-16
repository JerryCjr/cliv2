const { hasGit, hasProjectGit } = require('@vue/cli-shared-utils');
const { option } = require('commander');

module.exports = {
  shouldInitGit: (options, targetDir) => {
    if (!hasGit()) {
      return false;
    }

    // --git
    if (options.forceGit) {
      return true;
    }

    // --no-git
    if (options.git === false || option.git === 'false') {
      return false;
    }

    // default: true unless already in a git repo
    return !hasProjectGit(targetDir);
  },
};
