var gulp = require("gulp");

// Jade
var jade = require("gulp-jade");
gulp.task("jade-login", function() { return gulp.src("./src/login/index.jade").pipe(jade()).pipe(gulp.dest("../public/login")); });
gulp.task("jade-hub", function() { return gulp.src("./src/hub/index.jade").pipe(jade()).pipe(gulp.dest("../public/hub")); });
gulp.task("jade-project", function() { return gulp.src("./src/project/index.jade").pipe(jade()).pipe(gulp.dest("../public/project")); });
gulp.task("jade-build", function() { return gulp.src("./src/build.jade").pipe(jade()).pipe(gulp.dest("../public")); });

// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus-login", function() { return gulp.src("./src/login/index.styl").pipe(stylus({ errors: true })).pipe(gulp.dest("../public/login")); });
gulp.task("stylus-hub", function() { return gulp.src("./src/hub/index.styl").pipe(stylus({ errors: true })).pipe(gulp.dest("../public/hub")); });
gulp.task("stylus-project", function() { return gulp.src("./src/project/index.styl").pipe(stylus({ errors: true })).pipe(gulp.dest("../public/project")); });

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");

gulp.task("typescript", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");

gulp.task("browserify-login", [ "typescript" ], function() {
  var bundler = browserify("./src/login/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/login")); }
  return bundle();
});

gulp.task("browserify-hub", [ "typescript" ], function() {
  var bundler = browserify("./src/hub/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/hub")); }
  return bundle();
});

gulp.task("browserify-project", [ "typescript" ], function() {
  var bundler = browserify("./src/project/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public/project")); }
  return bundle();
});

// All
gulp.task("default", [
  "jade-login",
  "jade-hub",
  "jade-project",
  "jade-build",

  "stylus-login",
  "stylus-hub",
  "stylus-project",

  "typescript",
  "browserify-login",
  "browserify-hub",
  "browserify-project",
]);
