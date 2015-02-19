cd ../SupCore
call gulp

cd ../SupClient
call gulp

cd ../system/SupEngine
call npm install
call gulp

cd ../SupRuntime
call gulp

cd ../player
call gulp

cd ../../client
call gulp

cd ../plugins/sparklinlabs/scene
call gulp

cd ../script
call npm install
call gulp

cd ../sound
call gulp

cd ../sprite
call gulp

cd ../tileMap
call gulp
