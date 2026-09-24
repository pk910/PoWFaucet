/**
 * The client half of the fixture module - what a real module's bundle does, minus anything to
 * draw: read the sdk off the global, check it is not a second copy of anything, register a view
 * factory under a name.
 *
 * It records what it saw *at the moment it ran*, because that is the property the ordering
 * test is about: the sdk already published, the faucet not yet rendered.
 */
(function() {
  var sdk = window.PoWFaucet;
  var record = {
    sawSdk: !!sdk,
    apiVersion: sdk ? sdk.apiVersion : null,
    version: sdk ? sdk.version : null,
    // null until the first render; a module that finds a page here ran too late to
    // register anything the first render would have picked up
    renderedBeforeMe: !!(sdk && sdk.page),
    singletons: null,
    registered: false,
    error: null,
  };
  try {
    // pass what a module bundle would have imported - here, the faucet's own, so the
    // report must come back clean
    record.singletons = sdk.checkSingletons({
      React: sdk.React,
      ReactDOM: sdk.ReactDOM,
    });
    // No view-layer registry on the sdk any more: it left the build with
    // its registry, and what the core offers a module is the slots below. A
    // module that draws something registers its view factory with its own
    // bundle's registry, exactly as a real module's `client/module.js` does.
    record.registered = true;

    // ...and the slots the core offers: a panel where the mining page puts
    // them, and a dev route. These are the calls a module's client makes, in the
    // same order, which is the point of the fixture - the core suite guards the
    // surface with nothing registered in the build.
    sdk.ui.registerPanel("mining", function(props) {
      return sdk.React.createElement("div", { className: "echo-plugin-panel" },
        "echo plugin panel for " + props.moduleName);
    });
    sdk.ui.registerRoute("/echoplain", function() {
      return sdk.React.createElement("div", { className: "echo-plugin-plain" },
        "echo plugin plain route");
    });
    sdk.ui.registerRoute("/echodev", function() {
      return sdk.React.createElement("div", { className: "echo-plugin-route" },
        "echo plugin dev route");
    }, { dev: true });
    // ...a slot on the front page and a hook on the config, the two generic ways in
    sdk.ui.registerSlot("front.info", function(props) {
      return sdk.React.createElement("div", { className: "echo-plugin-slot" },
        "echo slot on the front page for " + props.moduleName);
    }, { module: "echo", order: 5 });
    record.configHooks = 0;
    sdk.hooks.on("config", function(evt) { record.configHooks++; record.lastConfigHad = !!evt.config; }, { module: "echo" });
    record.slots = sdk.ui.getSlot("front.info").length;
    record.hookCount = sdk.hooks.count("config");
    record.panels = sdk.ui.getPanels("mining").length;
    record.routes = sdk.ui.getRoutes().map(function(route) { return route.path; });
    record.moduleConfig = sdk.config.module("echo") || null;
    record.devFlag = !!(sdk.flags && sdk.flags.dev);
  } catch(ex) {
    record.error = "" + ex;
  }
  window.__echoModuleLoaded = record;
})();
