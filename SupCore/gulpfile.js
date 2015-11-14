var gulp = require("gulp");

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
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./index.js", { standalone: "SupCore" });
  function bundle() { return bundler.bundle().pipe(source("SupCore.js")).pipe(gulp.dest("../public")); };
  return bundle();
});

// All
gulp.task("default", [ "typescript", "browserify" ]);
