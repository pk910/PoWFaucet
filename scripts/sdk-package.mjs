// Writes the package manifest for `@powfaucet/sdk` into `sdk-dist/` after `tsc -p tsconfig.sdk.json`.
//
// The package is what a module builds against: the declarations of the SDK surface, the module
// contract types and the testing surface, plus `MODULE_API_VERSION`. At run time the faucet injects
// its own live objects for `@powfaucet/sdk` and `@powfaucet/sdk/module`, so nothing here runs inside a
// faucet; the compiled javascript is published so a module's own tests can import the testing surface
// from an installed faucet, and its version is the faucet's, because the surface is the faucet's.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "sdk-dist");
const server = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

fs.writeFileSync(path.join(out, "package.json"), JSON.stringify({
  name: "@powfaucet/sdk",
  version: server.version,
  description: "The surface a PoWFaucet module builds against: module contract, server SDK types, testing surface",
  type: "module",
  exports: {
    ".": { types: "./sdk/index.d.ts", default: "./sdk/index.js" },
    "./module": { types: "./sdk/modulePackage.d.ts", default: "./sdk/modulePackage.js" },
    "./testing": { types: "./testing/index.d.ts", default: "./testing/index.js" },
  },
  // the compiled surface re-exports the faucet's own classes, which import these
  peerDependencies: { "@powfaucet/server": server.version },
  peerDependenciesMeta: { "@powfaucet/server": { optional: true } },
  license: server.license,
  repository: server.repository,
  publishConfig: { access: "public" },
}, null, 2) + "\n");

fs.writeFileSync(path.join(out, "README.md"), [
  "# @powfaucet/sdk",
  "",
  "What a [PoWFaucet](https://github.com/pk910/PoWFaucet) module builds against.",
  "",
  "- `@powfaucet/sdk` - the server surface a module's backend uses (`BaseModule`, `ModuleHookAction`,",
  "  `ServiceManager`, sessions, config, ...). Declare it as a webpack **external**: at run time the",
  "  faucet injects its own live objects.",
  "- `@powfaucet/sdk/module` - the module contract: `IModulePackage`, `IFaucetSdk`, `IModuleManifest`,",
  "  `MODULE_API_VERSION`.",
  "- `@powfaucet/sdk/testing` - the harness a module's specs boot a real faucet with.",
  "",
  "The version is the faucet's: a module built against `@powfaucet/sdk@" + server.version + "` runs on",
  "`@powfaucet/server@" + server.version + "`. See `docs/modules.md` in the faucet repository.",
  "",
].join("\n"));
console.log("sdk-dist/package.json: @powfaucet/sdk " + server.version);
