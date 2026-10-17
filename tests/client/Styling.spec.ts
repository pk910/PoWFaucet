import 'mocha';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, REPO_ROOT } from './harness.js';

/**
 * What the stylesheet promises: the faucet looks the way it should, and a page that embeds it
 * keeps its own looks. The second half is the one that matters for other sites.
 */
describe("browser: styling and embedding", function() {
  this.timeout(60000);
  let browser: Browser | null = null;
  let skipReason: string | null = null;
  let fixture: IFaucetFixture | null = null;
  let page: Page | null = null;
  let temporaryFiles: string[] = [];

  before(async () => {
    ({ browser, skipReason } = await launchBrowser());
  });
  after(async () => {
    if(browser)
      await browser.close();
  });
  afterEach(async () => {
    if(page) { await page.close(); page = null; }
    if(fixture) { await fixture.dispose(); fixture = null; }
    temporaryFiles.forEach((file) => { try { fs.unlinkSync(file); } catch(ex) { /* gone */ } });
    temporaryFiles = [];
  });

  /** a host page with its own opinions, with or without the faucet embedded in it */
  function writeHostPage(name: string, withFaucet: boolean): string {
    let file = path.join(REPO_ROOT, "static", name);
    fs.writeFileSync(file, [
      "<!doctype html><html><head><meta charset='utf-8'>",
      "<style>",
      "body { margin: 40px; font-family: Georgia, serif; font-size: 19px; line-height: 1.2; color: rgb(10, 20, 30); }",
      "h1 { font-size: 40px; margin: 5px 0; font-weight: 400; }",
      ".host-box { box-sizing: content-box; width: 100px; padding: 10px; border: 3px solid red; }",
      "a { color: rgb(200, 0, 0); text-decoration: underline; }",
      "</style></head><body>",
      "<h1 id='host-h1'>Host heading</h1>",
      "<p id='host-p'>Host paragraph with <a id='host-a' href='#'>a link</a></p>",
      "<div id='host-box' class='host-box'>box</div>",
      withFaucet ? "<div class='faucet-wrapper'><div class='faucet-container faucet-bootstrap'><div class='pow-faucet' data-powfaucet='default'></div></div></div>" : "",
      withFaucet ? "<link rel='stylesheet' href='/css/powfaucet.css'><script src='/js/powfaucet.js'></script>" : "",
      "</body></html>",
    ].join("\n"));
    temporaryFiles.push(file);
    return "/" + name;
  }

  /** the computed values of the host page's own elements that a leaking stylesheet would change */
  async function hostStyles(p: Page) {
    return p.evaluate(() => {
      let css = (sel: string, prop: string) => getComputedStyle(document.querySelector(sel)).getPropertyValue(prop);
      return {
        bodyMargin: css("body", "margin-top"),
        bodyFont: css("body", "font-family"),
        bodyFontSize: css("body", "font-size"),
        bodyLineHeight: css("body", "line-height"),
        bodyColor: css("body", "color"),
        h1FontSize: css("#host-h1", "font-size"),
        h1Margin: css("#host-h1", "margin-top"),
        h1Weight: css("#host-h1", "font-weight"),
        boxSizing: css("#host-box", "box-sizing"),
        boxWidth: (document.querySelector("#host-box") as HTMLElement).offsetWidth,
        linkColor: css("#host-a", "color"),
        linkDecoration: css("#host-a", "text-decoration-line"),
        rootBsPrimary: getComputedStyle(document.documentElement).getPropertyValue("--bs-primary"),
      };
    });
  }

  it("embedded in another page, it leaves that page's styles alone", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let plain = writeHostPage("embed-test-plain.html", false);
    let embedded = writeHostPage("embed-test-faucet.html", true);

    page = await browser.newPage();
    await page.goto(fixture.baseUrl + plain, { waitUntil: "load" });
    let before = await hostStyles(page);

    await page.goto(fixture.baseUrl + embedded, { waitUntil: "load" });
    await page.waitForSelector(".faucet-page", { timeout: 30000 });
    let after = await hostStyles(page);

    expect(after).to.deep.equal(before, "the faucet changed the host page's own elements");
    expect(after.rootBsPrimary).to.equal("", "bootstrap variables leaked onto the host's :root");
    expect(after.boxWidth).to.equal(126, "the host's content-box sizing was overridden");

    // and the faucet inside is still the faucet
    let faucet = await page.evaluate(() => {
      let button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start Mining");
      return {
        buttonBg: getComputedStyle(button).backgroundColor,
        buttonHeight: button.getBoundingClientRect().height,
        pageBsPrimary: getComputedStyle(document.querySelector(".faucet-page")).getPropertyValue("--bs-primary").trim(),
        font: getComputedStyle(document.querySelector(".faucet-page h1")).fontFamily,
      };
    });
    expect(faucet.buttonBg).to.equal("rgb(25, 135, 84)", "the start button lost its color inside the host page");
    expect(faucet.buttonHeight).to.be.at.least(44, "the start button lost its size inside the host page");
    expect(faucet.pageBsPrimary).to.not.equal("", "bootstrap variables are missing on the faucet page");
    expect(faucet.font).to.not.contain("Georgia", "the faucet inherited the host's font");
  });

  it("draws the card, the input and the buttons the way the design says", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({
      configure: (config) => {
        config.modules["github"] = { enabled: true, appClientId: "x", appSecret: "y", authTimeout: 86400 } as any;
      },
    });
    page = await browser.newPage();
    await openFaucet(page, fixture);

    let styles = await page.evaluate(() => {
      let css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
      let container = document.querySelector(".faucet-container");
      let title = document.querySelector(".faucet-page h1");
      let meta = document.querySelector(".faucet-page .faucet-meta");
      let input = document.querySelector(".faucet-page input.form-control") as HTMLElement;
      let button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start Mining");
      let tile = document.querySelector(".faucet-page .faucet-auth") as HTMLElement;
      return {
        cardRadius: css(container, "border-top-left-radius"),
        cardBorder: css(container, "border-top-width"),
        cardBg: css(container, "background-color"),
        titleWeight: css(title, "font-weight"),
        titleAlign: css(title, "text-align"),
        metaText: meta ? meta.textContent : null,
        inputHeight: input.getBoundingClientRect().height,
        inputRadius: css(input, "border-top-left-radius"),
        buttonHeight: button.getBoundingClientRect().height,
        buttonRadius: css(button, "border-top-left-radius"),
        buttonWidth: button.getBoundingClientRect().width,
        cardInnerWidth: container.clientWidth,
        tileBg: tile ? css(tile, "background-color") : null,
        tileRadius: tile ? css(tile, "border-top-left-radius") : null,
        iconSize: tile ? (tile.querySelector(".auth-icon") as HTMLElement).getBoundingClientRect().width : null,
      };
    });
    expect(styles.cardRadius).to.equal("20px");
    expect(styles.cardBorder).to.equal("1px");
    expect(styles.cardBg).to.equal("rgb(255, 255, 255)");
    expect(styles.titleWeight).to.equal("700");
    expect(styles.titleAlign).to.equal("left");
    expect(styles.metaText).to.equal("Up to 1 TEST per session · minimum claim 0.001 TEST");
    expect(styles.inputHeight).to.be.at.least(44);
    expect(styles.inputRadius).to.equal("12px");
    expect(styles.buttonHeight).to.be.at.least(44);
    expect(styles.buttonRadius).to.equal("12px");
    expect(styles.buttonWidth).to.be.at.least(400, "the start button spans the card");
    expect(styles.tileBg).to.equal("rgb(248, 249, 250)", "the login tile has the surface-2 ground");
    expect(styles.tileRadius).to.equal("10px");
    expect(styles.iconSize).to.equal(36);
  });

  it("the mining page shows the stat tiles, the key/value rows and the live pill", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture);
    await page.getByPlaceholder(/ETH address/).fill("0x0000000000000000000000000000000000001337");
    await page.getByRole("button", { name: "Start Mining" }).click();
    await page.waitForURL(/#\/mine\//, { timeout: 30000 });
    await page.getByText("Your mining reward").waitFor({ timeout: 30000 });

    let layout = await page.evaluate(() => {
      let tiles = Array.from(document.querySelectorAll(".faucet-page .pf-stat"));
      let rows = Array.from(document.querySelectorAll(".faucet-page .pf-kv")).map((r) => r.querySelector("span").textContent);
      let pill = document.querySelector(".faucet-page .pf-pill");
      let stop = Array.from(document.querySelectorAll("button")).find((b) => /^Stop Mining/.test(b.textContent.trim()));
      return {
        tiles: tiles.map((t) => t.querySelector("span").textContent),
        tileTop: tiles.map((t) => Math.round(t.getBoundingClientRect().top)),
        rows: rows,
        pill: pill ? pill.textContent : null,
        pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
        stopBg: stop ? getComputedStyle(stop).backgroundColor : null,
        workerButtons: document.querySelectorAll(".faucet-page .pow-worker-controls button").length,
      };
    });
    expect(layout.tiles).to.deep.equal(["Your mining reward", "Current hashrate"]);
    expect(layout.tileTop[0]).to.equal(layout.tileTop[1], "the two stat tiles sit side by side");
    expect(layout.rows).to.deep.equal(["Target address", "Workers", "Minimum claim", "Maximum claim", "Remaining session time", "Total shares", "Avg. reward per hour"]);
    expect(layout.pill).to.equal("Mining");
    expect(layout.pillBg).to.equal("rgb(232, 245, 238)");
    expect(layout.stopBg).to.equal("rgb(220, 53, 69)");
    expect(layout.workerButtons).to.equal(2);
  });
});
