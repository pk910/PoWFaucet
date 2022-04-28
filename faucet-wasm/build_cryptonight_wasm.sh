#!/bin/bash -e

if [ ! -f build_wasm.sh ]; then
  printf "Please run this script from the faucet-wasm folder.\n"
fi

if [ ! -d cryptonight-wasm ]; then
  printf "Cloning https://github.com/notgiven688/webminerpool... \n"
  git clone https://github.com/notgiven688/webminerpool.git cryptonight-wasm
fi

emcc_is_installed="$(which emcc | wc -l)"

if [ "$emcc_is_installed" == "0" ]; then
  git clone https://github.com/emscripten-core/emsdk.git
  cd emsdk
  ./emsdk install latest
  ./emsdk activate latest
  source ./emsdk_env.sh
  cd ..
fi

cd cryptonight-wasm/hash_cn/webassembly
if [ ! -f ./cn.wasm ]; then
  printf "running cryptonight_Makefile for webminerpool/hash_cn/webassembly... \n"
  
  # included Makefile is not working...
  mv Makefile Makefile.org
  cp ../../../cryptonight_Makefile ./Makefile
  make
  mv Makefile.org Makefile
fi
cd ../../..

nodejs_is_installed="$(which node | wc -l)"
npm_is_installed="$(which npm | wc -l)"

if [ "$nodejs_is_installed" == "0" ] || [ "$npm_is_installed" == "0"  ]; then
  printf "nodejs and npm are required for the next step. Please install them manually 😇"
  exit 1
fi

if [ ! -d node_modules ]; then
  printf "running npm install \n"
  npm install
fi

node build_cryptonight_wasm.js > "../libs/cryptonight_wasm.js"

printf "\n\nbuilt ../libs/cryptonight_wasm.js successfully!\n\n"


