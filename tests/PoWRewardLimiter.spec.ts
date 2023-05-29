import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import YAML from 'yaml'
import { awaitSleepPromise, bindTestStubs, FakeWebSocket, unbindTestStubs } from './common';
import { PoWSession } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { PoWRewardLimiter } from '../src/services/PoWRewardLimiter';
import { getNewGuid } from '../src/utils/GuidUtils';
import { PoWClient } from '../src/websock/PoWClient';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';
import { PoWOutflowLimiter } from '../src/services/PoWOutflowLimiter';
import { IPInfoResolver } from '../src/services/IPInfoResolver';
import { sleepPromise } from '../src/utils/SleepPromise';

describe("Reward Restrictions", () => {
  let globalStubs;

  beforeEach(() => {
    globalStubs = bindTestStubs({
      "FaucetStoreDB.getKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "getKeyValueEntry"),
      "FaucetStoreDB.setKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "setKeyValueEntry"),
      "FaucetStoreDB.deleteKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "deleteKeyValueEntry"),
      "FaucetStoreDB.setSessionMark": sinon.stub(FaucetStoreDB.prototype, "setSessionMark"),
    });
    loadFaucetConfig(true);
    faucetConfig.faucetStats = null;
    setTestConfig();
  });
  afterEach(() => {
    return unbindTestStubs();
  });

  function setTestConfig() {
    faucetConfig.powShareReward = 1000000000000000000; // 1 ETH
    faucetConfig.verifyMinerMissPenaltyPerc = 10; // 0.1 ETH
    faucetConfig.verifyMinerRewardPerc = 20; // 0.2 ETH
    faucetConfig.spareFundsAmount = 0; // 0 ETH
    faucetConfig.ipRestrictedRewardShare = {};
    faucetConfig.ipInfoMatchRestrictedReward = {};
    faucetConfig.ipInfoMatchRestrictedRewardFile = {
      yaml: null,
      refresh: 5,
    };
    faucetConfig.faucetBalanceRestrictedReward = {};
    faucetConfig.faucetBalanceRestriction = {
      enabled: false,
      targetBalance: 1000, // 1000 ETH
    };
    faucetConfig.faucetOutflowRestriction = {
      enabled: false,
      amount: 100000000000000000000, // 100 ETH
      duration: 10,
      lowerLimit: -50000000000000000000, // -50 ETH
      upperLimit: 50000000000000000000, // 50 ETH
    };
  }

  function tmpFile(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }

  function createTestSession(): PoWSession {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - 42;
    let session = new PoWSession(client, {
      id: getNewGuid(),
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "CIogLzT0cLA=",
      balance: "0",
      nonce: 0,
      ident: "xyz-zyx",
    });
    return session;
  }

  it("check global static balance restriction (no restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(1000000000000000000000n); // 1000 ETH
    faucetConfig.faucetBalanceRestrictedReward = {
      999: 50,
      500: 25,
      250: 10
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(1000000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(200000000000000000n, "unexpected getVerificationReward");
  });

  it("check global static balance restriction (50% restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(900000000000000000000n); // 900 ETH
    faucetConfig.faucetBalanceRestrictedReward = {
      999: 50,
      500: 25,
      250: 10
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });

  it("check global static balance restriction (25% restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(550000000000000000000n); // 550 ETH
    session.addBalance(50000000000000000000n); // 50 ETH
    faucetConfig.faucetBalanceRestrictedReward = {
      999: 50,
      500: 25,
      250: 10
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(250000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(50000000000000000n, "unexpected getVerificationReward");
  });

  it("check global dynamic balance restriction (no restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(1000000000000000000000n); // 1000 ETH
    faucetConfig.faucetBalanceRestriction = {
      enabled: true,
      targetBalance: 1000,
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(1000000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(200000000000000000n, "unexpected getVerificationReward");
  });

  it("check global dynamic balance restriction (50% restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(500000000000000000000n); // 500 ETH
    faucetConfig.faucetBalanceRestriction = {
      enabled: true,
      targetBalance: 1000,
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });

  it("check global dynamic balance restriction (25% restriction)", async () => {
    let session = createTestSession();
    globalStubs["EthWalletManager.getFaucetBalance"].returns(300000000000000000000n); // 300 ETH
    session.addBalance(50000000000000000000n); // 50 ETH
    faucetConfig.faucetBalanceRestriction = {
      enabled: true,
      targetBalance: 1000,
    };
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(250000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(50000000000000000n, "unexpected getVerificationReward");
  });

  it("check global outflow restriction (no restriction)", async () => {
    let session = createTestSession();
    faucetConfig.faucetOutflowRestriction = {
      enabled: true,
      amount: 100000000000000000000, // 100 ETH
      duration: 10,
      lowerLimit: -50000000000000000000,
      upperLimit: 50000000000000000000,
    };
    let rewardLimiter = new PoWRewardLimiter();
    let outflowLimiter = ServiceManager.GetService(PoWOutflowLimiter);
    expect(outflowLimiter.getOutflowBalance()).equal(0n, "unexpected outflow balance");
    expect(rewardLimiter.getShareReward(session)).equal(1000000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(200000000000000000n, "unexpected getVerificationReward");
  });

  it("check global outflow restriction (50% restriction)", async () => {
    let session = createTestSession();
    faucetConfig.faucetOutflowRestriction = {
      enabled: true,
      amount: 100000000000000000000, // 100 ETH
      duration: 10,
      lowerLimit: -50000000000000000000, // -50 ETH
      upperLimit: 50000000000000000000, // 50 ETH
    };
    let rewardLimiter = new PoWRewardLimiter();
    let outflowLimiter = ServiceManager.GetService(PoWOutflowLimiter);
    outflowLimiter.addMinedAmount(25000000000000000000n); // 25 ETH
    expect(outflowLimiter.getOutflowBalance()).equal(-25000000000000000000n, "unexpected outflow balance");
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });

  it("check global outflow restriction (exceeding upperLimit)", async () => {
    let session = createTestSession();
    faucetConfig.faucetOutflowRestriction = {
      enabled: true,
      amount: 100000000000000000000, // 100 ETH
      duration: 10,
      lowerLimit: -50000000000000000000, // -50 ETH
      upperLimit: 50000000000000000000, // 50 ETH
    };
    let rewardLimiter = new PoWRewardLimiter();
    let outflowLimiter = ServiceManager.GetService(PoWOutflowLimiter);
    // hack into private state to decrease the track time by 15sec.
    // that's equivalent to 150ETH, so it's definetly exceeding the upperLimit of 50ETH
    (outflowLimiter as any).outflowState.trackTime -= 15;
    outflowLimiter.addMinedAmount(0n); // trigger re-calculation after state hack
    let outflowState = outflowLimiter.getOutflowDebugState();
    expect(outflowLimiter.getOutflowBalance()).equal(50000000000000000000n, "unexpected outflow balance");
    expect(outflowState.dustAmount).equal("0", "unexpected outflow dust balance");
    expect(outflowState.trackTime).equal(outflowState.now - 5, "unexpected outflow track time");
    expect(rewardLimiter.getShareReward(session)).equal(1000000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(200000000000000000n, "unexpected getVerificationReward");
  });

  it("check session restriction (no restriction)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    faucetConfig.ipRestrictedRewardShare = {
      hosting: 100,
      US: 100,
    };
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(1000000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(200000000000000000n, "unexpected getVerificationReward");
  });

  it("check session restriction (50% restriction)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    faucetConfig.ipRestrictedRewardShare = {
      hosting: 50,
      US: 75,
    };
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });
  

  it("check session restriction (50% restriction, lazy loaded)", async () => {
    let session = createTestSession();
    faucetConfig.ipRestrictedRewardShare = {
      hosting: 50,
      proxy: 60,
      US: 75,
    };
    await awaitSleepPromise(200, () => !!session.getLastIpInfo());
    session.updateRewardRestriction();
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });

  it("check session restriction (50% restriction, info pattern)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    faucetConfig.ipInfoMatchRestrictedReward = {
      "^.*Google.*$": 50
    };
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
  });

  it("check session restriction (50% restriction, info pattern file)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    let patternFile = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.ipInfoMatchRestrictedRewardFile = {
      yaml: patternFile,
      refresh: 5,
    };
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let restrictions = {
      restrictions: [
        {
          pattern: "^.*Google.*$",
          reward: 50,
          message: "test message",
          blocked: true
        }
      ]
    };
    fs.writeFileSync(patternFile, YAML.stringify(restrictions));
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
    let restriction = rewardLimiter.getSessionRestriction(session);
    expect(restriction.blocked).equal("close", "unexpected blocked value in restriction");
    expect(restriction.messages.length).equal(1, "unexpected number of messages in restriction");
    expect(restriction.messages[0].text).equal("test message", "unexpected message text in restriction");
    fs.unlinkSync(patternFile);
  });

  it("check session restriction (25% restriction, info pattern file)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    let patternFile1 = tmpFile("powfaucet-", "-ipinfo.txt");
    let patternFile2 = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.ipInfoMatchRestrictedRewardFile = {
      yaml: [patternFile1, patternFile2],
      refresh: 5,
    };
    ipInfo.proxy = true;
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let restrictions1 = {
      restrictions: [
        {
          pattern: "^.*Google.*$",
          reward: 90,
          msgkey: "key1",
          message: "test message 1",
          notify: true
        }
      ]
    };
    let restrictions2 = {
      restrictions: [
        {
          pattern: "^Proxy: true$",
          reward: 75,
          blocked: "close"
        },
        {
          pattern: "^.*0x0000000000000000000000000000000000001337.*$",
          reward: 25,
          msgkey: "key2",
          message: "test message 2",
          blocked: "kill"
        }
      ]
    };
    fs.writeFileSync(patternFile1, YAML.stringify(restrictions1));
    fs.writeFileSync(patternFile2, YAML.stringify(restrictions2));
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(250000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(50000000000000000n, "unexpected getVerificationReward");
    let restriction = rewardLimiter.getSessionRestriction(session);
    expect(restriction.blocked).equal("kill", "unexpected blocked value in restriction");
    expect(restriction.messages.length).equal(2, "unexpected number of messages in restriction");
    expect(restriction.messages[0].text).equal("test message 1", "unexpected message text in restriction");
    expect(restriction.messages[0].notify).equal(true, "unexpected message notify in restriction");
    expect(restriction.messages[0].key).equal("key1", "unexpected message key in restriction");
    expect(restriction.messages[1].text).equal("test message 2", "unexpected message text in restriction");
    expect(restriction.messages[1].key).equal("key2", "unexpected message key in restriction");
    fs.unlinkSync(patternFile1);
    fs.unlinkSync(patternFile2);
  });

  it("check session restriction (external yaml refresh)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    let patternFile = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.ipInfoMatchRestrictedRewardFile = {
      yaml: patternFile,
      refresh: 1,
    };
    ipInfo.proxy = true;
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let restrictions1 = {
      restrictions: [
        {
          pattern: "^.*Google.*$",
          reward: 90,
          msgkey: "key1",
          message: "test message 1",
          notify: true
        }
      ]
    };
    let restrictions2 = {
      restrictions: [
        {
          pattern: "^Proxy: true$",
          reward: 75,
          blocked: "close"
        },
        {
          pattern: "^.*0x0000000000000000000000000000000000001337.*$",
          reward: 25,
          msgkey: "key2",
          message: "test message 2",
          blocked: "kill"
        }
      ]
    };

    fs.writeFileSync(patternFile, YAML.stringify(restrictions1));
    let rewardLimiter = new PoWRewardLimiter();
    let restriction = rewardLimiter.getSessionRestriction(session);
    expect(rewardLimiter.getShareReward(session)).equal(900000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(180000000000000000n, "unexpected getVerificationReward");
    expect(restriction.messages.length).equal(1, "unexpected number of messages in restriction");
    expect(restriction.messages[0].text).equal("test message 1", "unexpected message text in restriction");
    expect(restriction.messages[0].notify).equal(true, "unexpected message notify in restriction");
    expect(restriction.messages[0].key).equal("key1", "unexpected message key in restriction");

    fs.writeFileSync(patternFile, YAML.stringify(restrictions2));
    await sleepPromise(2200);
    session.updateRewardRestriction();

    restriction = rewardLimiter.getSessionRestriction(session);
    expect(rewardLimiter.getShareReward(session)).equal(250000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(50000000000000000n, "unexpected getVerificationReward");
    expect(restriction.blocked).equal("kill", "unexpected blocked value in restriction");
    expect(restriction.messages.length).equal(1, "unexpected number of messages in restriction");
    expect(restriction.messages[0].text).equal("test message 2", "unexpected message text in restriction");
    expect(restriction.messages[0].key).equal("key2", "unexpected message key in restriction");

    fs.unlinkSync(patternFile);
  }).timeout(5000);

  it("check session restriction (50% restriction, pattern list file)", async () => {
    let ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo("8.8.8.8");
    let session = createTestSession();
    let patternFile = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.ipInfoMatchRestrictedRewardFile = {
      file: patternFile,
      refresh: 5,
    };
    session.setLastIpInfo(session.getLastRemoteIp(), ipInfo);
    let restrictions = [
      "junk_line",
      "50: ^.*Google.*$"
    ];
    fs.writeFileSync(patternFile, restrictions.join("\n"));
    let rewardLimiter = new PoWRewardLimiter();
    expect(rewardLimiter.getShareReward(session)).equal(500000000000000000n, "unexpected getShareReward");
    expect(rewardLimiter.getVerificationReward(session)).equal(100000000000000000n, "unexpected getVerificationReward");
    fs.unlinkSync(patternFile);
  });

});
