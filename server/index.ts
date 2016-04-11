/// <reference path="index.d.ts" />

import * as yargs from "yargs";
import { dataPath } from "./commands/utils";

// Command line interface
const argv = yargs
  .usage("Usage: $0 <command> [options]")
  .demand(1, "Enter a command")
  .describe("data-path", "Path to store/read data files from, including config and projects")
  .command("start", "Start the server", (yargs) => {
    yargs.demand(1, 1, `The "start" command doesn't accept any arguments`).argv;
  })
  .command("list", "List currently installed systems and plugins", (yargs) => {
    yargs.demand(1, 1, `The "list" command doesn't accept any arguments`).argv;
  })
  .command("registry", "List registry content", (yargs) => {
    yargs.demand(1, 1, `The "registry" command doesn't accept any arguments`).argv;
  })
  .command("install", "Install a system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "install" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("uninstall", "Uninstall a system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "uninstall" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("update", "Update the server, a system or a plugin", (yargs) => {
    yargs.demand(2, 2, `The "update" command requires a single argument: server, "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("init", "Generate a skeleton for a new system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "init" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .help("h").alias("h", "help")
  .argv;

const command = argv._[0];
const [ systemId, pluginFullName ] = argv._[1] != null ? argv._[1].split(":") : [ null, null ];
switch (command) {
  /* tslint:disable */
  case "start": require("./commands/start").default(dataPath); break;
  case "list": require("./commands/list").default(); break;
  case "registry": require("./commands/registry").default(); break;
  case "install": require("./commands/install").default(systemId, pluginFullName); break;
  case "uninstall": require("./commands/uninstall").default(systemId, pluginFullName); break;
  case "update": require("./commands/update").default(systemId, pluginFullName); break;
  case "init": require("./commands/init").default(systemId, pluginFullName); break;
  /* tslint:enable */
  default:
    yargs.showHelp();
    process.exit(1);
    break;
}
