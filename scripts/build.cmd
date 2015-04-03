pushd %~dp0

cd ..
call npm install

cd SupCore
call tsd reinstall
call tsd rebundle
call gulp

cd ../SupClient
call gulp

cd ../SupAPI
call gulp

cd ../system/SupEngine
call npm install
call tsd reinstall
call tsd rebundle
call gulp

cd ../SupRuntime
call gulp

cd ../player
call gulp

cd ../../client
call gulp

cd ../launcher
call gulp

cd ../plugins/sparklinlabs/scene
call gulp

cd ../typescript
call npm install
call gulp

cd ../sound
call gulp

cd ../sprite
call gulp

cd ../tileMap
call gulp

cd ../tweenjs
call npm install
call gulp

cd ../arcadePhysics2D
call gulp

cd ../model
call gulp

cd ../cannonjs
call npm install
call gulp

cd ../p2js
call npm install
call gulp

cd ../rngjs
call gulp

cd ../home
call gulp

popd
