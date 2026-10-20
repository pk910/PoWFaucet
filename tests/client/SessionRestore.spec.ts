import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, miningPill, openFaucet, startMiningSession, TEST_TARGET_ADDR } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';

/**
 * The front page remembers the visitor's last session (localStorage) and offers to pick it up:
 * a running one goes back to the mining page, a claimable one to the claim page, and "Start new
 * session" leaves the form. A reload of the mining page itself resumes without asking.
 */
describe("browser: session restore", function() {
  this.timeout(120000);
  let browser: Browser | null = null;
  let skipReason: string | null = null;
  let fixture: IFaucetFixture | null = null;
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
    if(fixture) { await fixture.dispose(); fixture = null; }
  });

  it("offers to continue a running session and returns to the mining page", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);
    expect(await page.evaluate(() => localStorage.getItem("powSessionStatus"))).to.not.equal(null, "the running session is not stored");

    // back on the front page, the way a closed tab and a new visit do it
    await openFaucet(page, fixture);
    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 30000 });
    let text = await dialog.innerText();
    expect(text).to.contain("Restore Session");
    expect(text).to.contain("Do you want to continue with your previous session?");
    expect(text).to.contain(TEST_TARGET_ADDR);
    expect(text).to.contain("Running");

    await dialog.getByRole("button", { name: "Continue Mining" }).click();
    await page.waitForURL(new RegExp("#/mine/" + sessionId), { timeout: 30000 });
    await page.getByText("Your mining reward").waitFor({ timeout: 30000 });
    await miningPill(page, "Mining").waitFor({ timeout: 30000 });
  });

  it("'Start new session' keeps the front page and the form", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await startMiningSession(page, fixture);

    await openFaucet(page, fixture);
    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 30000 });
    await dialog.getByRole("button", { name: "Start new session" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
    expect(page.url()).to.not.match(/#\/mine\//);
    expect(await page.getByPlaceholder(/ETH address/).count()).to.equal(1, "the address input is gone");
    expect(await page.getByRole("button", { name: "Start Mining" }).count()).to.equal(1, "the start button is gone");
  });

  it("offers to claim a stored session that turned claimable", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, dropAmount: "250000000000000000" });
    page = await browser.newPage();
    // what the client stores while a session runs
    await page.addInitScript((stored) => { localStorage.setItem("powSessionStatus", JSON.stringify(stored)); }, {
      v: 2, id: session.sessionId, time: session.startTime, addr: session.targetAddr, value: session.dropAmount,
    });
    await openFaucet(page, fixture);

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 30000 });
    let text = await dialog.innerText();
    expect(text).to.contain("Claimable");
    expect(text).to.contain("0.25 TEST");
    await dialog.getByRole("button", { name: "Claim Rewards" }).click();
    await page.waitForURL(new RegExp("#/claim/" + session.sessionId), { timeout: 30000 });
    await page.getByText("Claim your rewards").waitFor({ timeout: 30000 });
  });

  it("asks nothing for a stored session that is finished", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({ status: FaucetSessionStatus.FINISHED });
    page = await browser.newPage();
    await page.addInitScript((stored) => { localStorage.setItem("powSessionStatus", JSON.stringify(stored)); }, {
      v: 2, id: session.sessionId, time: session.startTime, addr: session.targetAddr, value: session.dropAmount,
    });
    await openFaucet(page, fixture);
    // give a dialog the time it would need to appear
    await page.waitForTimeout(1500);
    expect(await page.getByRole("dialog").count()).to.equal(0, "a finished session is offered for a restore");
  });

  it("resumes a running session on a reload of the mining page", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);

    await page.reload({ waitUntil: "load" });
    await page.getByText("Your mining reward").waitFor({ timeout: 30000 });
    await miningPill(page, "Mining").waitFor({ timeout: 30000 });
    expect(page.url()).to.contain("#/mine/" + sessionId);
    expect(await page.getByRole("dialog").count()).to.equal(0, "the mining page asked about restoring its own session");
    let stopButton = page.getByRole("button", { name: /^Stop Mining/ });
    await stopButton.waitFor();
    expect(await stopButton.isEnabled()).to.equal(true);
  });
});
