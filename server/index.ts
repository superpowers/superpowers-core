/// <reference path="index.d.ts" />

import start from "./start";
import * as dummy_https from "https";
import * as fs from "fs";

let https: typeof dummy_https = require("follow-redirects").https;
let unzip = require("unzip");

let installedSystems: string[] = [];
let systemsPath = `${__dirname}/../systems`;
for (let file of fs.readdirSync(systemsPath)) {
  if (file.indexOf(".") !== -1) continue;
  if (!fs.statSync(`${systemsPath}/${file}`).isDirectory) continue;

  let packageData = fs.readFileSync(`${systemsPath}/${file}/package.json`, { encoding: "utf8" });
  let systemId = JSON.parse(packageData).superpowers.systemId;
  installedSystems.push(systemId);
}

let registry: { [ sytemId: string ]: { repository: string; plugins: { [ name: string ]: string } } };

let command = process.argv[2];
if (command == null) console.log("Available commands: start, install");
else {
  switch (command) {
    case "start":
      start();
      break;
    case "install":
      let registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers/master/registry.json";
      https.get(registryUrl, (res) => {
        if (res.statusCode === 404) {
          console.log(`Couldn't load registry from ${registryUrl}`);
          return;
        }
        let content = "";
        res.on("data", (chunk: string) => { content += chunk; });
        res.on("end", () => {
          registry = JSON.parse(content);

          let systemAndPlugin = process.argv[3];
          if (systemAndPlugin == null) {
            console.log(`Available systems: ${Object.keys(registry).join(", ")}`);
            return;
          }

          if (systemAndPlugin.indexOf(":") === -1) {
            installSystem(systemAndPlugin);
          } else {
            let [systemId, plugin] = systemAndPlugin.split(":");
            installPlugin(systemId, plugin);
          }
        });
      });
      break;
    default:
      console.log(`Unknown command: ${command}`);
      break;
  }
}

function installSystem(systemId: string) {
  if (installedSystems.indexOf(systemId) !== -1) {
    console.log(`System ${systemId} is already installed`);
    console.log(`Available systems: ${Object.keys(registry).join(", ")}`);
    return;
  } else if (registry[systemId] == null ) {
    console.log(`System ${systemId} doesn't exist`);
    console.log(`Available systems: ${Object.keys(registry).join(", ")}`);
    return;
  }

  console.log(`Installing system ${systemId}...`);
  let repositoryUrl = `${registry[systemId].repository.replace("https://github.com", "/repos")}/releases/latest`;
  https.get({
    hostname: "api.github.com",
    path: repositoryUrl,
    headers: { "user-agent": "Superpowers" }
  }, function(res) {
    if (res.statusCode === 404) {
      console.log("Couldn't get information from repository");
      return;
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      let repositoryInfo = JSON.parse(content);
      let downloadUrl = repositoryInfo.assets[0].browser_download_url;

      https.get({
        hostname: "github.com",
        path: downloadUrl,
        headers: { "user-agent": "Superpowers" }
      }, function(res) {
        if (res.statusCode === 404) {
          console.log("Couldn't download the system");
          return;
        }
        res.pipe(unzip.Extract({ path: systemsPath }));
        res.on("end", () => { console.log("System installed"); });
      });
    });
  });
}

function installPlugin(systemId: string, plugin: string) {
  console.log("Plugin installation isn't supported yet");
}
