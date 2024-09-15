FROM emscripten/emsdk

RUN apt-get update \
  && apt-get install -y \
  autoconf \
  libtool \
  build-essential

COPY secp256k1 /app
COPY nickminer-compile.sh /app
COPY wasm-pre.js /app
COPY miner /app/src/miner

WORKDIR /app
