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
  return gulp.src("./src/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("./public"));
});

// TypeScript - Main
var ts = require("gulp-typescript");
var tsMainProject = ts.createProject("./tsconfig.json");
var tslint = require("gulp-tslint");

gulp.task("typescript-main", function() {
  var failed = false;
  var tsResult = tsMainProject.src()
    .pipe(tslint())
    .pipe(tslint.report("prose", { emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(ts(tsMainProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./"));
});

// TypeScript - Renderer
var tsRendererProject = ts.createProject("./src/tsconfig.json");

gulp.task("typescript-renderer", function() {
  var failed = false;
  var tsResult = tsRendererProject.src()
    .pipe(tslint())
    .pipe(tslint.report("prose", { emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(ts(tsRendererProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./src"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript-renderer" ], function() {
  var bundler = browserify("./src/index.js");
  bundler.transform("brfs");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("./public")); };
  return bundle();
});

// All
gulp.task("default", [ "copy", "jade", "stylus", "typescript-main", "typescript-renderer", "browserify" ]);
