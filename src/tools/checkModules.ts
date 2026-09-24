import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { faucetConfig, loadFaucetConfig, resolveRelativePath } from "../config/FaucetConfig.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { ModuleLoader, moduleAssetUrl } from "../loader/ModuleLoader.js";

/**
 * `powfaucet check-modules [--dry-run] [dir|tarball ...]` - loads modules and
 * prints what each one registered.
 *
 * It exists for the packaged binary. Inside a `pkg` build the faucet runs out of a snapshot
 * filesystem, and a module does not: it is `require`d from the real disk at runtime, through
 * packaged - so CI runs this against the built binary, and an operator can run it to find
 * out why their module is not showing up without starting a faucet.
 *
 * With paths given it checks exactly those and does not read a config, so it needs neither
 * a config file nor an RPC. With none it uses the faucet's own config. A `.tar.gz` is
 * unpacked to a temporary directory first, so what is checked is the archive an operator
 * would actually install rather than the build directory it came from.
 *
 * `--dry-run` validates and loads the backend without registering anything. That is the
 * only way to check a module whose module key this build already has compiled in - which is
 * a module whose key this build still carries - because registering a taken key is
 * refused, correctly, and the refusal would say nothing about the package.
 */
export async function checkModules(args: string[]): Promise<void> {
  let dryRun = args.indexOf("--dry-run") !== -1;
  let paths = args.filter((arg) => !arg.startsWith("--"));
  let unpacked: string[] = [];

  let resolved = paths.map((entry) => {
    if(!/\.t(ar\.)?gz$/.test(entry))
      return entry;
    let dir = unpack(entry);
    unpacked.push(dir);
    console.log("unpacked " + path.basename(entry) + " -> " + dir);
    return dir;
  });

  let datadir: string;
  let extra: string[];
  if(resolved.length > 0) {
    // no config, no datadir scan: exactly what was asked for
    datadir = null;
    extra = resolved;
  }
  else {
    // Without paths this reads the faucet's config, and the config is what names the datadir and
    // `modulePaths:` - so a config this build cannot read leaves nothing to check. Someone running
    // this is asking why their module is missing, and an unhandled rejection's stack trace is not an
    // answer to that question.
    try {
      loadFaucetConfig();
    } catch(ex) {
      console.log("cannot read the faucet config: " + (ex?.message || ex));
      process.exit(2);
    }
    datadir = faucetConfig.appBasePath;
    extra = faucetConfig.modulePaths || [];
  }

  let loader = ServiceManager.GetService(ModuleLoader);
  let loaded = dryRun ? await loader.inspectAll(datadir, extra) : await loader.loadAll(datadir, extra);

  loaded.forEach((entry) => {
    console.log(entry.manifest.name + " " + entry.manifest.version +
      " (api " + entry.manifest.apiVersion + ") from " + entry.dir);
    Object.keys(entry.manifest.modules || {}).forEach((key) => {
      console.log("  module " + key + " -> " + entry.manifest.modules[key] +
        (dryRun ? " (not registered: --dry-run)" : ""));
    });
    Object.keys(entry.manifest.workers || {}).forEach((key) => {
      console.log("  worker " + key + " -> " + entry.manifest.workers[key] +
        (dryRun ? " (not registered: --dry-run)" : ""));
    });
    ["script", "css"].forEach((asset) => {
      let url = moduleAssetUrl(entry.manifest, entry.manifest.client?.[asset]);
      if(url)
        console.log("  " + asset + " " + url);
    });
  });

  console.log(loaded.length + " module(s) " + (dryRun ? "checked" : "loaded"));
  unpacked.forEach((dir) => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch(ex) { /* a temp dir */ }
  });
  if(resolved.length > 0 && loaded.length !== resolved.length) {
    // asked for specific modules and did not get them all: the errors are above this line
    console.log("expected " + resolved.length + ", so " + (resolved.length - loaded.length) + " failed");
    process.exit(1);
  }
}

/**
 * The archive's single module directory, in a temporary place.
 *
 * `tar` rather than a Node library: no new runtime dependency, and the release script writes
 * the archive with the same tool.
 */
function unpack(archive: string): string {
  let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-module-"));
  execFileSync("tar", ["xzf", path.resolve(archive), "-C", dir], { stdio: "inherit" });
  let entries = fs.readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((entry) => fs.statSync(entry).isDirectory());
  // a package holds one module directory; anything else is not one, and saying so here beats
  // a manifest-not-found three steps later
  if(entries.length !== 1)
    throw new Error(path.basename(archive) + " does not hold exactly one module directory");
  return entries[0];
}
