import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common';
import { ServiceManager } from '../../src/common/ServiceManager';
import { FaucetDatabase } from '../../src/db/FaucetDatabase';
import { ModuleManager } from '../../src/modules/ModuleManager';
import { SessionManager } from '../../src/session/SessionManager';
import { faucetConfig } from '../../src/config/FaucetConfig';
import { FaucetError } from '../../src/common/FaucetError';
import { IPoWConfig, PoWHashAlgo } from '../../src/modules/pow/PoWConfig';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi';
import { disposeFakeWebSockets, FakeWebSocket } from '../stubs/FakeWebSocket';
import { FaucetHttpServer } from '../../src/webserv/FaucetHttpServer';
import { PoWModule } from '../../src/modules/pow/PoWModule';
import { PoWClient } from '../../src/modules/pow/PoWClient';


describe("Faucet module: pow", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  afterEach(async () => {
    await ServiceManager.GetService(FaucetDatabase).closeDatabase();
    await unbindTestStubs();
    disposeFakeWebSockets();
    ServiceManager.ClearAllServices();
  });

  function injectTestWebSocket(url: string, ip: string): FakeWebSocket {
    let fakeWs = new FakeWebSocket();
    let faucetHttpServer: any = ServiceManager.GetService(FaucetHttpServer);
    let powWsHandler: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => void = faucetHttpServer.wssEndpoints["pow"].handler;
    powWsHandler({
      url: url,
    } as any, fakeWs, ip)
    return fakeWs;
  }

  it("Check client config exports (scrypt)", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
      powShareReward: 10,
      powSessionTimeout: 60,
      powHashAlgo: PoWHashAlgo.SCRYPT,
      powScryptParams: {
        cpuAndMemory: 4096,
        blockSize: 8,
        parallelization: 1,
        keyLength: 16,
      },
      powDifficulty: 11,
      powNonceCount: 2,
      powHashrateSoftLimit: 1337,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig(null, null);
    expect(!!clientConfig.modules['pow']).to.equal(true, "no pow config exported");
    expect(clientConfig.modules['pow'].powTimeout).to.equal(60, "client config missmatch: powTimeout");
    expect(clientConfig.modules['pow'].powParams.a).to.equal(PoWHashAlgo.SCRYPT, "client config missmatch: powParams.a");
    expect(clientConfig.modules['pow'].powParams.n).to.equal(4096, "client config missmatch: powParams.n");
    expect(clientConfig.modules['pow'].powParams.r).to.equal(8, "client config missmatch: powParams.r");
    expect(clientConfig.modules['pow'].powParams.p).to.equal(1, "client config missmatch: powParams.p");
    expect(clientConfig.modules['pow'].powParams.l).to.equal(16, "client config missmatch: powParams.l");
    expect(clientConfig.modules['pow'].powDifficulty).to.equal(11, "client config missmatch: powDifficulty");
    expect(clientConfig.modules['pow'].powNonceCount).to.equal(2, "client config missmatch: powNonceCount");
    expect(clientConfig.modules['pow'].powHashrateLimit).to.equal(1337, "client config missmatch: powHashrateLimit");
    let powModule = moduleManager.getModule<PoWModule>("pow");
    expect(powModule.getPoWParamsStr()).to.equal("scrypt|4096|8|1|16|11", "invalid powParams string");
  });

  it("Check client config exports (cryptonight)", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
      powShareReward: 10,
      powSessionTimeout: 60,
      powHashAlgo: PoWHashAlgo.CRYPTONIGHT,
      powCryptoNightParams: {
        algo: 0,
        variant: 1,
        height: 10,
      },
      powDifficulty: 11,
      powNonceCount: 2,
      powHashrateSoftLimit: 1337,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig(null, null);
    expect(!!clientConfig.modules['pow']).to.equal(true, "no pow config exported");
    expect(clientConfig.modules['pow'].powTimeout).to.equal(60, "client config missmatch: powTimeout");
    expect(clientConfig.modules['pow'].powParams.a).to.equal(PoWHashAlgo.CRYPTONIGHT, "client config missmatch: powParams.a");
    expect(clientConfig.modules['pow'].powParams.c).to.equal(0, "client config missmatch: powParams.c");
    expect(clientConfig.modules['pow'].powParams.v).to.equal(1, "client config missmatch: powParams.v");
    expect(clientConfig.modules['pow'].powParams.h).to.equal(10, "client config missmatch: powParams.h");
    expect(clientConfig.modules['pow'].powDifficulty).to.equal(11, "client config missmatch: powDifficulty");
    expect(clientConfig.modules['pow'].powNonceCount).to.equal(2, "client config missmatch: powNonceCount");
    expect(clientConfig.modules['pow'].powHashrateLimit).to.equal(1337, "client config missmatch: powHashrateLimit");
    let powModule = moduleManager.getModule<PoWModule>("pow");
    expect(powModule.getPoWParamsStr()).to.equal("cryptonight|0|1|10|11", "invalid powParams string");
  });

  it("Check client config exports (argon2)", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
      powShareReward: 10,
      powSessionTimeout: 60,
      powHashAlgo: PoWHashAlgo.ARGON2,
      powArgon2Params: {
        type: 0,
        version: 13,
        timeCost: 4,
        memoryCost: 4096,
        parallelization: 1,
        keyLength: 16,
      },
      powDifficulty: 11,
      powNonceCount: 2,
      powHashrateSoftLimit: 1337,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig(null, null);
    expect(!!clientConfig.modules['pow']).to.equal(true, "no pow config exported");
    expect(clientConfig.modules['pow'].powTimeout).to.equal(60, "client config missmatch: powTimeout");
    expect(clientConfig.modules['pow'].powParams.a).to.equal(PoWHashAlgo.ARGON2, "client config missmatch: powParams.a");
    expect(clientConfig.modules['pow'].powParams.t).to.equal(0, "client config missmatch: powParams.t");
    expect(clientConfig.modules['pow'].powParams.v).to.equal(13, "client config missmatch: powParams.v");
    expect(clientConfig.modules['pow'].powParams.i).to.equal(4, "client config missmatch: powParams.i");
    expect(clientConfig.modules['pow'].powParams.m).to.equal(4096, "client config missmatch: powParams.m");
    expect(clientConfig.modules['pow'].powParams.p).to.equal(1, "client config missmatch: powParams.p");
    expect(clientConfig.modules['pow'].powParams.l).to.equal(16, "client config missmatch: powParams.l");
    expect(clientConfig.modules['pow'].powDifficulty).to.equal(11, "client config missmatch: powDifficulty");
    expect(clientConfig.modules['pow'].powNonceCount).to.equal(2, "client config missmatch: powNonceCount");
    expect(clientConfig.modules['pow'].powHashrateLimit).to.equal(1337, "client config missmatch: powHashrateLimit");
    let powModule = moduleManager.getModule<PoWModule>("pow");
    expect(powModule.getPoWParamsStr()).to.equal("argon2|0|13|4|4096|1|16|11", "invalid powParams string");
  });

  it("Start mining session and check session params", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let clientInfo = await testSession.getSessionInfo();
    expect(!!clientInfo.modules["pow"]).to.equal(true, "missing pow info in client session info");
    expect(clientInfo.modules["pow"].lastNonce).to.equal(0, "invalid pow info in client session info: lastNonce");
    expect(clientInfo.modules["pow"].preImage).to.equal(testSession.getSessionData("pow.preimage"), "invalid pow info in client session info: preImage");
    expect(clientInfo.modules["pow"].shareCount).to.equal(0, "invalid pow info in client session info: shareCount");
  });

  it("Start mining session and connect mining client", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let fakeWs = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
    expect(fakeWs.isReady).to.equal(true, "websocket was closed");
    let errorMsg = fakeWs.getSentMessage("error");
    expect(errorMsg.length).to.equal(0, "a unexpected error message has been sent: " + (errorMsg.length ? errorMsg[0].data.code : ""));
  });

  it("Connect invalid mining client (missing session id)", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let fakeWs = injectTestWebSocket("/ws/pow", "8.8.8.8");
    expect(fakeWs.isReady).to.equal(false, "websocket not closed");
    let errorMsg = fakeWs.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message sent");
    expect(errorMsg[0].data.code).to.equal("INVALID_SESSION", "unexpected error code");
  });

  it("Connect invalid mining client (unknown session id)", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let fakeWs = injectTestWebSocket("/ws/pow?session=e36ec5e6-12ee-4015-951f-b018b37de451", "8.8.8.8");
    expect(fakeWs.isReady).to.equal(false, "websocket not closed");
    let errorMsg = fakeWs.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message sent");
    expect(errorMsg[0].data.code).to.equal("INVALID_SESSION", "unexpected error code");
  });

  it("Connect multiple mining clients for same session", async () => {
    faucetConfig.modules["pow"] = {
      enabled: true,
    } as IPoWConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let fakeWs = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
    injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
    expect(fakeWs.isReady).to.equal(false, "websocket not closed");
    let errorMsg = fakeWs.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message sent");
    expect(errorMsg[0].data.code).to.equal("CLIENT_KILLED", "unexpected error code");
  });

  describe("Mining websocket protocol", () => {

    it("check ping timeout handling", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powPingInterval: 1,
        powPingTimeout: 2,
      } as IPoWConfig;
      globalStubs["FakeWebSocket.ping"] = sinon.stub(FakeWebSocket.prototype, "ping");
      globalStubs["FakeWebSocket.pong"] = sinon.stub(FakeWebSocket.prototype, "pong");
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("pong");
      fakeSocket.emit("ping");
      expect(globalStubs["FakeWebSocket.pong"].called).to.equal(true, "pong not called");
      expect(globalStubs["FakeWebSocket.ping"].called).to.equal(false, "unexpected ping call");
      await awaitSleepPromise(1100, () => globalStubs["FakeWebSocket.ping"].called);
      expect(fakeSocket.isReady).to.equal(true, "client not ready");
      expect(globalStubs["FakeWebSocket.ping"].called).to.equal(true, "ping not called");
      expect(fakeSocket.isReady).to.equal(true, "unexpected close call");
      await awaitSleepPromise(3000, () => !fakeSocket.isReady);
      expect(fakeSocket.isReady).to.equal(false, "client is still ready");
    }).timeout(5000);

    it("check invalid message handling", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", "invalid stuff (not json)");
      //expect(fakeSocket.isReady).to.equal(false, "client is still ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].data.code).to.equal("CLIENT_KILLED", "unexpected error code");
    });

    it("check unknown action handling", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "unknownAction"
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("INVALID_ACTION", "unexpected error code");
    });

    it("check action 'foundShare': invalid share data", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("INVALID_SHARE", "unexpected error code");
      expect(errorMsg[0].data.message).to.equal("Invalid share data", "unexpected error message");
    });

    it("check action 'foundShare': invalid share params", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 2,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1337 ],
          params: "invalid_params_str",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("INVALID_SHARE", "unexpected error code");
      expect(errorMsg[0].data.message).to.equal("Invalid share params", "unexpected error message");
    });

    it("check action 'foundShare': invalid nonce count", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 2,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1337 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("INVALID_SHARE", "unexpected error code");
      expect(errorMsg[0].data.message).to.matches(/Invalid nonce count/i, "unexpected error message");
    });

    it("check action 'foundShare': nonce too low", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      testSession.setSessionData("pow.lastNonce", 1337);
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1337 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("INVALID_SHARE", "unexpected error code");
      expect(errorMsg[0].data.message).to.matches(/Nonce too low/i, "unexpected error message");
    });

    it("check action 'foundShare': nonce too high", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 133700 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "no error message sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("HASHRATE_LIMIT", "unexpected error code");
      expect(errorMsg[0].data.message).to.matches(/Nonce too high/i, "unexpected error message");
    });

    it("check action 'foundShare': valid share, local verification", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powShareReward: 10,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
        verifyLocalLowPeerPercent: 100,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      testSession.setSessionData("pow.preimage", "oXwNMIuRUOc=");
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1524 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      await awaitSleepPromise(1000, () => fakeSocket.getSentMessage("ok").length > 0);
      let okMsg = fakeSocket.getSentMessage("ok");
      expect(okMsg.length).to.equal(1, "no ok message sent");
      expect(okMsg[0].rsp).to.equal(42, "invalid response id");
      await awaitSleepPromise(100, () => fakeSocket.getSentMessage("updateBalance").length > 0);
      let balanceMsg = fakeSocket.getSentMessage("updateBalance");
      expect(balanceMsg.length).to.equal(1, "no updateBalance message sent");
      expect(balanceMsg[0].data.balance).to.equal("10", "invalid updateBalance message: unexpected balance");
      expect(balanceMsg[0].data.reason).to.matches(/valid share/, "invalid updateBalance message: unexpected reason");
    });

    it("check action 'foundShare': invalid share, local verification", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
        verifyLocalLowPeerPercent: 100,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      testSession.setSessionData("pow.preimage", "oXwNMIuRUOc=");
      expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
      let fakeSocket = injectTestWebSocket("/ws/pow?session=" + testSession.getSessionId(), "8.8.8.8");
      fakeSocket.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1526 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }))
      expect(fakeSocket.isReady).to.equal(true, "client is not ready");
      await awaitSleepPromise(1000, () => !fakeSocket.isReady);
      let errorMsg = fakeSocket.getSentMessage("error");
      expect(errorMsg.length).to.equal(2, "unexpected number of error messages sent");
      expect(errorMsg[0].rsp).to.equal(42, "invalid response id");
      expect(errorMsg[0].data.code).to.equal("WRONG_SHARE", "unexpected error1 code");
      expect(errorMsg[0].data.message).to.matches(/verification failed/i, "unexpected error1 message");
      expect(errorMsg[1].data.code).to.equal("CLIENT_KILLED", "unexpected error2 code");
      expect(errorMsg[1].data.message).to.matches(/session failed/i, "unexpected error2 message");
      expect(testSession.getDropAmount()).to.equal(0n, "unexpected drop amount");
    });

    it("check action 'verifyResult': valid share verification", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powShareReward: 10,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
        verifyMinerIndividuals: 1,
        verifyMinerPeerCount: 1,
        verifyMinerPercent: 100,
        verifyMinerRewardPerc: 50,
        verifyMinerMissPenaltyPerc: 50,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      let fakeSocket1 = injectTestWebSocket("/ws/pow?session=" + testSession1.getSessionId(), "8.8.8.8");
      testSession1.setSessionData("pow.preimage", "oXwNMIuRUOc=");
      expect(testSession1.getSessionStatus()).to.equal("running", "unexpected session status");
      let testSession2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.4.4", {
        addr: "0x0000000000000000000000000000000000001338",
      });
      let fakeSocket2 = injectTestWebSocket("/ws/pow?session=" + testSession2.getSessionId(), "8.8.4.4");
      expect(testSession2.getSessionStatus()).to.equal("running", "unexpected session status");
      await testSession2.addReward(100n);
      fakeSocket1.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1524 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }));
      expect(fakeSocket1.isReady).to.equal(true, "client is not ready");
      await awaitSleepPromise(500, () => fakeSocket2.getSentMessage("verify").length > 0);
      let verifyMsg = fakeSocket2.getSentMessage("verify");
      expect(verifyMsg.length).to.equal(1, "unexpected number of verify messages sent");
      expect(verifyMsg[0].data.preimage).to.equal("oXwNMIuRUOc=", "invalid verify message: preimage missmatch");
      expect(verifyMsg[0].data.nonces[0]).to.equal(1524, "invalid verify message: nonces missmatch");
      // send verify result
      fakeSocket2.emit("message", JSON.stringify({
        id: 43,
        action: "verifyResult",
        data: {
          shareId: verifyMsg[0].data.shareId,
          isValid: true,
        }
      }));
      await awaitSleepPromise(500, () => fakeSocket2.getSentMessage("updateBalance").length > 0);
      let balanceMsg1 = fakeSocket2.getSentMessage("updateBalance");
      expect(balanceMsg1.length).to.equal(1, "no updateBalance message sent");
      expect(balanceMsg1[0].data.balance).to.equal("105", "invalid updateBalance message: unexpected balance");
      expect(balanceMsg1[0].data.reason).to.matches(/valid verification/, "invalid updateBalance message: unexpected reason");
      await awaitSleepPromise(500, () => fakeSocket1.getSentMessage("ok").length > 0);
      let okMsg2 = fakeSocket1.getSentMessage("ok");
      expect(okMsg2.length).to.equal(1, "no ok message2 sent");
      expect(okMsg2[0].rsp).to.equal(42, "invalid response id in ok msg2");
    });

    it("check action 'verifyResult': invalid share verification", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powShareReward: 10,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
        verifyMinerIndividuals: 1,
        verifyMinerPeerCount: 1,
        verifyMinerPercent: 100,
        verifyMinerRewardPerc: 50,
        verifyMinerMissPenaltyPerc: 50,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      let fakeSocket1 = injectTestWebSocket("/ws/pow?session=" + testSession1.getSessionId(), "8.8.8.8");
      testSession1.setSessionData("pow.preimage", "oXwNMIuRUOc=");
      expect(testSession1.getSessionStatus()).to.equal("running", "unexpected session status");
      let testSession2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.4.4", {
        addr: "0x0000000000000000000000000000000000001338",
      });
      let fakeSocket2 = injectTestWebSocket("/ws/pow?session=" + testSession2.getSessionId(), "8.8.4.4");
      expect(testSession2.getSessionStatus()).to.equal("running", "unexpected session status");
      await testSession2.addReward(100n);
      fakeSocket1.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1524 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }));
      expect(fakeSocket1.isReady).to.equal(true, "client is not ready");
      await awaitSleepPromise(500, () => fakeSocket2.getSentMessage("verify").length > 0);
      let verifyMsg = fakeSocket2.getSentMessage("verify");
      expect(verifyMsg.length).to.equal(1, "unexpected number of verify messages sent");
      expect(verifyMsg[0].data.preimage).to.equal("oXwNMIuRUOc=", "invalid verify message: preimage missmatch");
      expect(verifyMsg[0].data.nonces[0]).to.equal(1524, "invalid verify message: nonces missmatch");
      // send verify result
      fakeSocket2.emit("message", JSON.stringify({
        id: 43,
        action: "verifyResult",
        data: {
          shareId: verifyMsg[0].data.shareId,
          isValid: false,
        }
      }));
      await awaitSleepPromise(1000, () => !fakeSocket2.isReady);
      let errorMsg = fakeSocket2.getSentMessage("error");
      expect(errorMsg.length).to.equal(1, "unexpected number of error messages sent");
      expect(errorMsg[0].data.code).to.equal("CLIENT_KILLED", "unexpected error2 code");
      expect(errorMsg[0].data.message).to.matches(/session failed/i, "unexpected error2 message");
      await awaitSleepPromise(500, () => fakeSocket1.getSentMessage("ok").length > 0);
      let okMsg2 = fakeSocket1.getSentMessage("ok");
      expect(okMsg2.length).to.equal(1, "no ok message sent");
      expect(okMsg2[0].rsp).to.equal(42, "invalid response id");
    });

    it("check timed out share verification", async () => {
      faucetConfig.modules["pow"] = {
        enabled: true,
        powShareReward: 10,
        powHashAlgo: PoWHashAlgo.SCRYPT,
        powScryptParams: {
          cpuAndMemory: 4096,
          blockSize: 8,
          parallelization: 1,
          keyLength: 16,
        },
        powDifficulty: 11,
        powNonceCount: 1,
        powHashrateHardLimit: 100,
        verifyMinerIndividuals: 1,
        verifyMinerPeerCount: 1,
        verifyMinerPercent: 100,
        verifyMinerRewardPerc: 50,
        verifyMinerMissPenaltyPerc: 50,
        verifyMinerTimeout: 1,
      } as IPoWConfig;
      let moduleManager = ServiceManager.GetService(ModuleManager);
      await moduleManager.initialize();
      let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      let fakeSocket1 = injectTestWebSocket("/ws/pow?session=" + testSession1.getSessionId(), "8.8.8.8");
      testSession1.setSessionData("pow.preimage", "oXwNMIuRUOc=");
      expect(testSession1.getSessionStatus()).to.equal("running", "unexpected session status");
      let testSession2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.4.4", {
        addr: "0x0000000000000000000000000000000000001338",
      });
      let fakeSocket2 = injectTestWebSocket("/ws/pow?session=" + testSession2.getSessionId(), "8.8.4.4");
      expect(testSession2.getSessionStatus()).to.equal("running", "unexpected session status");
      await testSession2.addReward(100n);
      fakeSocket1.emit("message", JSON.stringify({
        id: 42,
        action: "foundShare",
        data: {
          nonces: [ 1524 ],
          params: "scrypt|4096|8|1|16|11",
          hashrate: 12,
        }
      }));
      expect(fakeSocket1.isReady).to.equal(true, "client is not ready");
      await awaitSleepPromise(500, () => fakeSocket2.getSentMessage("verify").length > 0);
      let verifyMsg = fakeSocket2.getSentMessage("verify");
      expect(verifyMsg.length).to.equal(1, "unexpected number of verify messages sent");
      expect(verifyMsg[0].data.preimage).to.equal("oXwNMIuRUOc=", "invalid verify message: preimage missmatch");
      expect(verifyMsg[0].data.nonces[0]).to.equal(1524, "invalid verify message: nonces missmatch");
      await awaitSleepPromise(1500, () => fakeSocket1.getSentMessage("ok").length > 0);
      let okMsg2 = fakeSocket1.getSentMessage("ok");
      expect(okMsg2.length).to.equal(1, "no ok message sent");
      expect(okMsg2[0].rsp).to.equal(42, "invalid response id");
      let balanceMsg = fakeSocket2.getSentMessage("updateBalance");
      expect(balanceMsg.length).to.equal(1, "no updateBalance message sent");
      expect(balanceMsg[0].data.balance).to.equal("95", "invalid updateBalance message: unexpected balance");
      expect(balanceMsg[0].data.reason).to.matches(/verify miss/, "invalid updateBalance message: unexpected reason");
    });

  });

});