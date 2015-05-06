pushd %~dp0
cd ../plugins/sparklinlabs/arcadePhysics2D & call gulp
cd ../cannonjs & call npm install & call gulp
cd ../eventEmitter & call gulp
cd ../font & call gulp
cd ../gameSettings & call gulp
cd ../home & call gulp
cd ../model & call gulp
cd ../p2js & call npm install & call gulp
cd ../rngjs & call gulp
cd ../scene & call gulp
cd ../settings & call gulp
cd ../socketio & call npm install & call gulp
cd ../sound & call gulp
cd ../sprite & call gulp
cd ../tileMap & call gulp
cd ../tweenjs & call npm install & call gulp
cd ../typescript & call npm install & call gulp
popd
