pushd %~dp0

cd ..
call npm install
call tsd reinstall
call tsd rebundle

cd SupCore
call gulp

cd ../SupClient
call tsd reinstall
call tsd rebundle
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

cd ../scripts
call buildPlugins.cmd

popd
