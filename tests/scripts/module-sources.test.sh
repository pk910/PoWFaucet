#!/usr/bin/env bash
#
# One loader rule, five places a package can come from - checked against real builds.
#
# `tests/loader/ModuleLoader.spec.ts` covers the rule with a stubbed filesystem, which is where the
# ordering and the error paths belong. What it cannot cover is the thing that actually breaks: a
# package is found relative to the *running entry*, and that entry is `dist/app.js` in a checkout,
# `bundle/powfaucet.cjs` in a bundle, and a snapshot inside a `pkg` executable where `require`,
# static serving and `exec` all need a path on real disk. Those three are different filesystems, so
# they get checked by running them:
#
#   (a) `<program dir>/modules/`   - dist/modules/echo, and bundle/modules/echo for the bundle
#   (b) `<datadir>/modules/`       - what an operator drops in
#   (c) `modulePaths:`             - what the config points at, and it shadows (a) and says so
#   (d) the executable            - extracted once to `<datadir>/modules-cache/<name>-<version>/`,
#                                   loaded from there, the engine binary executable and executed,
#                                   and the second start reuses the cache instead of extracting again,
#                                   and a faucet started from it serves `/modules/echo/module.js`
#
# The fixture is `tests/fixtures/echo`, whose "engine binary" is a shell script that prints a line -
# so "the binary is usable from where the loader resolved it" is a check and not a hope.
#
# Usage: bash tests/scripts/module-sources.test.sh [--no-pkg]
#
# The executable case needs `pkg` and a cached node base binary. It is never skipped quietly: with
# no cached base binary the script fails and says what to run, and `--no-pkg` prints NOT RUN in the
# summary so the run can never be read as full coverage.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fixture="$here/tests/fixtures/echo"
run_pkg=1
[ "${1:-}" = "--no-pkg" ] && run_pkg=0
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
says()    { grep -qF "$2" "$1"; }         # says <file> <literal>
says_not() { ! grep -qF "$2" "$1"; }

# The fixture loaded exactly once, whatever else this tree has installed.
#
# These checks used to read "1 module(s) loaded", which was true only while the repository's own
# module put nothing loadable in `dist/modules`. It does now, so the total says nothing about
# the fixture - and a count that changes with an unrelated build is a check that will be edited to
# whatever makes it pass. What matters here is that the copy under test loaded, once.
loaded_once() {   # loaded_once <file> <dir>
  test "$(grep -c "^echo 1\.0\.0 .* from $2$" "$1")" = "1"
}

for needed in "$here/dist/app.js" "$here/bundle/powfaucet.cjs"; do
  if [ ! -f "$needed" ]; then
    echo "module-sources: $needed is missing - run 'npm run build && npm run bundle' first"
    exit 2
  fi
done

work="$(mktemp -d)"
faucet_pid=""
cleanup() {
  [ -n "$faucet_pid" ] && kill "$faucet_pid" 2> /dev/null
  rm -rf "$work" "$here/dist/modules/echo" "$here/bundle/modules/echo"
}
trap cleanup EXIT

# a copy of the fixture, never a copy *into* a previous copy: `cp -r src dst` nests when dst exists,
# and a package with a package inside it is a confusing way to fail
place() {   # place <target dir>
  rm -rf "$1"
  mkdir -p "$(dirname "$1")"
  cp -r "$fixture" "$1"
}

# check-modules with a datadir of its own: the repository's faucet-config.yaml and its modules stay
# out of it, and the only package in the picture is the one the case is about. The command comes last
# because the entry is `node <script>` for a checkout and the executable itself for a `pkg` build -
# running the executable through `node` looks like it works and loads nothing.
check_modules() {   # check_modules <datadir> <outfile> <command...>
  local data="$1" out="$2"; shift 2
  ( cd "$data" && timeout 180 "$@" check-modules > "$out" 2>&1 )
}

echo "(a) <program dir>/modules/ - dist/"
data="$work/a"; mkdir -p "$data"
place "$here/dist/modules/echo"
check_modules "$data" "$work/a.out" node "$here/dist/app.js"
check "loads it from dist/modules/echo"   says "$work/a.out" "from $here/dist/modules/echo"
check "registers the module key"          says "$work/a.out" "module echo -> EchoModule"
check "registers the worker key"          says "$work/a.out" "worker echo-worker -> EchoWorker"
check "serves the client from /modules/"  says "$work/a.out" "script /modules/echo/module.js"
check "and exactly once"                  loaded_once "$work/a.out" "$here/dist/modules/echo"

echo "(b) <datadir>/modules/"
data="$work/b"; mkdir -p "$data"
rm -rf "$here/dist/modules/echo"
place "$data/modules/echo"
check_modules "$data" "$work/b.out" node "$here/dist/app.js"
check "loads it from the datadir"         says "$work/b.out" "from $data/modules/echo"
check "and exactly once"                  loaded_once "$work/b.out" "$data/modules/echo"

echo "(c) modulePaths:, which shadows (a)"
data="$work/c"; mkdir -p "$data"
place "$work/elsewhere/echo"
place "$here/dist/modules/echo"
# `version: 2` is not decoration: a yaml without it is a V1 config and the loader refuses the file
printf 'version: 2\nmodulePaths:\n  - %s\n' "$work/elsewhere/echo" > "$data/faucet-config.yaml"
check_modules "$data" "$work/c.out" node "$here/dist/app.js"
check "loads the configured copy"         says "$work/c.out" "from $work/elsewhere/echo"
check "says it shadows the dist copy"     says "$work/c.out" "shadows 1 other copy/copies: $here/dist/modules/echo (the program directory)"
check "and exactly once, not twice"       loaded_once "$work/c.out" "$work/elsewhere/echo"
rm -rf "$here/dist/modules/echo"

echo "a config this build cannot read, which is the other reason a module goes missing"
data="$work/v1"; mkdir -p "$data"
printf 'version: 1\n' > "$data/faucet-config.yaml"
check_modules "$data" "$work/v1.out" node "$here/dist/app.js"
check "says so in one line"               says "$work/v1.out" "cannot read the faucet config"
check "and does not print a stack trace"  says_not "$work/v1.out" "UnhandledPromiseRejection"

echo "(d) the bundle's own program directory"
data="$work/d"; mkdir -p "$data"
place "$here/bundle/modules/echo"
check_modules "$data" "$work/d.out" node "$here/bundle/powfaucet.cjs"
check "loads it from bundle/modules/echo" says "$work/d.out" "from $here/bundle/modules/echo"
check "and exactly once"                  loaded_once "$work/d.out" "$here/bundle/modules/echo"

echo "(e) the all-in-one executable"
if [ "$run_pkg" = "0" ]; then
  pkg_state="NOT RUN (--no-pkg)"
elif [ ! -d "$here/node_modules/pkg" ]; then
  echo "  FAIL  pkg is a devDependency and is not installed - run 'npm install'"
  fails=$((fails + 1))
  pkg_state="FAILED"
elif ! ls "$HOME/.pkg-cache"/*/fetched-v18*-linux-x64 > /dev/null 2>&1; then
  echo "  FAIL  no cached node base binary for node18-linux-x64 in ~/.pkg-cache; pkg would fetch one,"
  echo "        and a test does not go to the network. Run 'npx pkg . --targets node18-linux-x64"
  echo "        --output /tmp/powfaucet' once, or pass --no-pkg to run only the on-disk cases."
  fails=$((fails + 1))
  pkg_state="FAILED"
else
  # the fixture has to be in the bundle when the snapshot is taken: `pkg.assets` carries
  # `bundle/modules/**/*`, and that list is read at build time
  place "$here/bundle/modules/echo"
  data="$work/e"; mkdir -p "$data"
  ( cd "$here" && timeout 900 npx pkg . --targets node18-linux-x64 --output "$work/powfaucet" > "$work/pkg.log" 2>&1 )
  if [ ! -x "$work/powfaucet" ]; then
    echo "  FAIL  pkg did not produce an executable; its output:"
    tail -20 "$work/pkg.log" | sed 's/^/        /'
    fails=$((fails + 1))
    pkg_state="FAILED"
  else
    check_modules "$data" "$work/e.out" "$work/powfaucet"
    cache="$data/modules-cache/echo-1.0.0"
    check "extracts it out of the snapshot"   says "$work/e.out" "extracted from the executable to $cache"
    check "loads it from the extracted copy"  says "$work/e.out" "from $cache"
    check "the client asset came out too"     test -f "$cache/client/module.js"
    check "the binary is executable"          test -x "$cache/bin/echo-linux-amd64"
    check "and it runs from there"            test "$("$cache/bin/echo-linux-amd64")" = "echo-module-binary"

    # Second start: the cache is the point, so it must not pay the extraction again. Both halves are
    # one check on purpose - "did not extract" is true of a start that loaded nothing at all.
    check_modules "$data" "$work/e2.out" "$work/powfaucet"
    reused() { says "$work/e2.out" "from $cache" && says_not "$work/e2.out" "extracted from the executable"; }
    check "the second start reuses the cache" reused

    # And the half that `check-modules` cannot show: a running faucet serving the module's client
    # out of the snapshot. Nothing is dropped in the datadir's `modules/`, so the extracted cache is
    # the only place the file can have come from. No chain is needed - the rpc is refused and the
    # faucet says so and carries on - and nothing here talks to the network.
    serve="$work/serve"; mkdir -p "$serve"
    # A port nothing answers on, checked rather than assumed: a faucet left running by an earlier run
    # answers this url too, and the case would pass against somebody else's process.
    port=""
    for candidate in 18732 18742 18752 18762; do
      if ! (exec 3<> /dev/tcp/127.0.0.1/$candidate) 2> /dev/null; then
        port="$candidate"
        break
      fi
    done
    if [ -z "$port" ]; then
      echo "  FAIL  every candidate port is in use; something is already listening"
      fails=$((fails + 1))
    fi
    cat > "$serve/faucet-config.yaml" <<YML
version: 2
faucetTitle: "module-sources serve check"
serverPort: $port
database:
  driver: "sqlite"
  file: "faucet-store.db"
ethRpcHost: "http://127.0.0.1:1"
ethChainId: 1337
ethWalletKey: "0000000000000000000000000000000000000000000000000000000000000001"
modules: {}
YML
    # `exec` so the recorded pid is the faucet itself: killing a subshell that wrapped it leaves the
    # faucet listening, and the next run then measures that one
    ( cd "$serve" && exec "$work/powfaucet" > "$serve/faucet.log" 2>&1 ) &
    faucet_pid="$!"
    code=""
    for _ in $(seq 1 40); do
      code="$(curl -s -o "$serve/module.js" -w '%{http_code}' "http://127.0.0.1:$port/modules/echo/module.js" 2> /dev/null)"
      [ "$code" = "200" ] && break
      sleep 1
    done
    check "the running executable serves it"  test "$code" = "200"
    check "byte for byte what it packaged"    cmp -s "$serve/module.js" "$fixture/client/module.js"
    check "and it came out of the snapshot"   says "$serve/faucet.log" "loaded module 'echo' v1.0.0 from $serve/modules-cache/echo-1.0.0"
    if ! says "$serve/faucet.log" "loaded module 'echo' v1.0.0 from $serve/modules-cache/echo-1.0.0"; then
      echo "        what the faucet said about modules (expected the cache at $serve/modules-cache/echo-1.0.0):"
      grep -i 'module' "$serve/faucet.log" | sed 's/^/        /'
    fi
    kill "$faucet_pid" 2> /dev/null
    wait "$faucet_pid" 2> /dev/null
    faucet_pid=""

    pkg_state="ran"
  fi
fi

echo "module-sources: executable case $pkg_state"
if [ "$fails" -eq 0 ]; then
  echo "module-sources: all checks passed"
else
  echo "module-sources: $fails check(s) failed"
  exit 1
fi
