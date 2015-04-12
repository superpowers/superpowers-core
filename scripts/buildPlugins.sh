pushd $(dirname $0)
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
cd ../socketio && npm install && tsd reinstall && tsd rebundle && gulp
popd
