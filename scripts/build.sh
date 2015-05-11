#!/bin/bash

pushd $(dirname $0)
node build.js
popd
