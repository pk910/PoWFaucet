#!/bin/bash -e

if [ ! -f build_wasm.sh ]; then
  printf "Please run this script from the faucet-wasm folder.\n"
fi

go_is_installed="$(which go | wc -l)"

if [ "$go_is_installed" == "0" ]; then
  printf "golang (go) is required for the next step. Please install it manually 😇"
  exit 1
fi

printf "compiling argon2 wasm... \n"
GOOS=js GOARCH=wasm go build -o  ./nickminer.wasm
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ./nickminer.js

printf "\n\nbuilt ./nickminer.wasm successfully!\n\n"

cp ./nickminer.wasm ../../static/js/nickminer.wasm

