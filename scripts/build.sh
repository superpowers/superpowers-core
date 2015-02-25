pushd $(dirname $0)
cd .. && npm install
cd SupCore && gulp
cd ../SupClient && gulp
cd ../system/SupEngine && npm install && gulp
cd ../SupRuntime && gulp
cd ../player && gulp
cd ../../client && gulp
cd ../launcher && gulp
cd ../plugins/sparklinlabs/scene && gulp
cd ../typescript && npm install && gulp
cd ../sound && gulp
cd ../sprite && gulp
cd ../tileMap && gulp
cd ../tweenjs && npm install && gulp
popd
