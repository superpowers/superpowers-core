var gulp = require("gulp");

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");
var tslint = require("gulp-tslint");

gulp.task("typescript", function() {
  var failed = false;
  var tsResult = tsProject.src()
    .pipe(tslint())
    .pipe(tslint.report("prose", { emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(ts(tsProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./"));
});

// All
gulp.task("default", [ "typescript" ]);
