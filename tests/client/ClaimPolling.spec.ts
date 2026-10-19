import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';

/**
 * How the claim page learns that its claim is done: the notification socket says so, and the page
 * asks for the status once. It must not ask while its own transaction is pending, whatever the
 * receipts of later claims do, and a refused answer must not replace the page with an error.
 */
describe("browser: claim status polling", function() {
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

  let confirmedTx = (txHash: string) => ({
    status: true,
    block: 4242,
    fee: 21000000000000n,
    receipt: { status: true, transactionHash: txHash, blockNumber: 4242, logs: [] } as any,
  });

  /** a claim page with its status requests counted and its script errors collected */
  async function claimPage(): Promise<{ page: Page, statusRequests: () => number, pageErrors: string[] }> {
    let page = await browser.newPage();
    pages.push(page);
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.stack || ("" + err)));
    let statusRequests = 0;
    page.on("request", (req) => {
      if(req.url().includes("/api/getSessionStatus"))
        statusRequests++;
    });
    return { page, statusRequests: () => statusRequests, pageErrors };
  }

  it("asks for its status once its own claim settles, not when a later claim's receipt is observed first", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false, configure: (config) => { config.ethMaxPending = 10; } });
    let first = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });
    let later = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });

    // the first claim's receipt is held back, the later one's is there at once
    let releaseFirst: () => void = () => {};
    fixture.stubs["EthWalletManager.sendClaimTx"].callsFake(async (claimTx: any) => {
      let isFirst = claimTx.session === first.sessionId;
      let txHash = "0x" + (isFirst ? "aa" : "bb").repeat(32);
      claimTx.claim.txHash = txHash;
      claimTx.claim.txNonce = isFirst ? 1 : 2;
      return {
        txHash: txHash,
        txPromise: isFirst ? new Promise((resolve) => { releaseFirst = () => resolve(confirmedTx(txHash)); }) : Promise.resolve(confirmedTx(txHash)),
      };
    });

    let firstPage = await claimPage();
    await openFaucet(firstPage.page, fixture, "/claim/" + first.sessionId);
    await firstPage.page.getByRole("button", { name: "Claim Rewards" }).click();
    await firstPage.page.getByText(/Your claim is queued/).waitFor({ timeout: 30000 });

    let laterPage = await claimPage();
    await openFaucet(laterPage.page, fixture, "/claim/" + later.sessionId);
    await laterPage.page.getByRole("button", { name: "Claim Rewards" }).click();
    // the later claim is confirmed right away and its page hears that over the socket
    await laterPage.page.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 15000 });

    // the first claim is still pending: its page has nothing to ask
    let requestsBefore = firstPage.statusRequests();
    await firstPage.page.waitForTimeout(4000);
    expect(firstPage.statusRequests() - requestsBefore).to.equal(0, "status requests while the own claim was pending");
    expect(await firstPage.page.getByText(/Your claim is queued/).count()).to.equal(1, "the pending claim's page left its status");

    // a rate limit's html answer to the one request after the settlement keeps the page on its status
    let refusals = 1;
    await firstPage.page.route(/\/api\/getSessionStatus/, (route) => {
      if(refusals-- > 0)
        return route.fulfill({ status: 429, contentType: "text/html", body: "<html><body><h1>429 Too Many Requests</h1></body></html>" });
      return route.continue();
    });
    let refusedRequest = firstPage.page.waitForRequest(/\/api\/getSessionStatus/, { timeout: 15000 });
    requestsBefore = firstPage.statusRequests();
    releaseFirst();
    await refusedRequest;
    await firstPage.page.waitForTimeout(500);
    expect(await firstPage.page.getByText(/No claimable reward found/).count()).to.equal(0, "the refused request replaced the page with an error");
    expect(await firstPage.page.getByText(/Your claim is queued/).count()).to.equal(1, "the refused request took the status off the page");

    await firstPage.page.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 15000 });
    expect(firstPage.statusRequests() - requestsBefore).to.equal(2, "status requests after the settlement: the refused one and its retry");
    expect(firstPage.pageErrors, "javascript errors on the first page: " + firstPage.pageErrors.join("; ")).to.have.length(0);
    expect(laterPage.pageErrors, "javascript errors on the later page: " + laterPage.pageErrors.join("; ")).to.have.length(0);
  });
});
