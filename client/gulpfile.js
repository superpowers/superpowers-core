"use strict";

const gulp = require("gulp");

// Pug
const pugTasks = [];

const pug = require("gulp-pug");
const rename = require("gulp-rename");
const fs = require("fs");

const i18n = require("../scripts/i18n.js");
const languageCodes = fs.readdirSync(i18n.rootLocalesPath);
languageCodes.push("none");

for (const languageCode of languageCodes) {
  const locale = i18n.loadLocale(languageCode);
  gulp.task(`pug-${languageCode}`, () => {
    let result = gulp.src("./**/index.pug").pipe(pug({ locals: { t: i18n.makeT(locale) } }));
    if (languageCode !== "en") result = result.pipe(rename({ extname: `.${languageCode}.html` }));
    return result.pipe(gulp.dest("../public"));
  });
  pugTasks.push(`pug-${languageCode}`);
}

// Stylus
const stylus = require("gulp-stylus");
gulp.task("stylus", () => gulp.src("./**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")));

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("./tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", () => {
  let failed = false;
  const tsResult = tsProject.src()
    .pipe(tslint({ formatter: "prose" }))
    .pipe(tslint.report({ emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(tsProject())
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");

gulp.task("browserify-login", gulp.series("typescript", () => browserify("./login/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/login"))));
gulp.task("browserify-hub", gulp.series("typescript", () => browserify("./hub/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/hub"))));
gulp.task("browserify-project", gulp.series("typescript", () => browserify("./project/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/project"))));
gulp.task("browserify-build", gulp.series("typescript", () => browserify("./build/index.js").bundle().pipe(source("index.js")).pipe(gulp.dest("../public/build"))));

// All
gulp.task("default", gulp.parallel(
  gulp.parallel(pugTasks),
  "stylus",
  gulp.series("typescript", "browserify-login", "browserify-hub", "browserify-project", "browserify-build")));
