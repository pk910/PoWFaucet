import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, TEST_TARGET_ADDR } from './harness.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { sha256 } from '../../src/utils/CryptoUtils.js';

/** the operator's key for the booted faucet */
function operatorKey(): string {
  return sha256(faucetConfig.faucetSecret + "-unmasked");
}

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
    let body = await page.locator("body").textContent();
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

    await page.getByRole("heading", { name: "Session details" }).waitFor();
    let body = await page.locator("body").textContent();
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

  /** a session with everything a visitor leaves behind, and a restriction the faucet applied */
  async function addRichSession() {
    let now = Math.floor(Date.now() / 1000);
    return fixture.addSession({
      status: FaucetSessionStatus.FINISHED,
      // within the last hour, which is what the status list shows of finished sessions
      startTime: now - 600,
      dropAmount: "1904400000000000000",
      remoteIP: "198.51.100.7",
      data: {
        "cliver": "2.5.2",
        "close.time": now - 60,
        "pow.lastNonce": 5802,
        "pow.shareCount": 5802,
        "pow.preimage": "0x6e1c" + "00".repeat(28) + "a90f",
        "captcha.ident": "hc:3f9a-c21d",
        "ipinfo.data": { status: "success", country: "United States", countryCode: "US", city: "Ashburn", isp: "Amazon", as: "AS14618", proxy: false, hosting: true },
        "ipinfo.restriction.data": { reward: 60, messages: [], blocked: false },
        "passport.score": { score: 24.5, factor: 1.5 },
        "github.user": "pk910",
        "github.uid": 1234567,
        "reward.factors": [
          { factor: 1.5, module: "passport" },
          { factor: 0.8, module: "recurring-limits" },
          { factor: 0.6, module: "ipinfo", name: "hosting" },
        ],
      },
      claim: {
        claimIdx: 1,
        claimStatus: "confirmed",
        claimTime: now - 30,
        txHash: "0x" + "ab".repeat(32),
        txBlock: 4242,
      } as any,
    });
  }

  it("details page shows the session's own figures and nothing about the visitor", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await addRichSession();
    page = await browser.newPage();
    await openFaucet(page, fixture, "/details/" + session.sessionId);

    await page.getByRole("heading", { name: "Session details" }).waitFor();
    let body = await page.locator("body").textContent();
    expect(body).to.contain("Technical details");
    expect(body).to.contain("2.5.2", "client version missing");
    expect(body).to.contain("GitHub · pk910", "login missing");
    expect(body).to.contain("Passport score", "passport score missing");
    expect(body).to.not.contain("Operator data", "the operator block is on the public page");
    expect(body).to.not.contain("198.51.100.7", "the ip is on the public page");
    expect(body).to.not.contain("hc:3f9a", "the captcha ident is on the public page");
    expect(body).to.not.contain("Reward factors", "the factor list is on the public page although a restriction applied");
    expect(body).to.not.contain("recurring-limits", "a restriction is on the public page");
    expect(body).to.not.contain("60 %", "the restriction is on the public page");
  });

  it("details page adds the operator block with the key", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await addRichSession();
    page = await browser.newPage();
    await page.addInitScript((key) => { localStorage.setItem("powfaucet.operatorKey", key); }, operatorKey());
    await openFaucet(page, fixture, "/details/" + session.sessionId);

    await page.getByRole("heading", { name: "Operator data" }).waitFor();
    let body = await page.locator("body").textContent();
    expect(body).to.contain("198.51.100.7", "ip missing");
    expect(body).to.contain("Ashburn, US", "ip info missing");
    expect(body).to.contain("hosting", "the hosting flag is missing");
    expect(body).to.contain("60 %", "restriction missing");
    expect(body).to.contain("hc:3f9a-c21d", "captcha ident missing");
    expect(body).to.contain("1234567", "github uid missing");
    expect(body).to.contain("All reward factors");
    expect(body).to.contain("recurring-limits ×0.8");
    expect(body).to.contain("ipinfo/hosting ×0.6");
    expect(await page.locator("pre.session-json").isVisible()).to.equal(false, "raw json shown before asking");
    await page.getByRole("button", { name: "Show raw session JSON" }).click();
    await page.locator("pre.session-json").waitFor({ state: "visible" });
    expect(await page.locator("pre.session-json").innerText()).to.contain("pow.preimage");
  });

  it("status page with the key shows real ids and ips, no restriction pill without it", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    let session = await addRichSession();

    // an own context: the key must come back in a second tab of the same browser profile
    let context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    page = await context.newPage();
    await openFaucet(page, fixture, "/status");
    await page.getByText("Active mining sessions").waitFor();
    let publicBody = await page.locator("body").textContent();
    expect(publicBody).to.contain("Masked");
    expect(publicBody).to.not.contain(session.sessionId);
    expect(publicBody).to.not.contain("60 %", "the restriction pill is on the public list");
    expect(publicBody).to.not.contain("x1.5", "the factor pill is on the public list although a restriction applied");
    expect(await page.getByRole("link", { name: session.sessionId }).count()).to.equal(0);

    // the key goes into the field; the list reloads unmasked
    await page.getByLabel("Operator key").fill(operatorKey());
    await page.getByRole("button", { name: "Refresh" }).click();
    await page.getByText("Unmasked").waitFor();
    let body = await page.locator("body").textContent();
    expect(body).to.contain(session.sessionId, "the real id is missing");
    expect(body).to.contain("198.51.100.7", "the real ip is missing");
    expect(body).to.contain("60 %", "the restriction pill is missing");

    // the id links to the details page, and the details come unmasked too
    await page.getByRole("link", { name: session.sessionId }).click();
    await page.waitForURL(new RegExp("#/details/" + session.sessionId));
    await page.getByRole("heading", { name: "Operator data" }).waitFor();

    // the key is kept by the browser, not the tab: after this tab is gone, a fresh one opens the
    // list unmasked without typing it again (sessionStorage would start that tab empty)
    await page.close();
    page = await context.newPage();
    await openFaucet(page, fixture, "/status");
    await page.getByText("Unmasked").waitFor();
    expect(await page.getByLabel("Operator key").inputValue()).to.equal(operatorKey(), "the key field is empty in the new tab");
  });

  it("status page forgets a key the faucet refuses", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    await addRichSession();
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await openFaucet(page, fixture, "/status");
    await page.getByText("Active mining sessions").waitFor();

    await page.getByLabel("Operator key").fill("not-the-key");
    await page.getByRole("button", { name: "Refresh" }).click();
    await page.getByText("The faucet did not accept that key.").waitFor();
    expect(await page.locator("body").textContent()).to.contain("Masked");
    expect(await page.evaluate(() => localStorage.getItem("powfaucet.operatorKey"))).to.equal(null, "the refused key was kept");
    expect(await page.getByLabel("Operator key").inputValue()).to.equal("");
  });
});
