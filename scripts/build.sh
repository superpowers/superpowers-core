pushd $(dirname $0)
cd .. && npm install && tsd reinstall && tsd rebundle
cd SupCore && tsd reinstall && tsd rebundle && gulp
cd ../SupClient && tsd reinstall && tsd rebundle && gulp
cd ../SupAPI && gulp
cd ../system/SupEngine && npm install && tsd reinstall && tsd rebundle && gulp
cd ../SupRuntime && tsd reinstall && tsd rebundle && gulp
cd ../player && gulp
cd ../../client && gulp
cd ../launcher && gulp
cd ../plugins && ./buildPlugins.sh
popd
