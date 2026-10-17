import 'mocha';
import { expect } from 'chai';
import type { Browser, BrowserContext, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, TEST_TARGET_ADDR } from './harness.js';

/** The mining picture: the inlined svg by default, the png when motion is unwanted or switched off. */
describe("browser: progress animation", function() {
  this.timeout(60000);
  let browser: Browser | null = null;
  let skipReason: string | null = null;
  let fixture: IFaucetFixture | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  before(async () => {
    ({ browser, skipReason } = await launchBrowser());
  });
  after(async () => {
    if(browser)
      await browser.close();
  });
  afterEach(async () => {
    if(page) { await page.close(); page = null; }
    if(context) { await context.close(); context = null; }
    if(fixture) { await fixture.dispose(); fixture = null; }
  });

  async function startMining(p: Page) {
    await openFaucet(p, fixture);
    await p.getByPlaceholder(/ETH address/).fill(TEST_TARGET_ADDR);
    await p.getByRole("button", { name: "Start Mining" }).click();
    await p.waitForURL(/#\/mine\//, { timeout: 30000 });
    await p.getByText("Your mining reward").waitFor({ timeout: 30000 });
  }

  async function picture(p: Page) {
    return p.evaluate(() => ({
      svg: !!document.querySelector(".pow-status-image svg.pf-progress"),
      frames: document.querySelectorAll(".pow-status-image svg.pf-progress g").length,
      still: !!document.querySelector(".pow-status-image img.pow-progress-static"),
      gif: !!document.querySelector(".pow-status-image img.pow-progress-gif"),
      stored: localStorage.getItem("powMinerDisableGif"),
    }));
  }

  it("shows the inlined svg animation by default", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await startMining(page);
    await page.locator(".pow-status-image svg.pf-progress").waitFor({ timeout: 30000 });

    let shown = await picture(page);
    expect(shown.svg).to.equal(true);
    expect(shown.frames).to.equal(12, "twelve frame groups");
    expect(shown.still).to.equal(false);
    expect(shown.gif).to.equal(false, "the gif is only the fallback");
    expect(shown.stored).to.equal(null);
    // the frames really take turns
    let visible = await page.evaluate(() => new Promise<number[]>((resolve) => {
      let seen: number[] = [];
      let groups = Array.from(document.querySelectorAll(".pow-status-image svg.pf-progress g"));
      let tick = () => {
        let idx = groups.findIndex((g) => getComputedStyle(g).opacity === "1");
        if(seen.indexOf(idx) === -1) seen.push(idx);
        if(seen.length >= 3) resolve(seen); else setTimeout(tick, 45);
      };
      tick();
      setTimeout(() => resolve(seen), 3000);
    }));
    expect(visible.length).to.be.at.least(3, "the animation does not advance: " + JSON.stringify(visible));
  });

  it("holds the first frame when the system asks for reduced motion", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    context = await browser.newContext({ reducedMotion: "reduce" });
    page = await context.newPage();
    await startMining(page);
    await page.locator(".pow-status-image svg.pf-progress").waitFor({ timeout: 30000 });

    // the svg's own media rule: no animation, frame 0 visible
    let frames = await page.evaluate(() => Array.from(document.querySelectorAll(".pow-status-image svg.pf-progress g")).map((g) => ({
      animation: getComputedStyle(g).animationName,
      opacity: getComputedStyle(g).opacity,
    })));
    expect(frames.every((f) => f.animation === "none")).to.equal(true, "the frames still animate under reduced motion");
    expect(frames[0].opacity).to.equal("1", "the first frame is not the one shown");
    expect(frames.slice(1).every((f) => f.opacity === "0")).to.equal(true, "more than one frame is visible");
  });

  it("the button switches to the still picture, remembers it, and back", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await startMining(page);
    await page.locator(".pow-status-image svg.pf-progress").waitFor({ timeout: 30000 });

    await page.getByRole("button", { name: "Stop the animation for better performance" }).click();
    let shown = await picture(page);
    expect(shown.still).to.equal(true, "no still picture after the click");
    expect(shown.svg).to.equal(false);
    expect(shown.stored).to.equal("true", "the choice is not remembered");

    await page.reload({ waitUntil: "load" });
    await page.getByText("Your mining reward").waitFor({ timeout: 30000 });
    shown = await picture(page);
    expect(shown.still).to.equal(true, "the choice did not survive a reload");

    await page.getByRole("button", { name: "Play the animation" }).click();
    await page.locator(".pow-status-image svg.pf-progress").waitFor({ timeout: 30000 });
    shown = await picture(page);
    expect(shown.svg).to.equal(true);
    expect(shown.stored).to.equal(null, "the choice is not cleared");
  });
});
