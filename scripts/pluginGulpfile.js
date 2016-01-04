var gulp = require("gulp");
var tasks = [];
var fs = require("fs");

var editors = [];
try { editors = fs.readdirSync("./editors"); } catch (err) { /* Ignore */ }

if (editors.length > 0) {
  // Jade
  var jade = require("gulp-jade");
  var rename = require("gulp-rename");
  var pluginI18n = require("./pluginI18n");
  var locales = [ "en" ];
  try { locales = fs.readdirSync(pluginI18n.rootLocalesPath); } catch (err) { /* Ignore */ }

  locales.forEach(function(locale) {
    var contexts = pluginI18n.loadLocale(locale);
    gulp.task("jade-" + locale, function() {
      var result = gulp.src("./editors/**/index.jade").pipe(jade({ locals: { t: pluginI18n.makeT(contexts) } }));
      if (locale !== "en") result.pipe(rename({ extname: "." + locale + ".html" }));
      return result.pipe(gulp.dest("./public/editors"));
    });
    tasks.push("jade-" + locale);
  });

  gulp.task("jade-none", function() {
    return gulp.src("./editors/**/index.jade")
      .pipe(jade({ locals: { t: function(path) { return path; } } }))
      .pipe(rename({ extname: ".none.html" }))
      .pipe(gulp.dest("./public/editors"));
  });
  tasks.push("jade-none");

  // Stylus
  var stylus = require("gulp-stylus");
  gulp.task("stylus", function() {
    return gulp.src("./editors/**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("./public/editors"));
  });
  tasks.push("stylus");
}

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");

gulp.task("typescript", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});
tasks.push("typescript");

// Browserify
var browserify = require("browserify");
var vinylSourceStream = require("vinyl-source-stream");
function makeBrowserify(source, destination, output) {
  gulp.task(output + "-browserify", [ "typescript" ], function() {
    if (!fs.existsSync(source)) return;

    var bundler = browserify(source);
    bundler.transform("brfs");
    function bundle() { return bundler.bundle().pipe(vinylSourceStream(output + ".js")).pipe(gulp.dest(destination)); };
    return bundle();
  });
  tasks.push(output + "-browserify");
}

makeBrowserify("./data/index.js", "./public", "data");

// FIXME: Remove hardcoded list of folders to browserify
// (allow systems or plugins to define what they expect?)
makeBrowserify("./components/index.js", "./public", "components");
makeBrowserify("./componentEditors/index.js", "./public", "componentEditors");
makeBrowserify("./runtime/index.js", "./public", "runtime");
makeBrowserify("./api/index.js", "./public", "api");
makeBrowserify("./settingsEditors/index.js", "./public", "settingsEditors");
makeBrowserify("./documentation/index.js", "./public", "documentation");

editors.forEach(function(editor) { makeBrowserify("./editors/" + editor + "/index.js", "./public/editors", editor + "/index"); });

// All
gulp.task("default", tasks);
