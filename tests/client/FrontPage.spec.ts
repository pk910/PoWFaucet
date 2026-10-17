import 'mocha';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet } from './harness.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetStatus, FaucetStatusLevel } from '../../src/services/FaucetStatus.js';

describe("browser: front page", function() {
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

  it("shows the title, the address input, the start button and the description", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage();
    await openFaucet(page, fixture);

    expect(await page.locator("h1").first().textContent()).to.equal("Browser Test Faucet");
    let input = page.getByPlaceholder(/ETH address/);
    expect(await input.count()).to.equal(1, "address input missing");
    let start = page.getByRole("button", { name: "Start Mining" });
    expect(await start.count()).to.equal(1, "start button missing");
    expect(await page.getByText("What is a PoW Faucet?").count()).to.equal(1, "faucetHomeHtml not rendered");
  });

  it("offers 'Request Funds' when there is nothing to mine", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({ mining: false });
    page = await browser.newPage();
    await openFaucet(page, fixture);

    expect(await page.getByRole("button", { name: "Request Funds" }).count()).to.equal(1);
    expect(await page.getByRole("button", { name: "Start Mining" }).count()).to.equal(0);
  });

  it("shows the configured faucet status messages", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    // a status entry set at runtime, the way the operator's status file does it
    ServiceManager.GetService(FaucetStatus).setFaucetStatus("browser-test", "The faucet wallet was refilled.", FaucetStatusLevel.INFO, 10);
    page = await browser.newPage();
    await openFaucet(page, fixture);

    let alert = page.getByRole("alert").filter({ hasText: "The faucet wallet was refilled." });
    expect(await alert.count()).to.equal(1, "status alert not shown");
  });

  it("renders the login tiles of the enabled login modules", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet({
      configure: (config) => {
        config.modules["github"] = { enabled: true, appClientId: "x", appSecret: "y", authTimeout: 86400 } as any;
        config.modules["voucher"] = { enabled: true, voucherLabel: "Voucher code" } as any;
      },
    });
    page = await browser.newPage();
    await openFaucet(page, fixture);

    expect(await page.getByText("Login with Github").count()).to.equal(1, "github login missing");
    expect(await page.getByPlaceholder("Enter Voucher Code").count()).to.equal(1, "voucher input missing");
  });

  it("fits a phone without horizontal scrolling", async function() {
    if(skipReason) return this.skip();
    fixture = await bootFaucet();
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await openFaucet(page, fixture);

    let widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).to.be.at.most(widths.client, "the page scrolls sideways on a phone");
  });
});
