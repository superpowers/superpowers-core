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
    .pipe(ts(tsProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], () =>
  browserify("./index.js", { standalone: "SupCore" })
    .bundle()
    .pipe(source("SupCore.js"))
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", [ "typescript", "browserify" ]);
