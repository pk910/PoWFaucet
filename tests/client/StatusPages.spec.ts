import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, TEST_TARGET_ADDR } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';

describe("browser: status and details pages", function() {
  this.timeout(60000);
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

  it("status page lists sessions with hashed ids and ips", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({
      status: FaucetSessionStatus.RUNNING,
      data: { "pow.hashrate": 123.4, "cliver": "2.5.2" },
    });
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await openFaucet(page, fixture, "/status");

    await page.getByText("Active mining sessions").waitFor();
    let body = await page.locator("body").innerText();
    expect(body).to.contain("Running", "the session row is missing");
    expect(body).to.not.contain(session.sessionId, "the real session id leaked into the public status page");
    expect(body).to.not.contain("203.0.113.42", "the real ip leaked into the public status page");
    expect(body).to.contain(TEST_TARGET_ADDR, "the target address is part of the public row");
  });

  it("details page shows wallet, amount and status of a stored session", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await fixture.addSession({
      status: FaucetSessionStatus.FINISHED,
      dropAmount: "250000000000000000",
      claim: {
        claimIdx: 1,
        claimStatus: "confirmed",
        claimTime: Math.floor(Date.now() / 1000),
        txHash: "0x" + "ab".repeat(32),
        txBlock: 4242,
      } as any,
    });
    page = await browser.newPage();
    await openFaucet(page, fixture, "/details/" + session.sessionId);

    await page.getByRole("heading", { name: "Session Details" }).waitFor();
    let body = await page.locator("body").innerText();
    expect(body).to.contain(TEST_TARGET_ADDR, "wallet missing");
    expect(body).to.contain("0.25 TEST", "amount missing");
    expect(body).to.contain("Finished", "status badge missing");
    expect(body).to.contain("Confirmed", "tx status badge missing");
    expect(await page.locator('a[href="https://explorer.test/tx/0x' + "ab".repeat(32) + '"]').count()).to.equal(1, "tx hash should link to the explorer");
  });

  it("details page tells about an unknown session", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture, "/details/00000000-0000-0000-0000-000000000000");

    await page.getByText(/Could not load session details/).waitFor();
  });
});
