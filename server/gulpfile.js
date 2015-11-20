var fs = require("fs");
var gulp = require("gulp");

// TypeScript
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var tsProject = ts.createProject("./tsconfig.json");
var tslintConfig = JSON.parse(fs.readFileSync("../tslint.json", { encoding: "utf8" }));

gulp.task("typescript", function() {
  var tsResult = tsProject.src()
    .pipe(tslint({ tslint: require("tslint"), configuration: tslintConfig }))
    .pipe(tslint.report("prose", { emitError: false, reportLimit: 20 }))
    .pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("./"));
});

// All
gulp.task("default", [ "typescript" ]);
