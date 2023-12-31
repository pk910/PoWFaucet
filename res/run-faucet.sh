#!/bin/sh
cd $( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )

until node --no-deprecation ./bundle/powfaucet.cjs; do
  echo "powfaucet.cjs crashed with exit code $?.  Respawning.." >&2
  sleep 1
done