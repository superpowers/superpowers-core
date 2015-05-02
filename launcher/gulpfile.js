var gulp = require("gulp");

// Jade
var jade = require("gulp-jade");
gulp.task("jade", function() {
  return gulp.src('./src/index.jade').pipe(jade()).pipe(gulp.dest('./public'));
});

// Stylus
var stylus = require("gulp-stylus");
var nib = require("nib");
gulp.task("stylus", function() {
  return gulp.src("./src/index.styl").pipe(stylus({use: [ nib() ], errors: true})).pipe(gulp.dest("./public"));
});

// TypeScript
var ts = require("gulp-typescript");
gulp.task("typescript", function() {
  var tsResult = gulp.src([ "**/*.ts", "!node_modules/**" ]).pipe(ts({
    typescript: require("typescript"),
    declarationFiles: false,
    noImplicitAny: true,
    module: "commonjs",
    target: "ES5"
  }));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("./public")); };
  return bundle();
});

// All
gulp.task("default", [ "jade", "stylus", "typescript", "browserify" ]);
