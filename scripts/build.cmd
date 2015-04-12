pushd %~dp0

cd ..
call npm install
call tsd reinstall
call tsd rebundle

cd SupCore
call tsd reinstall
call tsd rebundle
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
call tsd reinstall
call tsd rebundle
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
