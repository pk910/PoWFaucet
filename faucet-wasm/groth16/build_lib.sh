#!/bin/bash -e

if [ ! -f build_wasm.sh ]; then
  printf "Please run this script from the faucet-wasm folder.\n"
fi

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

npx webpack --stats-error-details

cp ./dist/ ../../libs/groth16.cjs

printf "\n\nbuilt ../../libs/groth16.cjs successfully!\n\n"


