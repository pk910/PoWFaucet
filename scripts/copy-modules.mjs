#!/usr/bin/env node
//
// copy-modules.mjs <target> - put every built module where the loader looks for it.
//
// The loader's first source is `<program dir>/modules/` (PLAN_MODULE_SPLIT §4), which is `dist/modules/`
// for a raw build and `bundle/modules/` for the bundled one. A module's own build produces
// `modules/<name>/dist/` in exactly the installed layout, so this is a copy and nothing more - no
// rewriting, no filtering, no per-module knowledge here. If a module's dist is not the installed layout
// then that is the module's build to fix, and `check-modules` is what says so.
//
// A module with no `dist/` is skipped with a line rather than an error: that is a source tree nobody has
// built yet, which is a state and not a fault (the same distinction the loader draws for a missing
// backend).
import * as fs from "node:fs";
import * as path from "node:path";

let target = process.argv[2];
if(!target) {
  console.error("usage: copy-modules.mjs <target dir>   (e.g. dist/modules or bundle/modules)");
  process.exit(2);
}

let root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let source = path.join(root, "modules");
if(!fs.existsSync(source)) {
  console.log("copy-modules: no modules/ directory, nothing to copy");
  process.exit(0);
}

let out = path.resolve(root, target);
fs.mkdirSync(out, { recursive: true });

// A module this build no longer produces must stop being shipped: the copy left in `dist/modules/`
// by an earlier build is a package the loader still finds and still loads, so a build that turns a
// module off would not turn it off until someone deleted the tree by hand. Only a name this source
// tree has is ever removed, so anything else under the target - a fixture, an operator's own copy -
// is left alone.
let copied = 0, skipped = [], dropped = [];
function unship(name) {
  let to = path.join(out, name);
  if(!fs.existsSync(to))
    return;
  // only a package, for the same reason as above: in a raw build this directory is shared with the
  // faucet's own compiled modules, and "the build no longer produces this" must never mean "delete
  // whatever has that name"
  if(!fs.existsSync(path.join(to, "module.json")))
    return;
  fs.rmSync(to, { recursive: true, force: true });
  dropped.push(name);
}

for(let name of fs.readdirSync(source).sort()) {
  let dist = path.join(source, name, "dist");
  if(!fs.existsSync(dist)) {
    skipped.push(name);
    unship(name);
    continue;
  }
  // The manifest is what makes a directory a module; a dist without one would be copied into place
  // and then silently ignored by the loader, which is worse than saying so here.
  if(!fs.existsSync(path.join(dist, "module.json"))) {
    skipped.push(name + " (dist has no module.json)");
    unship(name);
    continue;
  }
  let to = path.join(out, name);
  /**
   * Never write over - or remove - something that is not a module package.
   *
   * For a raw `dist` build the target is `dist/modules/`, which is *also* where the faucet's own
   * compiled `src/modules/**` lives: `dist/modules/pow/`, `dist/modules/captcha/` and
   * `ModuleManager.js` sit right beside an installed `dist/modules/<name>/`. The loader is fine with
   * that - a package is a directory with a `module.json`, and the faucet's own directories have none
   * - but a module *named* `pow` would land on top of the faucet's compiled PoW module here, and the
   * un-ship path below would delete it. That is a build step overwriting the program it is building.
   */
  if(fs.existsSync(to) && !fs.existsSync(path.join(to, "module.json"))) {
    console.error("copy-modules: refusing to write " + path.relative(root, to) + ": it exists and is" +
      " not a module package (no module.json). A module may not be named after something already in" +
      " the target - in a raw build that includes the faucet's own compiled modules.");
    process.exit(1);
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(dist, to, { recursive: true });
  console.log("copy-modules: " + name + " -> " + path.relative(root, to));
  copied++;
}
/**
 * And a package in the target that no source tree provides at all.
 *
 * `unship` above only sees names the source still has, so a module *deleted* from the repository
 * stayed installed in every build afterwards - the target is a build output, and a build output that
 * keeps what the build no longer makes is how a removed module goes on loading. Only directories that
 * are packages are considered, so the faucet's own compiled modules beside them are never candidates.
 */
let sourceNames = new Set(fs.readdirSync(source));
for(let name of fs.readdirSync(out).sort()) {
  let dir = path.join(out, name);
  if(sourceNames.has(name) || !fs.existsSync(path.join(dir, "module.json")))
    continue;
  fs.rmSync(dir, { recursive: true, force: true });
  dropped.push(name);
}

if(skipped.length > 0)
  console.log("copy-modules: not built, skipped: " + skipped.join(", "));
if(dropped.length > 0)
  console.log("copy-modules: removed a previous build's copy of: " + dropped.join(", "));
if(copied === 0)
  console.log("copy-modules: nothing copied (no module has been built yet)");
