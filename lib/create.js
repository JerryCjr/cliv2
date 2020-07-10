const fs = require("fs-extra");
const path = require("path");
const validateProjectName = require("validate-npm-package-name");
const { chalk, stopSpinner, error } = require("@vue/cli-shared-utils");
const { exit } = require("process");
const { option } = require("commander");
const inquirer = require("inquirer");

async function create(projectName, options) {
  // TODO: projectName是否存在 不存在的话在当前目录初始化
  // TODO: 初始化之前 判断projectName是否是有效的名称 通过validate-npm-package-name来判断

  if (options.proxy) {
    process.env.HTTP_PROXY = options.proxy;
  }

  const cwd = options.cwd || process.cwd();
  console.log("cwd: ", cwd);
  const inCurrent = projectName === ".";
  console.log("inCurrent: ", inCurrent);
  const name = inCurrent ? path.relative("../", cwd) : projectName;
  console.log("name: ", name);
  const targetDir = path.resolve(cwd, projectName || ".");
  console.log("targetDir: ", targetDir);

  // * 验证是否是有效的项目名称了
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
  console.log("fs.existsSync(targetDir): ", fs.existsSync(targetDir));
  console.log("options.force: ", options.force);
  // * 非merge选项下 验证是否存在目标目录
  if (fs.existsSync(targetDir) && !option.merge) {
    if (options.force) {
      await fs.remove(targetDir);
    } else {
      // ? 不知道是什么意思
      // ? 检查版本是否是最新的 命令行给出提示
      // await clearConsole();
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

  const creator = new creator(name, targetDir, getPromptModules());
  console.log(creator);
}

module.exports = (...args) => {
  return create(...args).catch((err) => {
    stopSpinner(false); // do not persist
    error(err);
  });
};
