var gulp = require("gulp");

// Typescript
var ts = require('gulp-typescript');
gulp.task("typescript", function() {
  var tsResult = gulp.src("**/*.ts").pipe(ts({
    declarationFiles: false,
    noImplicitAny: true,
    module: "commonjs",
    target: "ES5"
  }));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Stylus
var stylus = require('gulp-stylus');
var nib = require('nib');
gulp.task("stylus", function() {
  return gulp.src('./src/**/*.styl').pipe(stylus({use: [ nib() ], errors: true})).pipe(gulp.dest('../public/client'));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js", { standalone: "SupClient" } );
  function bundle() { return bundler.bundle().pipe(source("SupClient.js")).pipe(gulp.dest("../../public/client")); };
  return bundle();
});

// All
gulp.task("default", [ "stylus", "typescript", "browserify" ]);
