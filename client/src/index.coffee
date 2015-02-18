hub = require './scripts/hub'
project = require './scripts/project'

qs = require('querystring').parse window.location.search.slice(1)

if qs.project? then project qs.project
else hub()
