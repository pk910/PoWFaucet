#!/bin/bash -e

if [ ! -f build_wasm.sh ]; then
  printf "Please run this script from the faucet-wasm folder.\n"
fi

if [ ! -d argon2-wasm ]; then
  printf "Cloning https://github.com/urbit/argon2.git... \n"
  git clone https://github.com/urbit/argon2.git argon2-wasm
fi

emcc_is_installed="$(which emcc | wc -l)"

if [ "$emcc_is_installed" == "0" ]; then
  if [ ! -d ./emsdk ]; then
    git clone https://github.com/emscripten-core/emsdk.git
  fi
  cd emsdk
  ./emsdk install latest
  ./emsdk activate latest
  source ./emsdk_env.sh
  cd ..
fi

printf "compiling argon2 wasm... \n"
emcc -O3 -s NO_FILESYSTEM=1 -s TOTAL_MEMORY=67108864 -s 'EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' -s EXPORTED_FUNCTIONS="['_hash_a2','_argon2_hash']" -s WASM=1 -s ENVIRONMENT=worker -s MODULARIZE=1 -s EXPORT_ES6=1 -s STANDALONE_WASM --no-entry --pre-js ./wasm-pre.js -I./argon2-wasm/include ./hash_a2.c -o hash_a2.js

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

node build_wasm.js > "../../libs/argon2_wasm.cjs"

printf "\n\nbuilt ../libs/argon2_wasm.cjs successfully!\n\n"


