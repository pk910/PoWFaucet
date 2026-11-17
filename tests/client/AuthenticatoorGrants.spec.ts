import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import type { Browser, Page } from 'playwright';
import { bootFaucet, IFaucetFixture, launchBrowser, openFaucet, TEST_TARGET_ADDR } from './harness.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { AuthenticatoorVerifier, IAuthenticatoorClaims } from '../../src/modules/authenticatoor/AuthenticatoorVerifier.js';

const AUTH_URL = "http://auth.test.local";
const TOKEN = "stub.token.alice@example.com";
const ETH = 1000000000000000000;

// The authenticatoor's drop-in client, logged in as alice.
const CLIENT_JS = `
window.ethpandaops = { authenticatoor: {
  checkLogin: function() { return Promise.resolve({ authenticated: true, token: ${JSON.stringify(TOKEN)}, exp: 4102444800, user: "alice@example.com" }); },
  login: function() {},
  logout: function() {},
  getToken: function() { return ${JSON.stringify(TOKEN)}; },
  isLoggedIn: function() { return true; },
  authServiceURL: function() { return ${JSON.stringify(AUTH_URL)}; },
} };
`;

describe("browser: authenticatoor grant selection", function() {
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

  async function bootGrantFaucet(): Promise<IFaucetFixture> {
    return await bootFaucet({
      configure: (config) => {
        config.modules["authenticatoor"] = {
          enabled: true,
          authUrl: AUTH_URL,
          expectedAudience: "test.local",
          grants: [
            { id: "baseline", limitCount: 0, limitAmount: 0, duration: 86400, rewardFactor: 2 },
            {
              id: "drop5", name: "Quick drop", description: "A fixed drop without mining",
              selectable: true, limitCount: 1, limitAmount: 0, duration: 86400,
              skipModules: ["pow"], overrideMaxDrop: 5 * ETH,
            },
            {
              id: "drop50", name: "Big drop",
              selectable: true, limitCount: 1, limitAmount: 0, duration: 86400,
              skipModules: ["pow"], overrideMaxDrop: 50 * ETH,
            },
          ],
        } as any;
      },
      stubs: {
        "AuthenticatoorVerifier.verify": sinon.stub(AuthenticatoorVerifier.prototype, "verify").callsFake(async (token: string) => {
          if(token !== TOKEN)
            throw new Error("verifier: bad token");
          return { sub: "alice@example.com", email: "alice@example.com", iss: AUTH_URL } as IAuthenticatoorClaims;
        }),
      },
    });
  }

  it("lists the selectable grants, used up ones disabled, and starts a session with the selected one", async function() {
    if(skipReason) return this.skip();
    fixture = await bootGrantFaucet();
    // alice used the big drop already
    await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: TEST_TARGET_ADDR,
      authToken: TOKEN,
      authGrant: "drop50",
    });

    page = await browser.newPage();
    await page.route(AUTH_URL + "/client.js", (route) => route.fulfill({ contentType: "text/javascript", body: CLIENT_JS }));
    await openFaucet(page, fixture);

    let standard = page.getByRole("radio", { name: /Standard/ });
    let quick = page.getByRole("radio", { name: /Quick drop/ });
    let big = page.getByRole("radio", { name: /Big drop/ });
    await quick.waitFor({ timeout: 10000 });
    expect(await standard.isChecked()).to.equal(true, "the standard grant should be preselected");
    expect(await quick.isEnabled()).to.equal(true, "available grant disabled");
    expect(await big.isDisabled()).to.equal(true, "used up grant selectable");
    expect(await page.getByText(/available again in/).count()).to.equal(1, "used up grant shows no time");
    expect(await page.getByText("A fixed drop without mining").count()).to.equal(1, "description missing");

    await quick.check();
    await page.getByPlaceholder(/ETH address/).fill(TEST_TARGET_ADDR);
    await page.getByRole("button", { name: "Start Mining" }).click();
    await page.waitForURL(/#\/claim\//, { timeout: 30000 });
    let sessionId = /#\/claim\/([^/?]+)/.exec(page.url())[1];
    let session = await ServiceManager.GetService(FaucetDatabase).getSession(sessionId);
    expect(session.dropAmount).to.equal(BigInt(5 * ETH).toString(), "selected grant's drop not paid");
    expect(session.data["authenticatoor.grant"]).to.equal("drop5", "selected grant not recorded");
  });
});
