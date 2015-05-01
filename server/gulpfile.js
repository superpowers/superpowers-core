var gulp = require("gulp");

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

// All
gulp.task("default", [ "typescript" ]);
