#!/usr/bin/env node

const cliName = "cliv2";

// Check node version before requiring/doing anything else
// The user may be on a very old node version
const { chalk, semver } = require("@vue/cli-shared-utils");
const requiredVersion = require("../package.json").engines.node;

function checkNodeVersion(wanted, id) {
  if (!semver.satisfies(process.version, wanted)) {
    console.log(
      chalk.red(
        "You are using Node " +
          process.version +
          ", but this version of " +
          id +
          " requires Node " +
          wanted +
          ".\nPlease upgrade your Node version"
      )
    );
    process.exit(1);
  }
}

checkNodeVersion(requiredVersion, cliName);

if (semver.satisfies(process.version, "9.x")) {
  console.log(
    chalk.red(
      `You are using Node ${process.version}.\n` +
        `Node.js 9.x has already reached end-of-life and will not be supported in future major releases.\n` +
        `It's stongly recommended to use an active LTS version instead.`
    )
  );
}

const { program } = require("commander");
const minimist = require("minimist");

// * show version and main usage
program
  .name(cliName)
  .version(`${cliName} ${require("../package").version}`) // * version
  .usage("<command> [options]");
// * main
program
  .command("create <app-name>")
  .description("create a new project")
  .option(
    // * git init
    "-g, --git [message]",
    "Force git initialization with initial commit message"
  )
  .option(
    // * no git
    "-n, --no-git",
    "Skip git initialization"
  )
  .option(
    // * force
    "-f, --force",
    "Overwrite target directory if it exists"
  )
  .action((name, cmd) => {
    const options = cleanArgs(cmd);

    if (minimist(process.argv.slice(3))._.length > 1) {
      console.log(
        chalk.yellow(
          "\n Info: You provided more than one argument. The first one will be used as the app's name, the rest are ignored."
        )
      );
    }
    // --git makes commander to default git to true
    if (process.argv.includes("-g") || process.argv.includes("--git")) {
      options.forceGit = true;
    }

    require("../lib/create")(name, options);
  });

program
  .command("info")
  .description("print debugging information about your environment")
  .action((cmd) => {
    console.log(chalk.bold("\nEnvironment Info:"));
    require("envinfo")
      .run(
        {
          System: ["OS", "CPU"],
          Binaries: ["Node", "Yarn", "npm"],
          Browsers: ["Chrome", "Edge", "Firefox", "Safari"],
          npmPackages: "/**/{typescript,*vue*,@vue/*/}",
          // ! 目前还未发布 所以全局包会找不到
          npmGlobalPackages: [cliName],
        },
        {
          showNotFound: true,
          duplicates: true,
          fullTree: true,
        }
      )
      .then(console.log);
  });

program.parse(process.argv);

function camelize(str) {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs(cmd) {
  const args = {};
  cmd.options.forEach((o) => {
    const key = camelize(o.long.replace(/^--/, ""));
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== "function" && typeof cmd[key] !== "undefined") {
      args[key] = cmd[key];
    }
  });
  return args;
}
