# Modules

A module is a package the faucet loads at startup: server classes, worker classes and client
assets, built in its own repository against the faucet's SDK. The faucet finds it, loads it,
serves its client files and knows nothing about what it does.

## Where modules are found

A module is a directory with a `module.json`. The faucet looks in three places, in this order,
and a later copy of the same name shadows an earlier one (the log says which):

| order | place | what it is |
|---|---|---|
| 1 | `<program dir>/modules/` | what the build ships (`dist/modules/`, `bundle/modules/`) |
| 2 | `<datadir>/modules/` | what the operator installed |
| 3 | every `modulePaths:` entry in `faucet-config.yaml` | anything else; relative paths resolve against the datadir |

Installing a module is unpacking it into `<datadir>/modules/` (or pointing `modulePaths:` at
it) and restarting the faucet. A module's settings go under `modules:` in the config, keyed by
the module key its manifest registers, exactly like a built-in module.

Inside the all-in-one executable (`pkg`) nothing in the snapshot can be `require`d or executed,
so each bundled module is copied once to `<datadir>/modules-cache/<name>-<version>/` on first
start and used from there. A version change makes a new directory; nothing else is special.

## The manifest

```json
{
  "name": "solver",
  "version": "1.0.0",
  "apiVersion": 1,
  "backend": "backend.cjs",
  "modules": { "solver": "SolverModule" },
  "workers": { "solver-worker": "SolverWorker" },
  "client": { "script": "client/module.js", "css": "client/module.css" }
}
```

- `name` becomes a url path segment: lowercase letters, digits and dashes.
- `apiVersion` must equal the faucet's `MODULE_API_VERSION`; otherwise the module is skipped
  with an error and the faucet carries on.
- `modules` and `workers` map a registry key to an export of `backend.cjs`. Worker keys are
  global; a module may not take a key the faucet already has.
- `client` is optional. The files are served from the module's `client/` directory at
  `/modules/<name>/<file>?v=<version>` and put into the index page automatically: the stylesheet
  in `<head>`, the script at the end of `<body>` with `defer`, before the faucet's first render.
  Files with a `.gz`/`.br` sibling are served pre-compressed.

Anything else a module needs - a native binary, its own version checks, its own build
identity - lives inside the module and is the module's business. `sdk.moduleDir` is the
directory it was loaded from.

## The backend

`backend.cjs` is a bundle that default-exports:

```js
module.exports = {
  async init(sdk) {
    sdk.registerModule("solver", SolverModule);   // a BaseModule subclass
    sdk.registerWorker("solver-worker", SolverWorker);
    sdk.log("info", "loaded from " + sdk.moduleDir);
  },
};
```

It builds against `@powfaucet/sdk` (`npm run sdk` emits `sdk-dist/` with the types) and must
declare it as an **external**: at runtime `@powfaucet/sdk` and `@powfaucet/sdk/module` resolve
to the faucet's own live objects for the duration of the `require`, so the module's classes
extend the same `BaseModule`, register with the same `ServiceManager` and hook the same
`ModuleHookAction`s the faucet runs. A bundled copy would register hooks nobody calls.

```js
// webpack.config.js of a backend
{ target: "node", output: { filename: "backend.cjs", libraryTarget: "commonjs2" },
  externals: { "@powfaucet/sdk": "commonjs @powfaucet/sdk",
               "@powfaucet/sdk/module": "commonjs @powfaucet/sdk/module" } }
```

The SDK carries what a module cannot write for itself: the module base class and hook actions,
the service manager, sessions (`getSession(id)` - a module reads the session it was told about
and cannot enumerate, create or end one), the config object and `resolveRelativePath`, the
http server (for a module that serves its own websocket endpoint), the stats log, the faucet's
address/ip hashing, and a few utilities. `SessionManager`, the database and the PoW module are
not on it.

A worker class runs in a forked child that loads no modules; it is told the backend file and
the export name and loads exactly that, through the same injected SDK.

## The client

`client/module.js` runs before the faucet renders. `window.PoWFaucet` gives it React, ReactDOM
and the JSX runtime (declare them as externals - `checkSingletons` throws if a module bundled
its own), its config block, and four ways in:

**Slots** - a component into a named place on the core's pages. Every slot renders its
components with the same props (`sessionId`, `faucetConfig`, `moduleConfig`, `moduleName`,
`navigate`); several modules may fill one slot, in `order`.

```js
var sdk = window.PoWFaucet;
sdk.ui.registerSlot("front.info", InfoBox, { module: "solver", order: 10 });
```

| slot | where |
|---|---|
| `header`, `footer` | above and below every page |
| `front.info`, `front.after` | the front page, above the start form and below the description |
| `mining.status` | the mining page, below the miner and the panel |
| `claim.before`, `claim.after` | the claim page |
| `details.section`, `status.section`, `queue.section` | the session details, faucet status and queue pages |

**Panels and routes** - `ui.registerPanel("mining", Panel, { module, captions, modes })` owns the
mining page for a session started for this module (its start modes appear on the front page and
go to the server as `params.mode`); `ui.registerRoute(path, Page, { dev })` adds a page, mounted
only under `?dev=1` when `dev` is set.

**Hooks** - logic without UI, at the page's named moments. Handlers run in `prio` order and may
be async; a `session.start` or `session.claim` handler may throw to refuse, and the page shows
the message.

```js
sdk.hooks.on("session.start", (evt) => { evt.input.params = { ...evt.input.params, ref: myRef }; });
sdk.hooks.on("session.balance", (evt) => console.log(evt.sessionId, evt.balance));
```

`config`, `page`, `session.start`, `session.started`, `session.restored`, `session.balance`,
`session.claim`, `session.claimed`, `session.closed`, `mining.start`, `mining.stop`.

**Session and api** - `sdk.session.current()` / `sdk.session.subscribe(fn)` give the session the
page is on; `sdk.api.get("solver/state", { session })` and `sdk.api.post("solver/act", body)` go
through the faucet's own transport to an endpoint the module registered on the server side:

```js
// backend.cjs
sdk.registerApiEndpoint("solver/state", async (req, url, body) => ({ ok: true }));
```

`POST /api/startSession { addr, module: "<key>", params: {...} }` starts a session *for* a
module: the faucet checks that the module is enabled and that `params` is a flat map of
strings, stores them under the module's own session-data key, and reads nothing else - the
module's `SessionStart` hook decides.

## Building and testing

`modules/` is git-ignored: a module is its own repository dropped into it, with its own
dependencies, build and tests. `npm run build` and `npm run bundle` copy each module's built
`dist/` into `dist/modules/` or `bundle/modules/`; the executable carries `bundle/modules/**`
and extracts it at first start. `npm test` is the platform's gate and stops at the platform.

`powfaucet check-modules [--dry-run] [dir|tarball ...]` loads modules and prints what each one
registered, without starting a faucet. `tests/fixtures/echo/` is a complete minimal module and
`tests/scripts/module-sources.test.sh` runs it through every place a package can come from,
including the executable.

Behind a reverse proxy, forward `/modules/` to the faucet - the block is in
`docs/sitecfg-nginx.conf` and `docs/sitecfg-apache2.conf`.
