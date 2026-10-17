import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, sessionIdFromUrl, TEST_TARGET_ADDR } from './harness.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';

/**
 * The whole user journey in one browser: start a session, mine until a share came in, stop, claim,
 * see the transaction confirmed. The hashers are the real wasm workers in chromium; the pow module
 * runs with a difficulty that makes a share a matter of seconds.
 */
describe("browser: mining flow", function() {
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

  it("starts a session, mines a share, stops, claims and sees the confirmation", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.stack || ("" + err)));
    await openFaucet(page, fixture);

    // start
    await page.getByPlaceholder(/ETH address/).fill(TEST_TARGET_ADDR);
    await page.getByRole("button", { name: "Start Mining" }).click();
    await page.waitForURL(/#\/mine\//, { timeout: 30000 });
    let sessionId = sessionIdFromUrl(page.url());
    expect(sessionId, "no session id in the mining url").to.be.a("string");

    // mining page: the status block and the stop button
    await page.getByText("Your mining reward").waitFor({ timeout: 30000 });
    expect(await page.getByText(TEST_TARGET_ADDR).count()).to.be.greaterThan(0, "target address not shown");
    let stopButton = page.getByRole("button", { name: /^Stop Mining/ });
    await stopButton.waitFor();

    // the workers hash and a share arrives: the server-side balance moves above zero
    let sessionManager = ServiceManager.GetService(SessionManager);
    await page.waitForFunction(() => {
      let hashrate = Array.from(document.querySelectorAll("*")).map((el) => el.textContent || "").find((t) => /\d+(\.\d+)? H\/s/.test(t) && !/^0 H\/s/.test(t.trim()));
      return !!hashrate;
    }, null, { timeout: 60000 });
    let balanceDeadline = Date.now() + 60000;
    while(Date.now() < balanceDeadline) {
      let session = sessionManager.getSession(sessionId);
      if(session && session.getDropAmount() > 0n)
        break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(sessionManager.getSession(sessionId).getDropAmount() > 0n).to.equal(true, "no share rewarded within a minute");

    // the stop button learned about the balance
    await page.getByRole("button", { name: "Stop Mining & Claim Rewards" }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Stop Mining & Claim Rewards" }).click();
    await page.waitForURL(/#\/claim\//, { timeout: 30000 });

    // claim page
    await page.getByText("Claim Rewards").first().waitFor({ timeout: 30000 });
    expect(await page.getByText(TEST_TARGET_ADDR).count()).to.be.greaterThan(0, "wallet not shown on the claim page");
    await page.getByRole("button", { name: "Claim Rewards" }).click();

    // the stubbed chain confirms at once
    await page.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 30000 });
    let explorerLink = page.locator('a[href="https://explorer.test/tx/0x' + "ab".repeat(32) + '"]');
    let statusJson = await page.evaluate(async (id) => (await fetch("/api/getSessionStatus?session=" + id)).text(), sessionId);
    expect(await explorerLink.count()).to.equal(1, "tx hash should link to the explorer; session status: " + statusJson);
    expect(await explorerLink.innerText()).to.equal("0x" + "ab".repeat(32), "the link text is the tx hash");

    expect(pageErrors, "javascript errors on the page: " + pageErrors.join("; ")).to.have.length(0);
  });

  it("refuses an invalid address with a dialog and stays on the front page", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture);

    await page.getByPlaceholder(/ETH address/).fill("not-an-address");
    await page.getByRole("button", { name: "Start Mining" }).click();

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 30000 });
    expect(await dialog.innerText()).to.contain("Could not start session");
    expect(page.url()).to.not.match(/#\/mine\//);
  });
});
