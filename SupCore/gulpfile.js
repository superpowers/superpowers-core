"use strict";

const gulp = require("gulp");

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("./tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", () => {
  const tsResult = tsProject.src()
    .pipe(tslint({ formatter: "prose" }))
    .pipe(tslint.report({ emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(tsProject())
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", gulp.series("typescript", () =>
  browserify("./index.js", { standalone: "SupCore" })
    .bundle()
    .pipe(source("SupCore.js"))
    .pipe(gulp.dest("../public"))
));

// All
gulp.task("default", gulp.series("typescript", "browserify"));
