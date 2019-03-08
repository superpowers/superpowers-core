"use strict";

const gulp = require("gulp");
const fs = require("fs");

let editors = [];
try { editors = fs.readdirSync("./editors"); } catch (err) { /* Ignore */ }

const tasks = [];

if (editors.length > 0) {
  // Pug
  const pug = require("gulp-pug");
  const rename = require("gulp-rename");

  const i18n = require("./i18n");
  const languageCodes = fs.readdirSync(i18n.rootLocalesPath);
  languageCodes.push("none");

  for (const languageCode of languageCodes) {
    const locale = i18n.loadLocale(languageCode, true);
    gulp.task(`pug-${languageCode}`, () => {
      let result = gulp.src("./editors/**/index.pug").pipe(pug({ locals: { t: i18n.makeT(locale) } }));
      if (languageCode !== "en") result = result.pipe(rename({ extname: `.${languageCode}.html` }));
      return result.pipe(gulp.dest("./public/editors"));
    });
    tasks.push(`pug-${languageCode}`);
  }

  // Stylus
  const stylus = require("gulp-stylus");
  gulp.task("stylus", () => gulp.src("./editors/**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("./public/editors")));
  tasks.push("stylus");
}

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

function makeBrowserify(src, dest, output) {
  gulp.task(`${output}-browserify`, () => {
    if (!fs.existsSync(src)) return Promise.resolve("No source.");

    return browserify(src)
      .transform("brfs").bundle()
      .pipe(source(`${output}.js`))
      .pipe(gulp.dest(dest));
  });
  tasks.push(`${output}-browserify`);
}

if (fs.existsSync("./public/bundles")) {
  for (const bundle of fs.readdirSync("./public/bundles")) fs.unlinkSync(`./public/bundles/${bundle}`);
}

const nonBundledFolders = [ "public", "editors", "node_modules", "typings" ]; 
for (const folder of fs.readdirSync("./")) {
  if (nonBundledFolders.indexOf(folder) !== -1) continue;

  if (fs.existsSync(`./${folder}/index.ts`) || fs.existsSync(`./${folder}/index.js`))
    makeBrowserify(`./${folder}/index.js`, "./public/bundles", folder);
}

for (const editor of editors) makeBrowserify(`./editors/${editor}/index.js`, "./public/editors", `${editor}/index`);

// All
gulp.task("default", gulp.series("typescript", gulp.parallel(tasks)));
