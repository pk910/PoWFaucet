#!/bin/bash

# method for joining a multiline string list using a delimiter
join() {
  s_list=$1; s_delim=$2

  echo -n "${s_list/$'\n'/}" | tr '\n' "$s_delim" | sed "s/$s_delim$//"
}

# list of functions to export
s_exports='''
  "_malloc"
  "_free"
  "_miner_init"
  "_miner_set_config"
  "_miner_get_input"
  "_miner_get_sigrv"
  "_miner_get_suffix"
  "_miner_get_preimage"
  "_miner_run"
'''

# join list to string
sx_funcs=$(join "$s_exports" ',')

# clean
emmake make clean

# workaround for <https://github.com/emscripten-core/emscripten/issues/13551>
echo '{"type":"commonjs"}' > package.json

# autogen
./autogen.sh

# configure
emconfigure ./configure \
  --enable-module-ecdh \
  --enable-module-recovery \
  --enable-module-schnorrsig=no \
  --enable-module-ellswift=no \
  --enable-module-extrakeys=no \
  --with-ecmult-window=4 \
  --with-ecmult-gen-precision=2 \
  --disable-shared \
  CFLAGS="-fdata-sections -ffunction-sections -O2" \
  LDFLAGS="-Wl,--gc-sections"

# make
emmake make FORMAT=wasm
emmake make src/precompute_ecmult-precompute_ecmult FORMAT=wasm

# reset output dir
rm -rf out
mkdir -p out

echo "library build complete, building miner wasm"

# compile
emcc src/precompute_ecmult-precompute_ecmult.o \
  src/libsecp256k1_precomputed_la-precomputed_ecmult.o \
  src/libsecp256k1_precomputed_la-precomputed_ecmult_gen.o \
  src/libsecp256k1_la-secp256k1.o \
  src/miner/nickminer.c \
  -O3 \
  -s WASM=1 \
  -s NO_FILESYSTEM=1 \
  -s TOTAL_MEMORY=$(( 64 * 1024 * 3 )) \
  -s "BINARYEN_METHOD='native-wasm'" \
  -s DETERMINISTIC=1 \
  -s 'EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' \
  -s EXPORTED_FUNCTIONS="[$sx_funcs]" \
  -s ENVIRONMENT=worker \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s STANDALONE_WASM \
  --no-entry --pre-js ./wasm-pre.js \
  -o out/nickminer.js

# verify
ls -lah out/
cp -r out/* /out/
