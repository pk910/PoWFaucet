import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';

describe("browser: claim status polling", function() {
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

  let confirmedTx = (txHash: string) => ({
    status: true,
    block: 4242,
    fee: 21000000000000n,
    receipt: { status: true, transactionHash: txHash, blockNumber: 4242, logs: [] } as any,
  });

  it("polls at most once a second while a later claim's confirmation covers a pending one", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false });
    let pending = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });
    let later = await fixture.addSession({ status: FaucetSessionStatus.CLAIMABLE, remoteIP: "127.0.0.1" });

    let releasePending: () => void = () => {};
    fixture.stubs["EthWalletManager.sendClaimTx"].callsFake(async (claimTx: any) => {
      let isPending = claimTx.session === pending.sessionId;
      let txHash = "0x" + (isPending ? "aa" : "bb").repeat(32);
      claimTx.claim.txHash = txHash;
      claimTx.claim.txNonce = isPending ? 1 : 2;
      return {
        txHash: txHash,
        txPromise: isPending ? new Promise((resolve) => { releasePending = () => resolve(confirmedTx(txHash)); }) : Promise.resolve(confirmedTx(txHash)),
      };
    });

    page = await browser.newPage();
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.stack || ("" + err)));
    let statusRequests = 0;
    page.on("request", (req) => {
      if(req.url().includes("/api/getSessionStatus"))
        statusRequests++;
    });

    await openFaucet(page, fixture, "/claim/" + pending.sessionId);
    await page.getByRole("button", { name: "Claim Rewards" }).click();
    await page.waitForFunction(() => document.body.innerText.includes("Claim Transaction") || document.body.innerText.includes("queue"), null, { timeout: 30000 });

    let claimStatus = await page.evaluate(async (session) => {
      let rsp = await fetch("/api/claimReward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: session }),
      });
      return (await rsp.json()).status;
    }, later.sessionId);
    expect(claimStatus).to.equal("claiming");

    await page.waitForTimeout(3000);
    statusRequests = 0;
    await page.waitForTimeout(4000);
    expect(statusRequests).to.be.at.most(6, statusRequests + " status requests in 4 seconds");

    releasePending();
    await page.getByText(/Claim Transaction has been confirmed/).waitFor({ timeout: 30000 });
    expect(await page.getByText(/No claimable reward found/).count()).to.equal(0);
    expect(pageErrors, "javascript errors on the page: " + pageErrors.join("; ")).to.have.length(0);
  });
});
