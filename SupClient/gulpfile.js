"use strict";

const gulp = require("gulp");

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("./tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", function() {
  let failed = false;
  const tsResult = tsProject.src()
    .pipe(tslint())
    .pipe(tslint.report("prose", { emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(tsProject())
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./"));
});

// Stylus
const stylus = require("gulp-stylus");
gulp.task("stylus", function() {
  return gulp.src("./src/styles/*.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public/styles"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], () =>
  browserify("./src/index.js", { standalone: "SupClient" })
    .transform("brfs").bundle()
    .pipe(source("SupClient.js"))
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", [ "stylus", "typescript", "browserify" ]);
