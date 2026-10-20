import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, closeDialog, dropWebsockets, IFaucetFixture, launchBrowser, miningPill, openFaucet, startMiningSession, waitForShare } from './harness.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';

/**
 * What happens to a mining session besides the straight run to the claim: the connection drops
 * and comes back, the user changes the worker count, stops with too little to claim, the faucet
 * kills the session, the session runs out of time, and the page is opened for a session that
 * does not exist.
 */
describe("browser: mining session", function() {
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

  it("shows the lost connection and recovers when the socket comes back", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.stack || ("" + err)));
    let sessionId = await startMiningSession(page, fixture);
    let stopButton = page.getByRole("button", { name: /^Stop Mining/ });
    expect(await stopButton.isEnabled()).to.equal(true, "the stop button is disabled while connected");

    // the faucet drops the socket, the way a network outage does
    expect(dropWebsockets()).to.be.at.least(1, "no websocket to drop");
    await miningPill(page, "Reconnecting").waitFor({ timeout: 15000 });
    await page.getByText("Connection to faucet server has been lost").waitFor({ timeout: 15000 });
    expect(await stopButton.isEnabled()).to.equal(false, "the stop button is enabled without a connection");
    expect(page.url()).to.contain("#/mine/" + sessionId, "the page left the mining route");

    // the client reconnects after 5 to 10 seconds; the page is live again
    await miningPill(page, "Mining").waitFor({ timeout: 30000 });
    await page.getByText("Connection to faucet server has been lost").waitFor({ state: "hidden", timeout: 15000 });
    await stopButton.waitFor();
    expect(await stopButton.isEnabled()).to.equal(true, "the stop button stayed disabled after the reconnect");
    expect(page.url()).to.contain("#/mine/" + sessionId, "the reconnect changed the route");
    let session = ServiceManager.GetService(SessionManager).getSession(sessionId);
    expect(session.getSessionStatus()).to.equal("running", "the session is no longer running after the reconnect");
    expect(pageErrors, "javascript errors on the page: " + pageErrors.join("; ")).to.have.length(0);
  });

  it("changes the worker count with the two buttons, never below one", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await startMiningSession(page, fixture);

    let workers = page.locator(".faucet-page .pow-worker-controls");
    let target = async () => {
      let text = await workers.locator("b").textContent();
      let match = /^(\d+) \/ (\d+)$/.exec(text.trim());
      expect(match, "the workers row reads '" + text + "', not 'running / wanted'").to.not.equal(null);
      return { running: parseInt(match[1]), wanted: parseInt(match[2]) };
    };
    let more = page.getByRole("button", { name: "More workers" });
    let fewer = page.getByRole("button", { name: "Fewer workers" });

    // the default is the machine's core count, which may already be the maximum of 32
    let initial = await target();
    expect(initial.wanted).to.be.at.least(1);
    if(initial.wanted > 1) {
      await fewer.click();
      expect((await target()).wanted).to.equal(initial.wanted - 1, "- did not remove a worker");
      await more.click();
      expect((await target()).wanted).to.equal(initial.wanted, "+ did not add the worker again");
    }
    else {
      await more.click();
      expect((await target()).wanted).to.equal(2, "+ did not add a worker");
      await fewer.click();
      expect((await target()).wanted).to.equal(1, "- did not remove the worker again");
    }

    // down to the one worker that always stays
    for(let i = 0; i < 40 && await fewer.isEnabled(); i++)
      await fewer.click();
    expect((await target()).wanted).to.equal(1, "the count did not stop at one");
    expect(await fewer.isEnabled()).to.equal(false, "- is still enabled at one worker");
    expect(await more.isEnabled()).to.equal(true, "+ is disabled at one worker");
    // the miner follows: one worker left running
    let seen: string[] = [];
    let deadline = Date.now() + 20000;
    while(Date.now() < deadline) {
      let text = (await workers.locator("b").textContent()).trim();
      if(seen[seen.length - 1] !== text)
        seen.push(text);
      if(text === "1 / 1")
        break;
      await page.waitForTimeout(500);
    }
    expect(seen[seen.length - 1]).to.equal("1 / 1", "the running count did not follow the setting; the row read: " + seen.join(" -> "));
  });

  it("asks before stopping with a balance below the minimum claim, and keeps mining on 'Continue'", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({
      configure: (config) => {
        // one share (0.01) is worth less than the minimum claim
        config.minDropAmount = 50000000000000000; // 0.05 TEST
      },
    });
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);
    await waitForShare(sessionId);

    // the caption stays the plain one: nothing to claim yet
    let stopButton = page.getByRole("button", { name: "Stop Mining", exact: true });
    await stopButton.waitFor();
    expect(await page.getByRole("button", { name: "Stop Mining & Claim Rewards" }).count()).to.equal(0, "the claim caption is shown below the minimum");
    await stopButton.click();

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 10000 });
    expect(await dialog.innerText()).to.contain("Mining balance too low");
    expect(await dialog.innerText()).to.contain("The minimum allowed amount is 0.05 TEST");
    await dialog.getByRole("button", { name: "Continue mining" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
    expect(page.url()).to.contain("#/mine/" + sessionId, "'Continue mining' left the mining page");
    expect(ServiceManager.GetService(SessionManager).getSession(sessionId).getSessionStatus()).to.equal("running", "'Continue mining' closed the session");

    // the second time the user means it: the session ends without a claim
    await stopButton.click();
    await dialog.waitFor({ timeout: 10000 });
    await dialog.getByRole("button", { name: "Stop mining" }).click();
    await page.waitForURL(new RegExp("#/details/" + sessionId), { timeout: 30000 });
    await page.getByRole("heading", { name: "Session details" }).waitFor({ timeout: 30000 });
    let body = await page.locator("body").textContent();
    expect(body).to.contain("Failed", "a session closed below the minimum is not shown as failed");
    expect(body).to.contain("AMOUNT_TOO_LOW", "the reason is missing from the details");
  });

  it("tells the user when the faucet killed the session and leads to the details", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);

    // the faucet fails the session (a restriction, a detection rule); the mining client is killed
    let session = ServiceManager.GetService(SessionManager).getSession(sessionId);
    await session.setSessionFailed("TEST_KILL", "killed by the test");

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 15000 });
    let text = await dialog.innerText();
    expect(text).to.contain("Session error");
    expect(text).to.contain("CLIENT_KILLED");
    expect(text).to.contain("session failed");
    await dialog.getByRole("button", { name: "View Details" }).click();
    await page.waitForURL(new RegExp("#/details/" + sessionId), { timeout: 30000 });
    await page.getByRole("heading", { name: "Session details" }).waitFor({ timeout: 30000 });
    let body = await page.locator("body").textContent();
    expect(body).to.contain("Failed");
    expect(body).to.contain("killed by the test", "the failure reason is missing from the details");
  });

  it("goes to the front page when the user closes the kill dialog", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);
    await ServiceManager.GetService(SessionManager).getSession(sessionId).setSessionFailed("TEST_KILL", "killed by the test");

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 15000 });
    await closeDialog(dialog);
    await page.waitForURL(/\/#\/?$/, { timeout: 30000 });
    await page.getByRole("button", { name: "Start Mining" }).waitFor({ timeout: 30000 });
    expect(await page.getByRole("dialog").count()).to.equal(0, "a dialog is still open on the front page");
  });

  it("ends the session when its time is up and goes to the claim page", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({
      configure: (config) => {
        // the client stops the session itself a few seconds before the faucet would
        (config.modules["pow"] as any).powSessionTimeout = 25;
      },
    });
    page = await browser.newPage();
    let sessionId = await startMiningSession(page, fixture);
    await waitForShare(sessionId, 15000);
    expect(await page.getByText("Remaining session time").count()).to.equal(1);

    await page.waitForURL(new RegExp("#/claim/" + sessionId), { timeout: 40000 });
    await page.getByText("Claim your rewards").waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Claim Rewards" }).waitFor({ timeout: 30000 });
    expect(await page.locator(".faucet-page .pf-pill", { hasText: "Claimable" }).count()).to.equal(1, "the claim page pill is missing");
  });

  it("explains a mining page for a session the faucet does not know", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture, "/mine/00000000-0000-0000-0000-000000000000");

    await page.getByText(/Can't mine for this session/).waitFor({ timeout: 30000 });
    let details = page.getByRole("link", { name: "Session Details" });
    expect(await details.count()).to.equal(1, "no link to the details");
    await details.click();
    await page.waitForURL(/#\/details\/00000000-0000-0000-0000-000000000000/, { timeout: 30000 });
    await page.getByText(/Could not load session details/).waitFor({ timeout: 30000 });
  });

  it("fits a phone while mining without horizontal scrolling", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await startMiningSession(page, fixture);

    let widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).to.be.at.most(widths.client, "the mining page scrolls sideways on a phone");
  });
});
