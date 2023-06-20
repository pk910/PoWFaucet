#!/bin/sh
cd $( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )

until node --no-deprecation ./dist/powfaucet.js; do
  echo "powfaucet.js crashed with exit code $?.  Respawning.." >&2
  sleep 1
done