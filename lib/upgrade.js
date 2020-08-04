const { error, stopSpinner } = require("@vue/cli-shared-utils");
const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const { download, tmp } = require("./download");
const { option } = require("commander");

async function upgrade(options) {
  const cwd = options.cwd || process.cwd();
  // todo 监测当前工作目录是否是干净的
  // todo 监测当前工作目录是否包含package.json 以及json中的类型字段是否和选择upgrade的一致

  const packageExist = fs.existsSync("package.json");
  if (!packageExist) {
    error(`Error: The package.json file at ${cwd} does not exist`);
    return;
  }

  if (!(await download("JerryCjr/web-library-template#dev"))) return;

  const { override } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "override",
      message: "which files should be overrided",
      pageSize: 10,
      choices: [
        {
          name: "package (package.json)",
          checked: true,
        },
        {
          name: "ts (tsconfig.json)",
          checked: true,
        },
        {
          name: "webpack config (config/**/*)",
          checked: true,
        },
        {
          name: "public (public/**/*)",
          checked: true,
        },
        {
          name: "karma.conf.js",
          checked: true,
        },
        {
          name: "rc config (.eslintrc.js, .babelrc, .prettierrc.js)",
          checked: true,
        },
        {
          name: "vscode config (.vscode)",
          checked: true,
        },
        {
          name: "ignore config (.gitignore, .npmignore)",
          checked: true,
        },
      ],
    },
  ]);

  function checkOverride(type, override) {
    for (let index = 0; index < override.length; index++) {
      if (override[index].indexOf(type) === 0) return true;
    }
    return false;
  }

  async function upgradePackageJson() {
    const newJsonPath = path.join(tmp, "package.json");
    const oldJsonPath = path.join(cwd, "package.json");

    const newJson = require(newJsonPath);
    const oldJson = require(oldJsonPath);

    const assignValue = Object.assign(oldJson, {
      scripts: newJson.scripts,
      gitHooks: newJson.gitHooks,
      devDependencies: newJson.devDependencies,
      dependencies: newJson.dependencies,
    });

    fs.writeFileSync(oldJsonPath, JSON.stringify(assignValue, null, 2)); // fix: 缩进为两个空格
  }

  async function copyOthers(override) {
    function _resolveTarget(_target) {
      return path.join(tmp, _target);
    }

    function _resolveSource(_source) {
      return path.join(cwd, _source);
    }

    if (option.force || checkOverride("ts", override)) {
      // tsconfig.json
      const key = "tsconfig.json";
      fs.copyFileSync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride("webpack", override)) {
      // config/**/*/
      const key = "config";
      fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (options.force || checkOverride("public", override)) {
      // public/**/*/
      const key = "public";
      fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride("karma", override)) {
      // test/karma.config.js
      const key = "/test/karma.conf.js";
      fs.ensureFileSync(_resolveSource(key));
      fs.copyFileSync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride("rc config", override)) {
      // .eslintrc.js
      // .babelrc
      // .prettierrc.js
      fs.copyFileSync(
        _resolveTarget(".eslintrc.js"),
        _resolveSource(".eslintrc.js")
      );

      fs.copyFileSync(_resolveTarget(".babelrc"), _resolveSource(".babelrc"));

      fs.copyFileSync(
        _resolveTarget(".prettierrc.js"),
        _resolveSource(".prettierrc.js")
      );
    }
    if (options.force || checkOverride("vscode config", override)) {
      // .vscode/**/*/
      const key = ".vscode";
      fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride("ignore config", override)) {
      // .gitignore
      // .npmignore
      fs.copyFileSync(
        _resolveTarget(".gitignore"),
        _resolveSource(".gitignore")
      );

      fs.copyFileSync(
        _resolveTarget(".npmignore"),
        _resolveSource(".npmignore")
      );
    }
  }

  if (options.force || checkOverride("package", override)) {
    await upgradePackageJson();
  }

  await copyOthers(override);
}

module.exports = (...args) => {
  return upgrade(...args).catch((err) => {
    stopSpinner(false); // do not persist
    error(err);
  });
};
