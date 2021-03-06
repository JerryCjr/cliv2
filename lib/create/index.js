const fs = require('fs-extra');
const path = require('path');
const validateProjectName = require('validate-npm-package-name');
const {
  chalk,
  done,
  error,
  log,
  stopSpinner,

  execa,
} = require('@vue/cli-shared-utils');
const { exit } = require('process');
const { option } = require('commander');
const inquirer = require('inquirer');

const { download } = require('../util/download');
const generate = require('./generate');
const { shouldInitGit } = require('../util/shouldInitGit');
const { chooseTemplate } = require('../util/templateManagement');

async function create(projectName, options) {
  const cwd = options.cwd || process.cwd();
  const inCurrent = projectName === '.';
  const name = inCurrent ? path.relative('../', cwd) : projectName;
  const targetDir = path.resolve(cwd, projectName || '.');

  const result = validateProjectName(name);
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: "${name}"`));
    result.errors &&
      result.errors.forEach((err) => {
        console.error(chalk.red.dim('Error: ' + err));
      });

    result.warnings &&
      result.warnings.forEach((warn) => {
        console.error(chalk.red.dim('Warning: ' + warn));
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
            name: 'ok',
            type: 'confirm',
            message: 'Generate project in current directory?',
          },
        ]);
        if (!ok) {
          return;
        }
      } else {
        const { action } = await inquirer.prompt([
          {
            name: 'action',
            type: 'list',
            message: `Target directory ${chalk.cyan(targetDir)} already exists. Pick an action:`,
            choices: [
              { name: 'Overwrite', value: 'overwrite' },
              { name: 'Merge', value: 'merge' },
              { name: 'Cancel', value: false },
            ],
          },
        ]);
        if (!action) {
          return;
        } else if (action === 'overwrite') {
          console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
          await fs.remove(targetDir);
        }
      }
    }
  }

  const { repository, localSystemTemplatePath: tmp } = await chooseTemplate();
  if (!(await download(repository, tmp, options.clone))) return;

  function run(command, args) {
    if (!args) {
      [command, ...args] = command.split(/\s+/);
    }
    return execa(command, args, { cwd: targetDir });
  }

  generate(name, tmp, targetDir, async (err) => {
    if (err) error(err);
    console.log();
    done(name, 'Generated');

    // initialize git repository
    const shouldInitGitFlag = shouldInitGit(options, targetDir);

    if (shouldInitGitFlag) {
      log(`🗃  Initializing git repository...`);
      await run('git init');
    }
  });
}

module.exports = (...args) => {
  return create(...args).catch((err) => {
    stopSpinner(false); // do not persist
    error(err);
  });
};
