gulp = require 'gulp'
gutil = require 'gulp-util'

# Jade
jade = require 'gulp-jade'
gulp.task 'jade', -> gulp.src('./src/index.jade').pipe(jade()).pipe(gulp.dest('./public'))

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', -> gulp.src('./src/index.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(gulp.dest('./public'))

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './src/index.coffee', extensions: ['.coffee']
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('index.js')).pipe gulp.dest('./public')
  bundle()

# All
gulp.task 'default', [ 'jade', 'stylus', 'browserify' ]

gulp.task 'watch', [ 'jade', 'stylus' ], ->
  gulp.watch './src/**/*.jade', [ 'jade' ]
  gulp.watch './src/**/*.styl', [ 'stylus' ]

  watchify = require 'watchify'
  watchify.args.extensions = '.coffee'
  bundler = watchify browserify './src/index.coffee', watchify.args
  bundler.transform coffeeify
  bundle = ->
    gutil.log "Bundling..."
    bundler.bundle()
      .on 'error', gutil.log.bind gutil
      .pipe(source('index.js')).pipe gulp.dest('./public')
      .on 'end', -> gutil.log "Done bundling."
  bundler.on 'update', bundle
  bundle()
