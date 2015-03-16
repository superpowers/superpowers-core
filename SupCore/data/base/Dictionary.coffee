{ EventEmitter } = require 'events'

module.exports = class Dictionary extends EventEmitter

  constructor: (@unloadDelaySeconds=60) ->
    @byId = {}
    @refCountById = {}
    @unloadTimeoutsById = {}

  acquire: (id, owner, callback) ->
    @refCountById[id] ?= 0
    @refCountById[id]++
    #console.log "Acquiring #{id}: #{@refCountById[id]} refs"

    # Cancel pending unload timeout if any
    timeout = @unloadTimeoutsById[id]
    if timeout?
      #console.log "Cancelling unload timeout for #{id}"
      clearTimeout timeout
      delete @unloadTimeoutsById[id]

    item = @byId[id]

    if ! item?
      try item = @_load id
      catch e then callback e; return
      @byId[id] = item

    if item.pub? then callback null, item
    else item.on 'load', =>
      # Bail if entry was evicted from the cache
      return if ! @byId[id]?
      @emit 'itemLoad', id, item
      callback null, item; return

    return

  release: (id, owner, options) ->
    if ! @refCountById[id]? then throw new Error "Can't release #{id}, ref count is null"

    @refCountById[id]--
    #console.log "Releasing #{id}: #{@refCountById[id]} refs left"

    if @refCountById[id] == 0
      delete @refCountById[id]

      # Schedule unloading the asset after a while
      if options?.skipUnloadDelay then @_unload id
      else @unloadTimeoutsById[id] = setTimeout ( => @_unload(id); return ), @unloadDelaySeconds * 1000

    return

  _unload: (id) ->
    #console.log "Unloading #{id}"
    @byId[id].destroy()
    delete @byId[id]; delete @unloadTimeoutsById[id]; return

  releaseAll: (id) ->
    # Cancel pending unload timeout if any
    timeout = @unloadTimeoutsById[id]
    if timeout?
      clearTimeout timeout
      delete @unloadTimeoutsById[id]

    delete @refCountById[id]
    delete @byId[id]
    return
