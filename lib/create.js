const fs = require("fs-extra");
const path = require("path");
const validateProjectName = require("validate-npm-package-name");
const {
  chalk,
  error,

  logWithSpinner,
  stopSpinner,
} = require("@vue/cli-shared-utils");
const { exit } = require("process");
const { option } = require("commander");
const inquirer = require("inquirer");

const download = require("download-git-repo");
const home = require("user-home");
const tmp = path.join(home, ".babyfs-templates-v2");

async function create(projectName, options) {
  const cwd = options.cwd || process.cwd();
  const inCurrent = projectName === ".";
  const name = inCurrent ? path.relative("../", cwd) : projectName;
  const targetDir = path.resolve(cwd, projectName || ".");

  const result = validateProjectName(name);
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: "${name}"`));
    result.errors &&
      result.errors.forEach((err) => {
        console.error(chalk.red.dim("Error: " + err));
      });

    result.warnings &&
      result.warnings.forEach((warn) => {
        console.error(chalk.red.dim("Warning: " + warn));
      });

    exit(1);
  }

  if (fs.existsSync(targetDir) && !option.merge) {
    if (options.force) {
      await fs.remove(targetDir);
    } else {
      if (inCurrent) {
        const { ok } = await inquirer.prompt([
          {
            name: "ok",
            type: "confirm",
            message: "Generate project in current directory?",
          },
        ]);
        if (!ok) {
          return;
        }
      } else {
        const { action } = await inquirer.prompt([
          {
            name: "action",
            type: "list",
            message: `Target directory ${chalk.cyan(
              targetDir
            )} already exists. Pick an action:`,
            choices: [
              { name: "Overwrite", value: "overwrite" },
              { name: "Merge", value: "merge" },
              { name: "Cancel", value: false },
            ],
          },
        ]);
        if (!action) {
          return;
        } else if (action === "overwrite") {
          console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
          await fs.remove(targetDir);
        }
      }
    }
  }

  // todo 开始初始化 prompt 输入一些项目必须的配置
  // * packagejson name
  // * packagejson description
  // * packagejson git url
  // * packagejson author
  // * packagejson keywords
  // * 或者粗暴一点 直接类似vue 用default 不需要用户选择什么 直接初始化就行
  downloadAndGenerate("JerryCjr/web-library-template");
}

/**
 * Download a generate from a template repo.
 *
 * @param {String} template
 */

function downloadAndGenerate(template) {
  logWithSpinner("downloading remote template");
  // Remove if local template exists
  if (fs.existsSync(tmp)) {
    fs.remove(tmp);
  }
  download(template, tmp, { clone: true }, (err) => {
    stopSpinner();
    if (err)
      error("Failed to download repo " + template + ": " + err.message.trim());

    console.log(template);
    // generate(name, tmp, to, (err) => {
    //   if (err) error(err);
    //   console.log();
    //   logger.success('Generated "%s".', name);
    // });
  });
}

module.exports = (...args) => {
  return create(...args).catch((err) => {
    stopSpinner(false); // do not persist
    error(err);
  });
};
