#!/bin/bash -e

if [ ! -f build_wasm.sh ]; then
  printf "Please run this script from the faucet-wasm folder.\n"
fi

if [ ! -d secp256k1 ]; then
  printf "Cloning https://github.com/bitcoin-core/secp256k1.git... \n"
  git clone https://github.com/bitcoin-core/secp256k1.git secp256k1
fi

docker_is_installed="$(which docker | wc -l)"

if [ "$docker_is_installed" == "0" ] ; then
  printf "docker is required for the next step. Please install it manually 😇"
  exit 1
fi

printf "compiling nickminer wasm... \n"

mkdir -p build
docker build -f nickminer.Dockerfile . -t wasm-secp256k1
docker run --rm -v $(pwd)/build:/out wasm-secp256k1 ./nickminer-compile.sh

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

node build_wasm.js > "../../libs/nickminer_wasm.cjs"

printf "\n\nbuilt ../libs/nickminer_wasm.cjs successfully!\n\n"

