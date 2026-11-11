#!/bin/bash -e
#
# Builds libs/yespower_wasm.cjs from the yespower 1.0.1 reference release (Openwall).
#
# The release tarball is pinned by sha256 and the emscripten toolchain by version, so a rebuild
# produces the same code that was reviewed. Two wasm variants are built from the same source:
# "simd" (wasm SIMD, yespower's SSE2 code path translated by emscripten) and "baseline" (no SIMD,
# for engines without wasm SIMD). Both, and a native build, must reproduce upstream's TESTS-OK
# before the lib is written.

YESPOWER_VERSION="1.0.1"
YESPOWER_URL="https://www.openwall.com/yespower/yespower-${YESPOWER_VERSION}.tar.gz"
YESPOWER_SHA256="0e1eb612e3fa23a0b19aa5bbe944000b501b17d8bbb38cfa383a1f4376ead029"
EMSDK_VERSION="3.1.51"

cd "$(dirname "$0")"

SRC_DIR="yespower-src"
BUILD_DIR="build"

if [ ! -f "$SRC_DIR/yespower-${YESPOWER_VERSION}/yespower.h" ]; then
  printf "downloading yespower %s... \n" "$YESPOWER_VERSION"
  rm -rf "$SRC_DIR"
  mkdir -p "$SRC_DIR"
  curl -fsSL -o "$SRC_DIR/yespower.tar.gz" "$YESPOWER_URL"
  echo "$YESPOWER_SHA256  $SRC_DIR/yespower.tar.gz" | sha256sum -c -
  tar -xzf "$SRC_DIR/yespower.tar.gz" -C "$SRC_DIR"
  rm "$SRC_DIR/yespower.tar.gz"
fi
YP="$SRC_DIR/yespower-${YESPOWER_VERSION}"
YP_SRC="$YP/yespower-opt.c $YP/sha256.c"

# EMSDK_DIR can point at an existing emsdk checkout (e.g. ../argon2/emsdk) to skip the download
EMSDK_DIR="${EMSDK_DIR:-emsdk}"
emcc_matches() {
  command -v emcc >/dev/null && emcc --version | head -n 1 | grep -q " $EMSDK_VERSION "
}
if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
  source "$EMSDK_DIR/emsdk_env.sh" >/dev/null 2>&1
fi
if ! emcc_matches; then
  if [ ! -d "$EMSDK_DIR" ]; then
    git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
  fi
  (cd "$EMSDK_DIR" && ./emsdk install "$EMSDK_VERSION" && ./emsdk activate "$EMSDK_VERSION")
  source "$EMSDK_DIR/emsdk_env.sh" >/dev/null 2>&1
fi
if ! emcc_matches; then
  printf "emcc %s is required, found: %s\n" "$EMSDK_VERSION" "$(emcc --version | head -n 1)"
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

printf "checking upstream test vectors... \n"
gcc -O2 -w -I"$YP" "$YP/tests.c" $YP_SRC -o "$BUILD_DIR/tests-native"
"$BUILD_DIR/tests-native" | cmp - "$YP/TESTS-OK"

EMCC_COMMON="-O3 -w -s NO_FILESYSTEM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=16777216 -s MAXIMUM_MEMORY=268435456"
for variant in simd baseline; do
  if [ "$variant" == "simd" ]; then
    VARIANT_FLAGS="-msimd128 -msse2"
  else
    VARIANT_FLAGS=""
  fi

  emcc $EMCC_COMMON $VARIANT_FLAGS -s ENVIRONMENT=node -I"$YP" "$YP/tests.c" $YP_SRC -o "$BUILD_DIR/tests-$variant.cjs"
  node "$BUILD_DIR/tests-$variant.cjs" | cmp - "$YP/TESTS-OK"

  printf "compiling yespower wasm (%s)... \n" "$variant"
  EXPORT_NAME="YespowerModule_$variant"
  emcc $EMCC_COMMON $VARIANT_FLAGS \
    -s 'EXPORTED_RUNTIME_METHODS=["cwrap"]' -s EXPORTED_FUNCTIONS="['_hash_yp']" \
    -s WASM=1 -s ENVIRONMENT=worker -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME="$EXPORT_NAME" \
    --no-entry --pre-js ./wasm-pre.js \
    -I"$YP" ./hash_yp.c $YP_SRC -o "$BUILD_DIR/hash_yp_$variant.js"
done
printf "upstream test vectors match (native, simd, baseline)\n"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf "nodejs and npm are required for the next step. Please install them manually.\n"
  exit 1
fi

if [ ! -d node_modules ]; then
  npm ci
fi

node build_wasm.js > "$BUILD_DIR/yespower_wasm.cjs"
mv "$BUILD_DIR/yespower_wasm.cjs" "../../libs/yespower_wasm.cjs"

printf "\nbuilt ../../libs/yespower_wasm.cjs successfully!\n\n"
