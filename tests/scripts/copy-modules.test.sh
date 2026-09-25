#!/usr/bin/env bash
#
# `scripts/copy-modules.mjs` puts each built module where the loader looks - and must not put it on
# top of the faucet.
#
# For a raw build the target is `dist/modules/`, which is *also* where the faucet's own compiled
# `src/modules/**` lives: `dist/modules/pow/`, `dist/modules/captcha/` and `ModuleManager.js` sit
# beside an installed `dist/modules/<name>/`. The loader is fine with that (a package is a directory
# with a `module.json`; the faucet's own have none), but a module *named* `pow` would land on the
# faucet's compiled PoW module, and the un-ship path would delete it - a build step overwriting the
# program it is building. Found while proving format 1, by renaming that directory
# and watching the faucet fail to start.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script="$here/scripts/copy-modules.mjs"
fails=0

check() {   # check <description> <condition-as-command...>
  local what="$1"; shift
  if "$@"; then
    echo "  ok    $what"
  else
    echo "  FAIL  $what"
    fails=$((fails + 1))
  fi
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/scripts"
cp "$script" "$work/scripts/"

# a module that is ready to ship, and one named after something the faucet compiled
module() {   # module <name>
  mkdir -p "$work/modules/$1/dist"
  printf '{"name":"%s","version":"0.0.1","apiVersion":1,"backend":"backend.cjs"}\n' "$1" \
    > "$work/modules/$1/dist/module.json"
  printf '// stub\n' > "$work/modules/$1/dist/backend.cjs"
}

module "demo"
module "pow"
mkdir -p "$work/dist/modules/pow"
printf '// the faucet own compiled module\n' > "$work/dist/modules/pow/PoWModule.js"
printf '// the faucet own module registry\n' > "$work/dist/modules/ModuleManager.js"

( cd "$work" && node scripts/copy-modules.mjs dist/modules > "$work/out" 2>&1 )
status=$?

check "it refuses rather than overwriting"     test $status -ne 0
check "it says which name, and why"            grep -q "refusing to write dist/modules/pow" "$work/out"
check "the faucet's compiled module survives"  test -f "$work/dist/modules/pow/PoWModule.js"
check "and so does everything beside it"       test -f "$work/dist/modules/ModuleManager.js"

# without the collision the same call copies normally
rm -rf "$work/modules/pow"
( cd "$work" && node scripts/copy-modules.mjs dist/modules > "$work/out2" 2>&1 )
check "a module with a free name is copied"    test -f "$work/dist/modules/demo/module.json"
check "it says so"                             grep -q "copy-modules: demo -> dist/modules/demo" "$work/out2"
check "the faucet's own files are untouched"   test -f "$work/dist/modules/ModuleManager.js"

# un-ship removes a package this build no longer produces - and nothing else
rm -rf "$work/modules/demo"
( cd "$work" && node scripts/copy-modules.mjs dist/modules > "$work/out3" 2>&1 )
check "the package it stopped producing goes"  test ! -d "$work/dist/modules/demo"
check "it says what it removed"                grep -q "removed a previous build's copy of: demo" "$work/out3"
check "the faucet's own modules are not 'gone'" test -f "$work/dist/modules/pow/PoWModule.js"

if [ "$fails" -eq 0 ]; then
  echo "copy-modules: all checks passed"
else
  echo "copy-modules: $fails check(s) failed"
  exit 1
fi
