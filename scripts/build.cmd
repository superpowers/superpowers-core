pushd %~dp0

cd ..
call npm install

cd SupCore
call gulp

cd ../SupClient
call gulp

cd ../SupAPI
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

cd ../launcher
call gulp

cd ../scripts
call buildPlugins.cmd

popd
