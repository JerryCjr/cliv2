#!/usr/bin/env node

// Check node version before requiring/doing anything else
// The user may be on a very old node version
const { chalk, semver } = require("@vue/cli-shared-utils");
const requiredVersion = require("../package.json").engines.node;
const leven = require("leven");

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

checkNodeVersion(requiredVersion, "gemini");

if (semver.satisfies(process.version, "9.x")) {
  console.log(
    chalk.red(
      `You are using Node ${process.version}.\n` +
        `Node.js 9.x has already reached end-of-life and will not be supported in future major releases.\n` +
        `It's stongly recommended to use an active LTS version instead.`
    )
  );
}

const { program, command } = require("commander");
const minimist = require("minimist");

// * show version and main usage
program
  .name("gemini")
  .version(`@babyfs/gemini ${require("../package").version}`) // * version
  .usage("<command> [options]");
// * main
program
  .command("create <app-name>")
  .description("create a new project powered by gemini-cli-service")
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

    console.log(options);
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
          npmGlobalPackages: ["gemini"],
        },
        {
          showNotFound: true,
          duplicates: true,
          fullTree: true,
        }
      )
      .then(console.log);
  });

//output help information for unkown command

// output help information on unknown commands
program.arguments("<command>").action((cmd) => {
  program.outputHelp();
  console.log(`  ` + chalk.red(`Unknown command ${chalk.yellow(cmd)}.`));
  console.log();
  suggestCommands(cmd);
});

// add some useful info on help
program.on("--help", () => {
  console.log();
  console.log(
    `  Run ${chalk.cyan(
      `gemini <command> --help`
    )} for detailed usage of given command.`
  );
  console.log();
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

function suggestCommands(unknownCommand) {
  const availableCommands = program.commands.map((cmd) => cmd._name);

  let suggestion;

  availableCommands.forEach((cmd) => {
    const isBestMatch =
      leven(cmd, unknownCommand) < leven(suggestion || "", unknownCommand);
    if (leven(cmd, unknownCommand) < 3 && isBestMatch) {
      suggestion = cmd;
    }
  });

  if (suggestion) {
    console.log(`  ` + chalk.red(`Did you mean ${chalk.yellow(suggestion)}?`));
  }
}

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
