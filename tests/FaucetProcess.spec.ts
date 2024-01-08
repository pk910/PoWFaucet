import 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../src/common/FaucetProcess.js';
import { sleepPromise } from '../src/utils/PromiseUtils.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';


describe("Faucet Process", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
      "process.exit": sinon.stub(process, "exit"),
    });
    loadDefaultTestConfig();
  });
  afterEach(async () => {
    ServiceManager.GetService(FaucetProcess).dispose();
    await unbindTestStubs(globalStubs);
  });

  function tmpFile(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }


  it("Check process event handler: uncaughtException", async () => {
    var originalException = process.listeners('uncaughtException').pop()
    process.removeListener('uncaughtException', originalException as any);
    after(() => {
      process.listeners('uncaughtException').push(originalException as any)
    });
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    setTimeout(function() {
      throw new Error("test error");
    });
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(1, "process.exit not called");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("ERROR", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/unhandled exception/, "missing log entry");
  });

  it("Check process event handler: unhandledRejection", async () => {
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    new Promise((resolve, reject) => {
      setTimeout(function() {
        reject();
      });
    });
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(0, "process.exit has been called");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("ERROR", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/unhandled rejection/, "missing log entry");
  });

  it("Check process event handler: SIGUSR1", async () => {
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    let reloadFired = false;
    ServiceManager.GetService(FaucetProcess).on("reload", () => {
      reloadFired = true;
    });
    process.kill(process.pid, "SIGUSR1");
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(0, "process.exit has been called");
    expect(reloadFired).to.equal(true, "missing reload event");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("INFO", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/SIGURS1 signal/, "missing log entry");
  });

  it("Check process event handler: SIGINT", async () => {
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    process.kill(process.pid, "SIGINT");
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(1, "process.exit not called");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("INFO", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/SIGINT signal/, "missing log entry");
  });

  it("Check process event handler: SIGQUIT", async () => {
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    process.kill(process.pid, "SIGQUIT");
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(1, "process.exit not called");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("INFO", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/SIGQUIT signal/, "missing log entry");
  });

  it("Check process event handler: SIGTERM", async () => {
    await ServiceManager.GetService(FaucetProcess).initialize();
    globalStubs["FaucetProcess.emitLog"] = sinon.stub(FaucetProcess.prototype, "emitLog");
    process.kill(process.pid, "SIGTERM");
    await sleepPromise(10);
    expect(globalStubs["process.exit"].callCount).to.equal(1, "process.exit not called");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[0]).to.equal("INFO", "missing log entry");
    expect(globalStubs["FaucetProcess.emitLog"].getCall(0).args[1]).to.match(/SIGTERM signal/, "missing log entry");
  });

  it("Check logging: stdout", async () => {
    let faucetProcess = ServiceManager.GetService(FaucetProcess);
    await faucetProcess.initialize();
    faucetProcess.hideLogOutput = false;
    globalStubs["console.log"] = sinon.stub(console, "log");
    faucetProcess.emitLog(FaucetLogLevel.INFO, "test log message");
    expect(globalStubs["console.log"].getCall(0).args[0]).to.match(/test log message/, "missing console.log call");
  });

  it("Check logging: file", async () => {
    faucetConfig.faucetLogFile = tmpFile("powfaucet-", "-log.txt");
    let faucetProcess = ServiceManager.GetService(FaucetProcess);
    await faucetProcess.initialize();
    faucetProcess.emitLog(FaucetLogLevel.INFO, "test log message");
    expect(fs.existsSync(faucetConfig.faucetLogFile)).to.equal(true, "log file not found");
    let logData = fs.readFileSync(faucetConfig.faucetLogFile, "utf8");
    expect(logData).to.match(/test log message/, "missing console.log call");
  });

  it("Check pid file", async () => {
    faucetConfig.faucetPidFile = tmpFile("powfaucet-", "-pid.txt");
    let faucetProcess = ServiceManager.GetService(FaucetProcess);
    await faucetProcess.initialize();
    expect(fs.existsSync(faucetConfig.faucetPidFile)).to.equal(true, "pid file not found");
    let pidData = fs.readFileSync(faucetConfig.faucetPidFile, "utf8");
    expect(pidData).to.equal(process.pid.toString(), "pid does not match");
  });

  
});
