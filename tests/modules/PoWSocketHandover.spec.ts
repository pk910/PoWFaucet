import 'mocha';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, waitFor } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { FaucetHttpServer } from '../../src/webserv/FaucetHttpServer.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { IPoWConfig, PoWHashAlgo } from '../../src/modules/pow/PoWConfig.js';
import { RawWsClient } from '../helpers/RawWsClient.js';

/**
 * the PoW hand-over has the same shape another module's gateway had, where the
 * client's first frame was read by the main process and never reached the worker. PoW
 * only escaped it because its client's first message comes long after the handshake.
 *
 * This drives the real endpoint over real TCP with a client that sends immediately.
 */
describe("Faucet module: pow (socket hand-over)", () => {
  let globalStubs;
  let bridge: http.Server;
  let port: number;
  let clients: RawWsClient[] = [];

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();

    faucetConfig.modules["pow"] = {
      enabled: true,
      powShareReward: 10,
      powSessionTimeout: 600,
      powHashAlgo: PoWHashAlgo.SCRYPT,
      powScryptParams: { cpuAndMemory: 4096, blockSize: 8, parallelization: 1, keyLength: 16 },
      powDifficulty: 11,
    } as IPoWConfig;
    await ServiceManager.GetService(ModuleManager).initialize();

    // a real listening socket, so the hand-over is a real fd hand-over
    bridge = http.createServer();
    bridge.on("upgrade", (req, socket, head) => {
      let faucetHttpServer: any = ServiceManager.GetService(FaucetHttpServer);
      let endpoint = Object.values(faucetHttpServer.wssEndpoints)
        .find((entry: any) => entry.pattern.test(req.url)) as any;
      if(!endpoint) {
        socket.destroy();
        return;
      }
      endpoint.rawHandler(req, socket, head, "8.8.8.8");
    });
    await new Promise<void>((resolve) => bridge.listen(0, "127.0.0.1", resolve));
    port = (bridge.address() as AddressInfo).port;
  });

  afterEach(async () => {
    clients.forEach((client) => client.destroy());
    clients = [];
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
  });

  async function connect(sessionId: string, firstFrame?: Uint8Array): Promise<RawWsClient> {
    let client = new RawWsClient();
    clients.push(client);
    await client.connect(port, "/ws/pow?session=" + sessionId + "&cliver=2.5.1", firstFrame);
    return client;
  }

  /** The PoW client protocol is JSON text frames; an unknown action is answered with an error. */
  function probeFrame(id: number): Uint8Array {
    return Buffer.from(JSON.stringify({ action: "handover-probe", id: id }));
  }

  function findReply(client: RawWsClient, id: number): any {
    for(let frame of client.frames) {
      try {
        let message = JSON.parse(frame.toString());
        if(message && message.rsp === id)
          return message;
      } catch(ex) { /* not for us */ }
    }
    return null;
  }

  it("delivers a first frame that arrived with the upgrade request, 50 times", async function() {
    this.timeout(120000);

    for(let i = 0; i < 50; i++) {
      let session = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      // written in the same tick as the HTTP request, so it reaches the faucet as the
      // upgrade head or as a segment arriving while the socket is being handed over
      let client = await connect(session.getSessionId(), probeFrame(i));

      let answered = await waitFor(8000, () => findReply(client, i) !== null || client.closed);
      expect(answered).to.equal(true, "iteration " + i + ": no answer (status " + client.statusLine + ")");
      expect(client.closed).to.equal(false, "iteration " + i + ": connection was closed");
      expect(findReply(client, i).action).to.equal("error", "iteration " + i + ": unexpected reply");
      client.destroy();
    }
  });

  it("delivers a first frame sent right after the handshake, 50 times", async function() {
    this.timeout(120000);

    for(let i = 0; i < 50; i++) {
      let session = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      let client = await connect(session.getSessionId());
      client.send(probeFrame(i));

      expect(await waitFor(8000, () => findReply(client, i) !== null || client.closed))
        .to.equal(true, "iteration " + i + ": no answer (status " + client.statusLine + ")");
      expect(findReply(client, i).action).to.equal("error", "iteration " + i + ": unexpected reply");
      client.destroy();
    }
  });
});
