gulp = require 'gulp'

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './index.coffee', extensions: ['.coffee'], standalone: 'SupAPI'
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('SupAPI.js')).pipe gulp.dest('../public/api')
  bundle()

# All
gulp.task 'default', [ 'browserify' ]
