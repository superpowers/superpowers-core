#!/bin/bash

pushd $(dirname $0)
cd ../plugins/sparklinlabs/arcadePhysics2D && gulp
cd ../cannonjs && npm install && gulp
cd ../eventEmitter && gulp
cd ../font && gulp
cd ../gameSettings && gulp
cd ../home && gulp
cd ../model && gulp
cd ../p2js && npm install && gulp
cd ../rngjs && gulp
cd ../scene && gulp
cd ../settings && gulp
cd ../socketio && npm install && gulp
cd ../sound && gulp
cd ../sprite && gulp
cd ../tileMap && gulp
cd ../tweenjs && npm install && gulp
cd ../typescript && npm install && gulp
popd
