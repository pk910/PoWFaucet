/**
 * Browser test harness: a real faucet in this process, the real client bundle in a real browser.
 *
 * The node suites test the server through its classes; these suites test what a user sees. The
 * faucet is booted the way `src/app.ts` does it, with the same stubs the node suites use (in-process
 * workers, a fake RPC provider, an in-memory sqlite), and `static/` is served as built by
 * `npm run build-client`. Chromium comes from the repository's playwright dependency.
 *
 * Gated like `tests/loader/ModuleClient.spec.ts`: a spec skips itself unless `FAUCET_E2E_BROWSER=1`
 * is set, the client is built and a chromium binary is there. `FAUCET_E2E_CHROMIUM` names another
 * binary than the one playwright installed.
 *
 * Specs are written against what a user sees - texts, roles, urls, computed styles - and not
 * against class names, so a restyle does not rewrite them.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import sinon from 'sinon';
import type { Browser, Locator, Page } from 'playwright';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { EthWalletManager } from '../../src/eth/EthWalletManager.js';
import { EthClaimManager } from '../../src/eth/EthClaimManager.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { FaucetHttpServer } from '../../src/webserv/FaucetHttpServer.js';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../../src/session/FaucetSession.js';
import { PoWHashAlgo } from '../../src/modules/pow/PoWConfig.js';
import { getNewGuid } from '../../src/utils/GuidUtils.js';
import { FakeProvider } from '../stubs/FakeProvider.js';

export const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");

/** the wallet every browser test faucet pays from (a throwaway key, address 0xCA94...1193) */
export const TEST_WALLET_KEY = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
export const TEST_TARGET_ADDR = "0x0000000000000000000000000000000000001337";

export interface IFaucetFixtureOptions {
  /** enable the pow module with parameters that make a share cheap (default: true) */
  mining?: boolean;
  /** last word on the config, after the harness set its own */
  configure?: (config: typeof faucetConfig) => void;
  /** extra sinon stubs handed to bindTestStubs */
  stubs?: { [key: string]: any };
}

export interface IFaucetFixture {
  baseUrl: string;
  port: number;
  fakeProvider: FakeProvider;
  stubs: any;
  /** writes a session straight into the database, for pages that show stored sessions */
  addSession(session: Partial<FaucetSessionStoreData>): Promise<FaucetSessionStoreData>;
  dispose(): Promise<void>;
}

export function browserSkipReason(): string | null {
  if(process.env.FAUCET_E2E_BROWSER !== "1")
    return "set FAUCET_E2E_BROWSER=1 to run the browser suite";
  if(!fs.existsSync(path.join(REPO_ROOT, "static", "js", "powfaucet.js")))
    return "no static/js/powfaucet.js - run 'npm run build-client'";
  return null;
}

export async function chromiumExecutable(): Promise<string> {
  let { chromium } = await import("playwright");
  return process.env.FAUCET_E2E_CHROMIUM || chromium.executablePath();
}

/**
 * The browser for a suite, or null with the reason in `skipReason`. One browser per suite, a
 * fresh page per test: launching chromium is the slow part.
 */
export async function launchBrowser(): Promise<{ browser: Browser | null, skipReason: string | null }> {
  let skipReason = browserSkipReason();
  if(skipReason)
    return { browser: null, skipReason };
  try {
    let { chromium } = await import("playwright");
    let executablePath = await chromiumExecutable();
    if(!fs.existsSync(executablePath))
      return { browser: null, skipReason: "chromium is not installed at " + executablePath + " - run 'npx playwright install chromium' or set FAUCET_E2E_CHROMIUM" };
    return { browser: await chromium.launch({ executablePath }), skipReason: null };
  } catch(ex) {
    return { browser: null, skipReason: "playwright could not start: " + ex };
  }
}

/**
 * A faucet with the services `src/app.ts` starts, in their order, on a random port.
 *
 * The RPC is a FakeProvider that answers the calls the wallet manager makes while booting and
 * while watching a claim; a test that needs other answers injects them on `fixture.fakeProvider`.
 * `sendClaimTx` and `watchClaimTx` are stubbed to a confirmed transaction so a claim completes
 * without a chain; a test about failures replaces the stubs.
 */
export async function bootFaucet(options?: IFaucetFixtureOptions): Promise<IFaucetFixture> {
  options = options || {};
  let fakeProvider = new FakeProvider();
  fakeProvider.injectResponse("eth_chainId", 1337);
  fakeProvider.injectResponse("eth_blockNumber", "0x1000");
  fakeProvider.injectResponse("eth_getBalance", "1000000000000000000000");
  // a function: the provider treats a falsy response as "no mock" and logs it
  fakeProvider.injectResponse("eth_getTransactionCount", () => 0);
  fakeProvider.injectResponse("eth_gasPrice", "0x3b9aca00");

  // what a confirmed claim looks like to the claim manager (see EthClaimManager.spec)
  let confirmedTx = (txHash: string) => ({
    status: true,
    block: 4242,
    fee: 21000000000000n,
    receipt: {
      status: true,
      transactionHash: txHash,
      transactionIndex: 1,
      blockHash: "0x" + "cd".repeat(32),
      blockNumber: 4242,
      from: "0xCA9456991E0AA5d5321e88Bba44d405aAb401193",
      to: TEST_TARGET_ADDR,
      contractAddress: null,
      cumulativeGasUsed: 21000,
      gasUsed: 21000,
      effectiveGasPrice: 1000000000,
      logs: [],
      logsBloom: "0x" + "00".repeat(256),
    } as any,
  });
  let stubs = bindTestStubs({
    "EthWalletManager.sendClaimTx": sinon.stub(EthWalletManager.prototype, "sendClaimTx").callsFake(async (claimTx: any) => {
      // the real sendClaimTx writes hash and nonce into the claim itself; the manager reads them from there
      let txHash = "0x" + "ab".repeat(32);
      claimTx.claim.txHash = txHash;
      claimTx.claim.txNonce = 1;
      return {
        txHash: txHash,
        txPromise: Promise.resolve(confirmedTx(txHash)),
        plan: null, // the plan is only read by the real sender
      };
    }),
    "EthWalletManager.watchClaimTx": sinon.stub(EthWalletManager.prototype, "watchClaimTx").callsFake(async (claimTx: any) => {
      return confirmedTx(claimTx.claim.txHash);
    }),
    ...(options.stubs || {}),
  });

  loadDefaultTestConfig();
  faucetConfig.buildSeoIndex = false;
  faucetConfig.serverPort = 0;
  faucetConfig.staticPath = path.join(REPO_ROOT, "static");
  faucetConfig.faucetTitle = "Browser Test Faucet";
  faucetConfig.faucetCoinSymbol = "TEST";
  faucetConfig.faucetHomeHtml = "<div class='pow-info'><h5>What is a PoW Faucet?</h5>A test faucet.</div>";
  faucetConfig.minDropAmount = 1000000000000000;      // 0.001 TEST
  faucetConfig.maxDropAmount = 1000000000000000000;   // 1 TEST
  faucetConfig.ethWalletKey = TEST_WALLET_KEY;
  faucetConfig.ethRpcHost = fakeProvider as any;
  faucetConfig.ethTxExplorerLink = "https://explorer.test/tx/{txid}";

  if(options.mining !== false) {
    // a share every few hashes, worth more than the minimum claim: one share and the session is claimable
    faucetConfig.modules["pow"] = {
      enabled: true,
      powShareReward: 10000000000000000, // 0.01 TEST
      powSessionTimeout: 3600,
      powIdleTimeout: 600,
      powHashAlgo: PoWHashAlgo.SCRYPT,
      powScryptParams: {
        cpuAndMemory: 1024,
        blockSize: 8,
        parallelization: 1,
        keyLength: 16,
      },
      powDifficulty: 6,
      powHashrateSoftLimit: 0,
      powHashrateHardLimit: 0,
      verifyLocalPercent: 100,
      verifyMinerPercent: 0,
    } as any;
  }

  if(options.configure)
    options.configure(faucetConfig);

  await ServiceManager.GetService(FaucetDatabase).initialize();
  await ServiceManager.GetService(EthWalletManager).initialize();
  await ServiceManager.GetService(ModuleManager).initialize();
  await ServiceManager.GetService(SessionManager).initialize();
  await ServiceManager.GetService(EthClaimManager).initialize();
  let server = ServiceManager.GetService(FaucetHttpServer);
  server.initialize();
  let port = server.getListenPort();
  upgradedSockets = new Set();
  (server as any).httpServer.on("upgrade", (req: IncomingMessage, socket: Socket) => {
    upgradedSockets.add(socket);
    socket.on("close", () => upgradedSockets.delete(socket));
  });

  return {
    baseUrl: "http://127.0.0.1:" + port,
    port: port,
    fakeProvider: fakeProvider,
    stubs: stubs,
    addSession: async (session) => {
      let now = Math.floor(Date.now() / 1000);
      let data: FaucetSessionStoreData = Object.assign({
        sessionId: getNewGuid(),
        startTime: now - 60,
        status: FaucetSessionStatus.FINISHED,
        dropAmount: "500000000000000000",
        remoteIP: "203.0.113.42",
        targetAddr: TEST_TARGET_ADDR,
        tasks: [],
        data: {},
        claim: null,
      }, session);
      await ServiceManager.GetService(FaucetDatabase).updateSession(data);
      return data;
    },
    dispose: async () => {
      let dbService = ServiceManager.GetService(FaucetDatabase);
      await ServiceManager.DisposeAllServices();
      await dbService.closeDatabase();
      await unbindTestStubs(stubs);
    },
  };
}

/** Opens the faucet at a hash route and waits until the page rendered its config. */
export async function openFaucet(page: Page, fixture: IFaucetFixture, route?: string): Promise<void> {
  let url = fixture.baseUrl + "/" + (route ? "#" + route : "");
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector(".faucet-page", { timeout: 30000 });
}

/**
 * Starts a mining session from the front page and returns once the mining page is up and its
 * websocket is connected: the stat tiles render as soon as the session exists, the header pill
 * turns from "Reconnecting" to "Mining" only when the socket reports open. A test that reads the
 * page right after the tiles appear races that gap.
 */
export async function startMiningSession(page: Page, fixture: IFaucetFixture, targetAddr?: string): Promise<string> {
  await openFaucet(page, fixture);
  await page.getByPlaceholder(/ETH address/).fill(targetAddr || TEST_TARGET_ADDR);
  await page.getByRole("button", { name: "Start Mining" }).click();
  await page.waitForURL(/#\/mine\//, { timeout: 30000 });
  await page.getByText("Your mining reward").waitFor({ timeout: 30000 });
  await miningPill(page, "Mining").waitFor({ timeout: 30000 });
  return sessionIdFromUrl(page.url());
}

/** Clicks the "Close" button in a dialog's footer; the header's x carries the same accessible name. */
export async function closeDialog(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "Close" }).filter({ hasText: "Close" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
}

/** The header pill of the mining page with the given text ("Mining" while connected, "Reconnecting" otherwise). */
export function miningPill(page: Page, text: string) {
  return page.locator(".faucet-page .pf-pill", { hasText: text });
}

/**
 * Waits until the server rewarded the session a share. The hashers are real wasm workers, so this
 * is the one step of a mining test whose length depends on the machine.
 */
export async function waitForShare(sessionId: string, timeoutMs?: number): Promise<void> {
  let sessionManager = ServiceManager.GetService(SessionManager);
  let deadline = Date.now() + (timeoutMs || 60000);
  while(Date.now() < deadline) {
    let session = sessionManager.getSession(sessionId);
    if(session && session.getDropAmount() > 0n)
      return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no share rewarded for session " + sessionId + " within " + Math.round((timeoutMs || 60000) / 1000) + " s");
}

/**
 * The tcp sockets behind the faucet's open websockets. The pow module hands its sockets to its
 * worker, so the http server's own websocket server does not track them; the harness watches the
 * upgrade requests instead.
 */
let upgradedSockets: Set<Socket> = new Set();

/** Drops every websocket the faucet holds open, the way a network outage does; the clients reconnect on their own. */
export function dropWebsockets(): number {
  let count = upgradedSockets.size;
  upgradedSockets.forEach((socket) => socket.destroy());
  upgradedSockets.clear();
  return count;
}

/** The session id the mining or claim page is on, read from the hash route. */
export function sessionIdFromUrl(url: string): string | null {
  let match = /#\/(?:mine|claim|details)\/([0-9a-f-]+)/.exec(url);
  return match ? match[1] : null;
}
