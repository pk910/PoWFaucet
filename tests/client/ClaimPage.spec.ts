import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, closeDialog, IFaucetFixture, launchBrowser, openFaucet, sessionIdFromUrl, TEST_TARGET_ADDR } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';

/**
 * The claim page in every state it can be opened in: a faucet without mining that hands out the
 * full drop on request, a claim the faucet refuses, a session that failed, a reward that expired,
 * and the public queue while a claim is in it.
 */
describe("browser: claim page", function() {
  this.timeout(120000);
  let browser: Browser | null = null;
  let skipReason: string | null = null;
  let fixture: IFaucetFixture | null = null;
  let pages: Page[] = [];

  before(async () => {
    ({ browser, skipReason } = await launchBrowser());
  });
  after(async () => {
    if(browser)
      await browser.close();
  });
  afterEach(async () => {
    for(let page of pages)
      await page.close();
    pages = [];
    if(fixture) { await fixture.dispose(); fixture = null; }
  });

  async function newPage(options?: Parameters<Browser["newPage"]>[0]): Promise<Page> {
    let page = await browser.newPage(options);
    pages.push(page);
    return page;
  }

  it("hands out the full drop on request when there is nothing to mine, and leads back to the start", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false });
    let page = await newPage();
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.stack || ("" + err)));
    await openFaucet(page, fixture);

    await page.getByPlaceholder(/ETH address/).fill(TEST_TARGET_ADDR);
    await page.getByRole("button", { name: "Request Funds" }).click();
    await page.waitForURL(/#\/claim\//, { timeout: 30000 });
    let sessionId = sessionIdFromUrl(page.url());
    await page.getByText("Claim your rewards").waitFor({ timeout: 30000 });
    let body = await page.locator("body").textContent();
    expect(body).to.contain("1 TEST", "the reward is not the full drop");
    expect(body).to.contain(TEST_TARGET_ADDR, "the wallet is missing");
    expect(body).to.contain("Claim before", "the deadline row is missing");
    expect(await page.locator(".faucet-page .pf-pill", { hasText: "Claimable" }).count()).to.equal(1);

    await page.getByRole("button", { name: "Claim Rewards" }).click();
    await page.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 30000 });
    await page.getByText("Rewards sent").waitFor({ timeout: 30000 });
    expect(await page.locator(".faucet-page .pf-pill", { hasText: "Confirmed" }).count()).to.equal(1);
    expect(await page.evaluate(() => localStorage.getItem("powSessionStatus"))).to.equal(null, "a claimed session is still stored for a restore");

    await page.getByRole("button", { name: "Return to startpage" }).click();
    await page.getByRole("button", { name: "Request Funds" }).waitFor({ timeout: 30000 });
    expect(page.url()).to.not.contain("#/claim/" + sessionId);
    expect(pageErrors, "javascript errors on the page: " + pageErrors.join("; ")).to.have.length(0);
  });

  it("shows a refused claim in a dialog and keeps the claim form", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false });
    let session = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });
    let page = await newPage();
    // the faucet's answer to a claim it will not pay (a restriction, a blocked address)
    await page.route(/\/api\/claimReward/, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: session.sessionId, status: "failed", failedCode: "TEST_REFUSED", failedReason: "refused by the test" }),
    }));
    await openFaucet(page, fixture, "/claim/" + session.sessionId);
    await page.getByRole("button", { name: "Claim Rewards" }).click();

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 15000 });
    let text = await dialog.innerText();
    expect(text).to.contain("Claim failed");
    expect(text).to.contain("[TEST_REFUSED] refused by the test");
    await closeDialog(dialog);
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
    expect(await page.getByRole("button", { name: "Claim Rewards" }).count()).to.equal(1, "the claim form is gone after the refusal");
    expect(page.url()).to.contain("#/claim/" + session.sessionId);
  });

  it("shows why a failed session has nothing to claim", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({
      status: FaucetSessionStatus.FAILED,
      dropAmount: "0",
      data: { "failed.code": "IPINFO_RESTRICTION", "failed.reason": "mining client reconnected from another country" },
    });
    let page = await newPage();
    await openFaucet(page, fixture, "/claim/" + session.sessionId);

    await page.getByText(/Claim failed:/).waitFor({ timeout: 30000 });
    let body = await page.locator("body").textContent();
    expect(body).to.contain("mining client reconnected from another country");
    expect(body).to.contain("[IPINFO_RESTRICTION]");
    expect(await page.locator(".faucet-page .pf-pill", { hasText: "Failed" }).count()).to.equal(1);
    expect(await page.getByRole("button", { name: "Claim Rewards" }).count()).to.equal(0, "a failed session offers a claim button");
    await page.getByRole("button", { name: "Return to startpage" }).click();
    await page.getByRole("button", { name: "Start Mining" }).waitFor({ timeout: 30000 });
  });

  it("tells the user when the reward was not claimed in time", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ configure: (config) => { config.sessionTimeout = 60; } });
    // claimable, but started longer ago than the faucet keeps a claim open
    let session = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, startTime: Math.floor(Date.now() / 1000) - 90 });
    let page = await newPage();
    await openFaucet(page, fixture, "/claim/" + session.sessionId);

    let dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 30000 });
    let text = await dialog.innerText();
    expect(text).to.contain("Claim expired");
    expect(text).to.contain("0.5 TEST");
    await closeDialog(dialog);
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
    await page.getByText(/has not been claimed in time/).waitFor({ timeout: 30000 });
    expect(await page.getByRole("button", { name: "Claim Rewards" }).count()).to.equal(0, "an expired reward still offers a claim button");
  });

  it("lists a queued claim on the public queue page with a hashed session id", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false, configure: (config) => { config.ethMaxPending = 10; } });
    let session = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });

    // the transaction is sent but its receipt is held back: the claim stays pending
    let release: () => void = () => {};
    let txHash = "0x" + "cd".repeat(32);
    fixture.stubs["EthWalletManager.sendClaimTx"].callsFake(async (claimTx: any) => {
      claimTx.claim.txHash = txHash;
      claimTx.claim.txNonce = 1;
      return {
        txHash: txHash,
        txPromise: new Promise((resolve) => {
          release = () => resolve({ status: true, block: 4242, fee: 21000000000000n, receipt: { status: true, transactionHash: txHash, blockNumber: 4242, logs: [] } as any });
        }),
      };
    });

    let claimPage = await newPage();
    await openFaucet(claimPage, fixture, "/claim/" + session.sessionId);
    await claimPage.getByRole("button", { name: "Claim Rewards" }).click();
    await claimPage.getByText(/Your claim is queued/).waitFor({ timeout: 30000 });
    expect(await claimPage.locator(".faucet-page .pf-pill", { hasText: "Claiming" }).count()).to.equal(1);

    let queuePage = await newPage({ viewport: { width: 1400, height: 900 } });
    await openFaucet(queuePage, fixture, "/queue");
    await queuePage.getByText("Claim Transaction Queue").waitFor({ timeout: 30000 });
    // the queue is worked every 2 seconds: the row reads "Queued" until the transaction went out
    let row = queuePage.locator("table.status-sessions tbody tr").first();
    let rowText = "";
    for(let attempt = 0; attempt < 20; attempt++) {
      await row.waitFor({ timeout: 30000 });
      rowText = await row.innerText();
      if(rowText.includes("Pending"))
        break;
      await queuePage.waitForTimeout(1000);
      await queuePage.getByRole("button", { name: "Refresh" }).click();
    }
    expect(rowText).to.not.contain("No active claims");
    expect(rowText).to.contain(TEST_TARGET_ADDR, "the target is missing from the queue row");
    expect(rowText).to.contain("0.5 TEST", "the amount is missing from the queue row");
    expect(rowText).to.contain("Pending", "the claim is not shown as pending");
    expect(rowText).to.not.contain(session.sessionId, "the real session id is on the public queue page");
    expect(await row.locator('a[href="https://explorer.test/tx/' + txHash + '"]').count()).to.equal(1, "the tx hash does not link to the explorer");

    // the chain confirms; the claim page hears it over its socket
    release();
    await claimPage.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 30000 });
  });

  it("fits a phone without horizontal scrolling", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE });
    let page = await newPage({ viewport: { width: 390, height: 844 } });
    await openFaucet(page, fixture, "/claim/" + session.sessionId);
    await page.getByRole("button", { name: "Claim Rewards" }).waitFor({ timeout: 30000 });

    let widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).to.be.at.most(widths.client, "the claim page scrolls sideways on a phone");
  });
});
