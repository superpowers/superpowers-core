#!/bin/bash

pushd $(dirname $0)
cd .. && npm install
cd SupCore && gulp
cd ../SupClient && gulp
cd ../SupAPI && gulp
cd ../system/SupEngine && npm install && gulp
cd ../SupRuntime && gulp
cd ../player && gulp
cd ../../client && gulp
cd ../launcher && gulp
cd ../scripts && ./buildPlugins.sh
popd
