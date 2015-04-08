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
cd ../plugins/sparklinlabs/scene && gulp
cd ../typescript && npm install && gulp
cd ../sound && gulp
cd ../sprite && gulp
cd ../tileMap && gulp
cd ../tweenjs && npm install && gulp
cd ../arcadePhysics2D && gulp
cd ../model && gulp
cd ../cannonjs && npm install && gulp
cd ../p2js && npm install && gulp
cd ../rngjs && gulp
cd ../home && gulp
popd
