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

if (fs.existsSync("./public/bundles")) {
  var bundles = fs.readdirSync("./public/bundles");
  bundles.forEach(function(bundle) { fs.unlinkSync("./public/bundles/" + bundle); });
}

var folders = fs.readdirSync("./");
folders.forEach(function(folder) {
  if (folder === "public" || folder === "editors" || folder === "node_modules" || folder === "typings") return;
  
  if (fs.existsSync("./" + folder + "/index.js"))
    makeBrowserify("./" + folder + "/index.js", "./public/bundles", folder);
})
makeBrowserify("./data/index.js", "./public/bundles", "data");

editors.forEach(function(editor) { makeBrowserify("./editors/" + editor + "/index.js", "./public/editors", editor + "/index"); });

// All
gulp.task("default", tasks);
