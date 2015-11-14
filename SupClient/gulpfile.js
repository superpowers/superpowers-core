var gulp = require("gulp");

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");

gulp.task("typescript", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Stylus
var stylus = require("gulp-stylus");
var nib = require("nib");
gulp.task("stylus", function() {
  return gulp.src("./src/styles/*.styl").pipe(stylus({ use: [ nib() ], errors: true })).pipe(gulp.dest("../public/styles"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js", { standalone: "SupClient" });
  function bundle() { return bundler.bundle().pipe(source("SupClient.js")).pipe(gulp.dest("../public")); };
  return bundle();
});

// All
gulp.task("default", [ "stylus", "typescript", "browserify" ]);
