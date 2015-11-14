var gulp = require("gulp");

// Jade
var jade = require("gulp-jade");
gulp.task("jade-index", function() { return gulp.src("./src/index.jade").pipe(jade()).pipe(gulp.dest("../public")); });
gulp.task("jade-build", function() { return gulp.src("./src/build.jade").pipe(jade()).pipe(gulp.dest("../public")); });

// Stylus
var stylus = require("gulp-stylus");
var nib = require("nib");
gulp.task("stylus-index", function() { return gulp.src("./src/index.styl").pipe(stylus({ use: [ nib() ], errors: true })).pipe(gulp.dest("../public")); });

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

gulp.task("browserify-index", ["typescript"], function() {
  var bundler = browserify("./src/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../public")); }
  return bundle();
});

gulp.task("browserify-build", ["typescript"], function() {
  var bundler = browserify("./src/build.js");
  function bundle() { return bundler.bundle().pipe(source("build.js")).pipe(gulp.dest("../public")); }
  return bundle();
});

// All
gulp.task("default", [ "jade-index", "jade-build", "stylus-index", "typescript", "browserify-index", "browserify-build" ]);
