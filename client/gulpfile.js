var gulp = require("gulp");
var tasks = [];
var fs = require("fs");

// Jade
var jade = require("gulp-jade");
var rename = require("gulp-rename");
var localesFolder = "../public/locales/";
var locales = fs.readdirSync(localesFolder);

function loadLocales(locale) {
  var localsByContext = {};
  var files = fs.readdirSync(localesFolder + locale);
  files.forEach(function(fileName) {
    var file = fs.readFileSync(localesFolder + locale + "/" + fileName, { encoding: "utf8" } );
    localsByContext[fileName.slice(0, fileName.lastIndexOf("."))] = JSON.parse(file);
  });

  if (defaultLocals != null) {
    function checkRecursively(defaultRoot, root, key, path) {
      if (root[key] == undefined) {
        console.log("Missing key in " + locale + " translation: " + path + "." + key)
        root[key] = defaultRoot[key];

      } else if (typeof defaultRoot[key] === "object") {
        var keys = Object.keys(defaultRoot[key]);
        for (var i = 0 ; i < keys.length; i++) {
          checkRecursively(defaultRoot[key], root[key], keys[i], path + "." + keys[i]);
        }
      }
    }
    var keys = Object.keys(defaultLocals);
    for (var i = 0 ; i < keys.length; i++)
      checkRecursively(defaultLocals, localsByContext, keys[i], keys[i]);
  }
  return localsByContext;
}

var defaultLocals = loadLocales("en");
locales.forEach(function(locale) {
  var localsByContext = loadLocales(locale);

  gulp.task("jade-" + locale, function() {
    var result = gulp.src("./src/**/index.jade")
      .pipe(jade({ locals: { t: function(path) {
          var parts = path.split(":");
          var local = localsByContext[parts[0]];
          if (local == null) return path;
          
          var keys = parts[1].split(".");
          for (var i = 0; i < keys.length; i++) {
            local = local[keys[i]];
            if (local == null) return path;
          }
          return local;
        }}
      }));

    if (locale !== "en") result.pipe(rename({ extname: "." + locale + ".html" }))
    return result.pipe(gulp.dest("../public"));
  });
  tasks.push("jade-" + locale);
})

gulp.task("jade-none", function() {
  return gulp.src("./src/**/index.jade")
    .pipe(jade({ locals: { t: function(path) { return path; } } }))
    .pipe(rename({ extname: ".none.html" }))
    .pipe(gulp.dest("../public"));
});
tasks.push("jade-none");

gulp.task("jade-build", function() { return gulp.src("./src/build.jade").pipe(jade()).pipe(gulp.dest("../public")); });
tasks.push("jade-build");

// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus", function() { return gulp.src("./src/**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")); });
tasks.push("stylus");

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");
var tslint = require("gulp-tslint");

gulp.task("typescript", function() {
  var tsResult = tsProject.src()
    .pipe(tslint({ tslint: require("tslint") }))
    .pipe(tslint.report("prose", { emitError: false }))
    .pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});
tasks.push("typescript");

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");

gulp.task("browserify-login", [ "typescript" ], function() {
  var bundler = browserify("./src/login/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/login")); }
  return bundle();
});
tasks.push("browserify-login");

gulp.task("browserify-hub", [ "typescript" ], function() {
  var bundler = browserify("./src/hub/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/hub")); }
  return bundle();
});
tasks.push("browserify-hub");

gulp.task("browserify-project", [ "typescript" ], function() {
  var bundler = browserify("./src/project/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/project")); }
  return bundle();
});
tasks.push("browserify-project");

// All
gulp.task("default", tasks);
