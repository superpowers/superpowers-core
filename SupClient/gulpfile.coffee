gulp = require 'gulp'

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', -> gulp.src('./src/**/*.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(gulp.dest('../public/client'))

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './src/index.coffee', extensions: ['.coffee'], standalone: 'SupClient'
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('SupClient.js')).pipe gulp.dest('../public/client')
  bundle()

# All
gulp.task 'default', [ 'stylus', 'browserify' ]
