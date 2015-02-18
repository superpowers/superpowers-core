gulp = require 'gulp'

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './index.coffee', extensions: ['.coffee'], standalone: 'SupCore'
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('SupCore.js')).pipe gulp.dest('../public/core')
  bundle()

# All
gulp.task 'default', [ 'browserify' ]
