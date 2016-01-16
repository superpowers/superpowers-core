var fs = require("fs");
var defaultContexts = null;
//exports.localesPath = "./public/locales/";
exports.rootLocalesPath = "../../../../../public/locales/";
exports.localesPath = "./public/locales/";

exports.loadLocale = function(locale) {
 if (defaultContexts == null && locale !== "en") defaultContexts = exports.loadLocale("en");

  var contexts = {};
  var files = [];
  try { files = fs.readdirSync(exports.localesPath + locale); } catch (err) { /* Ignore */ } 
  files.forEach(function(fileName) {
    var file = fs.readFileSync(exports.localesPath + locale + "/" + fileName, { encoding: "utf8" });
    contexts[fileName.slice(0, fileName.lastIndexOf("."))] = JSON.parse(file);
  });
  contexts["common"] = JSON.parse(fs.readFileSync(exports.rootLocalesPath + locale + "/common.json", { encoding: "utf8" }));

  if (defaultContexts != null) {
    var missingKeys = [];
    function checkRecursively(defaultRoot, root, key, path) {
      if (root[key] == undefined) {
        missingKeys.push(path);
        root[key] = defaultRoot[key];
      
      } else if (typeof defaultRoot[key] === "object") {
        var keys = Object.keys(defaultRoot[key]);
        for (var i = 0; i < keys.length; i++) {
          checkRecursively(defaultRoot[key], root[key], keys[i], path + "." + keys[i]);
        }
      }
    }
    var keys = Object.keys(defaultContexts);
    for (var i = 0; i < keys.length; i++)
      checkRecursively(defaultContexts, contexts, keys[i], keys[i]);
    if (missingKeys.length > 0) console.log("Missing keys in " + locale + " translation: " + missingKeys.join(", "));
  }
  
  return contexts;
}

exports.makeT = function(contexts) {
  return function t(path) {
    var parts = path.split(":");
    var value = contexts[parts[0]];
    if (value == null) return path;

    var keys = parts[1].split(".");
    for (var i = 0; i < keys.length; i++) {
      value = value[keys[i]];
      if (value == null) return path;
    }
    return value;
  }
}