const { error, stopSpinner } = require('@vue/cli-shared-utils');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { option } = require('commander');
const Metalsmith = require('metalsmith');
const render = require('consolidate').handlebars.render;
const { camelCase } = require('lodash');

const { download } = require('../util/download');
const confirmIfGitDirty = require('../util/confirmIfGitDirty');
const { chooseTemplate } = require('../util/templateManagement');

async function upgrade(options) {
  const cwd = options.cwd || process.cwd();

  if (!(await confirmIfGitDirty(cwd))) {
    return;
  }

  const packageExist = fs.existsSync('package.json');
  if (!packageExist) {
    error(`Error: The package.json file at ${cwd} does not exist`);
    return;
  }

  const { repository, localSystemTemplatePath: tmp } = await chooseTemplate();
  if (!(await download(repository, tmp, options.clone))) return;

  const { override } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'override',
      message: 'which files should be overrided',
      pageSize: 10,
      choices: [
        {
          name: 'package (package.json)',
          checked: true,
        },
        {
          name: 'ts (tsconfig.json)',
          checked: true,
        },
        {
          name: 'webpack config (config/**/*)',
          checked: true,
        },
        {
          name: 'public (public/**/*)',
          checked: true,
        },
        {
          name: 'karma.conf.js',
          checked: true,
        },
        {
          name: 'rc config (.eslintrc.js, .babelrc, .prettierrc.js)',
          checked: true,
        },
        {
          name: 'vscode config (.vscode)',
          checked: true,
        },
        {
          name: 'ignore config (.gitignore, .npmignore)',
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
    const newJsonPath = path.join(tmp, 'package.json');
    const oldJsonPath = path.join(cwd, 'package.json');

    const newJson = require(newJsonPath);
    const oldJson = require(oldJsonPath);

    const assignValue = Object.assign(oldJson, {
      scripts: newJson.scripts,
      gitHooks: newJson.gitHooks,
      'lint-staged': newJson['lint-staged'],
      devDependencies: newJson.devDependencies,
      // dependencies: newJson.dependencies, // 不更新生产依赖,防止覆盖
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

    if (option.force || checkOverride('ts', override)) {
      // tsconfig.json
      const key = 'tsconfig.json';
      fs.copyFileSync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride('webpack', override)) {
      // config/**/*/
      const key = 'config';
      const name = require(_resolveSource('package.json')).name.replace(/@babyfs\//, '');
      const library = camelCase(name);
      function template(files, metalsmith, done) {
        var keys = Object.keys(files);
        const metadata = metalsmith.metadata();

        keys.map((file) => {
          const str = files[file].contents.toString();
          render(str, metadata, function (err, res) {
            if (err) return done(err);
            files[file].contents = Buffer.from(res);
            done();
          });
        });
      }

      Metalsmith(_resolveTarget(key))
        .metadata({
          library,
        })
        .source('.')
        .use(template)
        .destination(_resolveSource(key))
        .clean(false)
        .build(function (err, files) {
          if (err) {
            throw err;
          }
        });

      // fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (options.force || checkOverride('public', override)) {
      // public/**/*/
      const key = 'public';
      fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride('karma', override)) {
      // test/karma.config.js
      const key = '/test/karma.conf.js';
      fs.ensureFileSync(_resolveSource(key));
      fs.copyFileSync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride('rc config', override)) {
      // .eslintrc.js
      // .babelrc
      // .prettierrc.js
      fs.copyFileSync(_resolveTarget('.eslintrc.js'), _resolveSource('.eslintrc.js'));

      fs.copyFileSync(_resolveTarget('.babelrc'), _resolveSource('.babelrc'));

      fs.copyFileSync(_resolveTarget('.prettierrc.js'), _resolveSource('.prettierrc.js'));
    }
    if (options.force || checkOverride('vscode config', override)) {
      // .vscode/**/*/
      const key = '.vscode';
      fs.copySync(_resolveTarget(key), _resolveSource(key));
    }

    if (option.force || checkOverride('ignore config', override)) {
      // .gitignore
      // .npmignore
      fs.copyFileSync(_resolveTarget('.gitignore'), _resolveSource('.gitignore'));

      fs.copyFileSync(_resolveTarget('.npmignore'), _resolveSource('.npmignore'));
    }
  }

  if (options.force || checkOverride('package', override)) {
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
