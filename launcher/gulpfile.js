var gulp = require("gulp");

// Copy
gulp.task("copy", function () { return gulp.src("../public/fonts/Roboto/*").pipe(gulp.dest("./public/fonts/Roboto")); });

// Jade
var jade = require("gulp-jade");
gulp.task("jade", function() {
  return gulp.src([ "./src/index.jade", "./src/connectionStatus.jade" ]).pipe(jade()).pipe(gulp.dest("./public"));
});

// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus", function() {
  return gulp.src("./src/index.styl").pipe(stylus({ errors: true })).pipe(gulp.dest("./public"));
});

// TypeScript - Main
var ts = require("gulp-typescript");
var mainTsProject = ts.createProject("./tsconfig.json");
gulp.task("typescript-main", function() {
  var tsResult = mainTsProject.src().pipe(ts(mainTsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Typescript - Renderer
var tsProject = ts.createProject("./src/tsconfig.json");
gulp.task("typescript-renderer", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./src"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript-renderer" ], function() {
  var bundler = browserify("./src/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("./public")); };
  return bundle();
});

// All
gulp.task("default", [ "copy", "jade", "stylus", "typescript-main", "typescript-renderer", "browserify" ]);
