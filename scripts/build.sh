#!/bin/bash

pushd $(dirname $0)
cd .. && npm install && tsd reinstall && tsd rebundle
cd SupCore && gulp
cd ../SupClient && tsd reinstall && tsd rebundle && gulp
cd ../SupAPI && gulp
cd ../system/SupEngine && npm install && tsd reinstall && tsd rebundle && gulp
cd ../SupRuntime && gulp
cd ../player && gulp
cd ../../client && gulp
cd ../launcher && gulp
cd ../scripts && ./buildPlugins.sh
popd
