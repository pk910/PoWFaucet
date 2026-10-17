import 'mocha';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { REPO_ROOT } from './harness.js';

/**
 * A tooltip or popover in the client goes through FaucetOverlay, which renders it into the
 * faucet's own element (the stylesheet is scoped to it) and positions it with Popper's fixed
 * strategy (so it never moves the page). This spec is what keeps the next info icon from
 * reaching for react-bootstrap's OverlayTrigger directly; it needs no browser.
 */
describe("client overlays go through FaucetOverlay", () => {
  const CLIENT_SRC = path.join(REPO_ROOT, "faucet-client", "src");
  const THE_ONE_PLACE = path.join("components", "shared", "FaucetOverlay.tsx");

  function sourceFiles(dir: string): string[] {
    let files: string[] = [];
    for(let entry of fs.readdirSync(dir, { withFileTypes: true })) {
      let full = path.join(dir, entry.name);
      if(entry.isDirectory())
        files.push(...sourceFiles(full));
      else if(/\.(ts|tsx)$/.test(entry.name))
        files.push(full);
    }
    return files;
  }

  it("no component imports OverlayTrigger from react-bootstrap itself", () => {
    let offenders: string[] = [];
    for(let file of sourceFiles(CLIENT_SRC)) {
      let rel = path.relative(CLIENT_SRC, file);
      if(rel === THE_ONE_PLACE)
        continue;
      let source = fs.readFileSync(file, "utf8");
      if(/\bOverlayTrigger\b/.test(source))
        offenders.push(rel);
    }
    expect(offenders).to.deep.equal([], "these files use OverlayTrigger directly; use FaucetOverlay from components/shared/FaucetOverlay");
  });

  it("FaucetOverlay pins the container and the fixed strategy", () => {
    let source = fs.readFileSync(path.join(CLIENT_SRC, THE_ONE_PLACE), "utf8");
    expect(source).to.match(/container=\{/, "the overlay renders into the faucet's element");
    expect(source).to.match(/strategy: "fixed"/, "the overlay uses Popper's fixed strategy");
  });
});
