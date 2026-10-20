import 'mocha';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, REPO_ROOT, startMiningSession } from './harness.js';

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

  it("primary buttons are white on the accent blue", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await openFaucet(page, fixture, "/status");
    let refresh = page.getByRole("button", { name: "Refresh" });
    await refresh.waitFor();
    let colors = await refresh.evaluate((el) => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    expect(colors.background).to.equal("rgb(42, 120, 214)");
    expect(colors.color).to.equal("rgb(255, 255, 255)", "black text on the primary button");
  });

  it("places the footer line under the card", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture);

    let layout = await page.evaluate(() => {
      let card = document.querySelector(".faucet-container").getBoundingClientRect();
      let footer = document.querySelector(".faucet-page .faucet-footer").getBoundingClientRect();
      return { cardBottom: card.bottom, footerTop: footer.top, footerBottom: footer.bottom, docHeight: document.documentElement.scrollHeight };
    });
    expect(layout.footerTop).to.be.at.least(layout.cardBottom, "the footer is inside the card");
    expect(layout.footerBottom).to.be.at.most(layout.docHeight, "the footer hangs out of the page");
  });

  it("every info callout opens inside the faucet and moves nothing, even when the page fits the window exactly", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({
      configure: (config) => {
        config.modules["voucher"] = { enabled: true, voucherLabel: "Voucher code", infoHtml: "<b>Vouchers</b><br>Codes from the event desk." } as any;
        config.modules["authenticatoor"] = { enabled: true, authUrl: "http://127.0.0.1:9/auth", audience: "x", infoHtml: "<b>Login</b><br>Optional, gives a boost." } as any;
        config.modules["ticket-proof"] = { enabled: true, infoHtml: "<b>Ticket</b><br>Log in with your event ticket." } as any;
      },
    });
    page = await browser.newPage({ viewport: { width: 700, height: 900 } });
    await openFaucet(page, fixture);
    // a window the page fits into exactly: any overflow an overlay adds would bring a scrollbar
    let docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 700, height: docHeight });
    await page.waitForTimeout(200);

    let icons = page.locator(".faucet-page .info-icon, .faucet-page .auth-info-icon, .faucet-page .ticketproof-info-icon, .faucet-page .zupass-info-icon");
    let count = await icons.count();
    expect(count).to.be.at.least(3, "the login area's info icons are missing");

    for(let idx = 0; idx < count; idx++) {
      await page.mouse.move(5, 5);
      await page.waitForTimeout(300);
      let before = await page.evaluate(() => ({
        cardTop: document.querySelector(".faucet-container").getBoundingClientRect().top,
        docHeight: document.documentElement.scrollHeight,
        docWidth: document.documentElement.scrollWidth,
      }));
      await icons.nth(idx).hover();
      let overlay = page.locator(".faucet-page .tooltip, .faucet-page .popover");
      await overlay.first().waitFor({ timeout: 10000 });
      let shown = await page.evaluate(() => {
        let overlay = document.querySelector(".faucet-page .tooltip, .faucet-page .popover");
        return {
          cardTop: document.querySelector(".faucet-container").getBoundingClientRect().top,
          docHeight: document.documentElement.scrollHeight,
          docWidth: document.documentElement.scrollWidth,
          position: getComputedStyle(overlay).position,
          text: overlay.textContent,
          outsideFaucet: document.body.querySelectorAll(":scope > .tooltip, :scope > .popover").length,
        };
      });
      expect(shown.text.length, "callout " + idx + " is empty").to.be.greaterThan(0);
      expect(shown.position).to.equal("fixed", "callout " + idx + " takes part in the layout");
      expect(shown.outsideFaucet).to.equal(0, "callout " + idx + " landed outside the faucet");
      expect(shown.docHeight).to.equal(before.docHeight, "callout " + idx + " made the document taller");
      expect(shown.docWidth).to.equal(before.docWidth, "callout " + idx + " made the document wider");
      expect(shown.cardTop).to.equal(before.cardTop, "callout " + idx + " moved the card");
    }
  });

  it("the mining page shows the stat tiles, the key/value rows and the live pill", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    // the pill reads "Reconnecting" until the socket is open; the helper waits for that
    await startMiningSession(page, fixture);

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
