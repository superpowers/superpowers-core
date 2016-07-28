"use strict";

const gulp = require("gulp");
const tasks = [];

// Jade
const jade = require("gulp-jade");
const rename = require("gulp-rename");
const fs = require("fs");

const i18n = require("../scripts/i18n.js");
const languageCodes = fs.readdirSync(i18n.rootLocalesPath);
languageCodes.push("none");

for (const languageCode of languageCodes) {
  const locale = i18n.loadLocale(languageCode);
  gulp.task(`jade-${languageCode}`, () => {
    const result = gulp.src("./src/**/index.jade").pipe(jade({ locals: { t: i18n.makeT(locale) } }));
    if (languageCode !== "en") result.pipe(rename({ extname: `.${languageCode}.html` }));
    return result.pipe(gulp.dest("../public"));
  });
  tasks.push(`jade-${languageCode}`);
}

// Stylus
const stylus = require("gulp-stylus");
gulp.task("stylus", () => gulp.src("./src/**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")));
tasks.push("stylus");

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("./tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", () => {
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
tasks.push("typescript");

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");

gulp.task("browserify-login", [ "typescript" ], () => browserify("./src/login/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/login")));
gulp.task("browserify-hub", [ "typescript" ], () => browserify("./src/hub/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/hub")));
gulp.task("browserify-project", [ "typescript" ], () => browserify("./src/project/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/project")));
gulp.task("browserify-build", [ "typescript" ], () => browserify("./src/build/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/build")));
tasks.push("browserify-login", "browserify-hub", "browserify-project", "browserify-build");

// All
gulp.task("default", tasks);
