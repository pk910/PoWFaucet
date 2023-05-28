import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, FakeWebSocket, unbindTestStubs } from './common';
import { PoWSession } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { PoWRewardLimiter } from '../src/services/PoWRewardLimiter';
import { getNewGuid } from '../src/utils/GuidUtils';
import { PoWClient } from '../src/websock/PoWClient';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';
import { PoWOutflowLimiter } from '../src/services/PoWOutflowLimiter';

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
    PoWSession.resetSessionData();
    ServiceManager.ClearAllServices();
    unbindTestStubs();
  });

  function setTestConfig() {
    faucetConfig.powShareReward = 1000000000000000000; // 1 ETH
    faucetConfig.verifyMinerMissPenaltyPerc = 10; // 0.1 ETH
    faucetConfig.verifyMinerRewardPerc = 20; // 0.2 ETH
    faucetConfig.spareFundsAmount = 0; // 0 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(1000000000000000000000n); // 1000 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(900000000000000000000n); // 900 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(550000000000000000000n); // 550 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(1000000000000000000000n); // 1000 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(500000000000000000000n); // 500 ETH
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
    globalStubs["EthWeb3Manager.getFaucetBalance"].returns(300000000000000000000n); // 300 ETH
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

});
