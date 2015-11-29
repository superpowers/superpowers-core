var path = require("path");
var fs = require("fs");
var async = require("async");
var child_process = require("child_process");

var repositories = {
  core: {
    name: "Core",
    path: path.resolve(__dirname + "/.."),
    entries: [], startTag: null, endTag: null },
  supGameSystem: {
    name: "Superpowers Game system",
    path: path.resolve(__dirname + "/../systems/supGame"),
    entries: [], startTag: null, endTag: null },
  supGamePlugins: {
    name: "Sparklin Labs plugins for the Superpowers Game system",
    path: path.resolve(__dirname + "/../systems/supGame/plugins/sparklinlabs"),
    entries: [], startTag: null, endTag: null }
};

var tagRegex = /^tag:\s+(.*)$/;
var summaryRegex = /^summary:\s+(.*)$/;

async.eachSeries(Object.keys(repositories), function(name, cb) {
  var repository = repositories[name];

  child_process.exec("hg log --limit 1000", { cwd: repository.path, env: process.env }, function(err, stdout, stderr) {
    if (err != null) throw err;

    var lines = stdout.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      
      var tagResults = tagRegex.exec(line);
      if (tagResults != null && tagResults[1] !== "tip") {
        if (repository.startTag == null) {
          repository.startTag = tagResults[1];
        } else {
          repository.endTag = tagResults[1];
          break;
        }
        continue;
      }

      var summaryResults = summaryRegex.exec(line);
      if (summaryResults != null) {
        var entry = summaryResults[1];
        if (entry.indexOf("Added tag v") === 0) continue;
        if (entry.indexOf("Bump to ") === 0) continue;
        repository.entries.push(entry);
      }
    }

    cb();
  });
}, function() {
  var startTag = repositories.core.startTag;
  for (var name in repositories) {
    var repository = repositories[name];
    if (startTag != repository.startTag) throw new Error("Repository " + name + " is tagged " + repository.startTag + " but global tag is " + startTag);
  }

  var changelog = "";

  // Title
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth() + 1; if (month < 10) month = "0" + month;
  var day = date.getDate(); if (day < 10) day = "0" + day;
  changelog += "# " + startTag + " released on " + year + "-" + month + "-" + day + "\n";
  changelog += "\n";

  // User-friendly changelog
  changelog += "## TODO: Describe changes with pretty pictures!\n";
  changelog += "\n";
  changelog += "\n";
  changelog += "\n";

  // All changes
  changelog += "## All changes in this release\n";
  changelog += "\n";
  changelog += "Read on for a full list of changes in reverse chronological order.\n";

  for (var name in repositories) {
    var repository = repositories[name];
    changelog += "\n";
    changelog += "### " + repository.name + "\n";
    changelog += "\n";

    for (var entry of repository.entries) {
      changelog += " * " + entry + "\n";
    }
  }

  fs.mkdir(__dirname + "/" + startTag, function(err) {
    fs.writeFile(__dirname + "/" + startTag + "/CHANGELOG.md", changelog, function(err) {
      console.log("Done!");
    });
  })
});
