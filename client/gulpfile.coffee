gulp = require 'gulp'

# Jade
jade = require 'gulp-jade'
gulp.task 'jade', -> gulp.src('./src/index.jade').pipe(jade()).pipe(gulp.dest('../public'))

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', -> gulp.src('./src/index.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(gulp.dest('../public'))

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './src/index.coffee', extensions: ['.coffee']
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('index.js')).pipe gulp.dest('../public')
  bundle()

# All
gulp.task 'default', [ 'jade', 'stylus', 'browserify' ]
