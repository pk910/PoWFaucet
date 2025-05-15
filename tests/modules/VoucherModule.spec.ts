import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { IVoucherConfig } from '../../src/modules/voucher/VoucherConfig.js';
import { IVoucher, VoucherDB } from '../../src/modules/voucher/VoucherDB.js';
import { FaucetSessionStatus } from '../../src/session/FaucetSession.js';
import { VoucherModule } from '../../src/modules/voucher/VoucherModule.js';
import { BaseDriver } from '../../src/db/driver/BaseDriver.js';


describe("Faucet module: voucher", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("Check client config exports", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
      voucherLabel: "Voucher",
      infoHtml: "Voucher info",
    } as IVoucherConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['voucher']).to.equal(true, "no voucher config exported");
    expect(clientConfig.modules['voucher'].voucherLabel).to.equal("Voucher", "client config mismatch: voucherLabel");
    expect(clientConfig.modules['voucher'].infoHtml).to.equal("Voucher info", "client config mismatch: infoHtml");
  });

  it("Process session start with valid voucher code", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
    } as IVoucherConfig;
    await ServiceManager.GetService(ModuleManager).initialize();

    const voucherModule = ServiceManager.GetService(ModuleManager).getModule<VoucherModule>("voucher");
    const voucherDb = (voucherModule as any).voucherDb as VoucherDB;
    const faucetDb = (voucherDb as any).db as BaseDriver;
    
    await faucetDb.run(
      "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, ?, ?, ?)",
      ["VALID123", "1000000000000000000", null, null, null]
    );
    
    // Create session with valid voucher code
    const testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      voucherCode: "VALID123"
    });
    
    // Verify session was created successfully
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    
    // Verify voucher was updated in the database
    const voucher = await voucherDb.getVoucher("VALID123") as IVoucher;

    expect(!!voucher).to.equal(true, "voucher not found");
    expect(voucher.sessionId).to.equal(testSession.getSessionId(), "voucher not updated with session ID");
    expect(voucher.targetAddr).to.equal(testSession.getTargetAddr(), "voucher not updated with target address");
    
    // Verify drop amount was set from voucher
    expect(testSession.getSessionData("overrideMaxDropAmount")).to.equal("1000000000000000000", "drop amount not overridden");
  });
  
  it("Process session start without voucher code", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    
    // Try to create session without voucher code
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337"
      });
    } catch(ex) {
      error = ex;
    }
    
    // Verify correct error was thrown
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("VOUCHER_REQUIRED", "unexpected error code");
  });
  
  it("Process session start with invalid voucher code", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
      voucherLabel: "Voucher",
      infoHtml: "Voucher info",
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    
    // Try to create session with invalid voucher code
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        voucherCode: "INVALID123"
      });
    } catch(ex) {
      error = ex;
    }
    
    // Verify correct error was thrown
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("VOUCHER_INVALID", "unexpected error code");
  });
  
  it("Process session start with already used voucher code", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
      voucherLabel: "Voucher",
      infoHtml: "Voucher info",
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    
    // Get voucher module and voucher DB
    const dbService = ServiceManager.GetService(FaucetDatabase);
    const voucherModule = ServiceManager.GetService(ModuleManager).getModule<VoucherModule>("voucher");
    const voucherDb = (voucherModule as any).voucherDb as VoucherDB;
    const faucetDb = (voucherDb as any).db as BaseDriver;
    
    // Create a used voucher in the database (with session info)
    const usedSessionId = "existing-session-id";
    await faucetDb.run(
      "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, ?, ?, ?)",
      ["USED123", "1000000000000000000", usedSessionId, "0x0000000000000000000000000000000000000123", 123456789]
    );
    
    // Create a completed session in the sessions table
    await dbService.updateSession({
      sessionId: usedSessionId,
      status: FaucetSessionStatus.FINISHED,
      startTime: 123456789,
      targetAddr: "0x0000000000000000000000000000000000000123",
      dropAmount: "1000000000000000000",
      remoteIP: "1.2.3.4",
      tasks: [],
      data: {},
      claim: null
    });
    
    // Try to create a new session with the used voucher code
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        voucherCode: "USED123"
      });
    } catch(ex) {
      error = ex;
    }
    
    // Verify correct error was thrown
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("VOUCHER_USED", "unexpected error code");
  });
  
  it("Allow reuse of voucher if previous session failed", async () => {
    // Setup config
    faucetConfig.modules["voucher"] = {
      enabled: true,
      voucherLabel: "Voucher",
      infoHtml: "Voucher info",
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    
    // Get voucher module and voucher DB
    const dbService = ServiceManager.GetService(FaucetDatabase);
    const voucherModule = ServiceManager.GetService(ModuleManager).getModule<VoucherModule>("voucher");
    const voucherDb = (voucherModule as any).voucherDb as VoucherDB;
    const faucetDb = (voucherDb as any).db as BaseDriver;
    
    // Create a voucher used in a failed session
    const failedSessionId = "failed-session-id";
    await faucetDb.run(
      "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, ?, ?, ?)",
      ["FAILED123", "1000000000000000000", failedSessionId, "0x0000000000000000000000000000000000000123", 123456789]
    );
    await dbService.updateSession({
      sessionId: failedSessionId,
      status: FaucetSessionStatus.FAILED,
      startTime: 123456789,
      targetAddr: "0x0000000000000000000000000000000000000123",
      dropAmount: "1000000000000000000",
      remoteIP: "1.2.3.4",
      tasks: [],
      data: {},
      claim: null
    });
    
    // Create session with voucher code from a failed session
    const testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      voucherCode: "FAILED123"
    });
    
    // Verify session was created successfully
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    
    // Verify voucher was updated
    const voucher = await voucherDb.getVoucher("FAILED123") as IVoucher;
    expect(!!voucher).to.equal(true, "voucher not found");
    expect(voucher.sessionId).to.equal(testSession.getSessionId(), "voucher not updated with new session ID");
  });

  it("Process session start with voucher without drop amount", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
      voucherLabel: "Voucher",
      infoHtml: "Voucher info",
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    
    // Get voucher module and voucher DB
    const voucherModule = ServiceManager.GetService(ModuleManager).getModule<VoucherModule>("voucher");
    const voucherDb = (voucherModule as any).voucherDb as VoucherDB;
    const faucetDb = (voucherDb as any).db as BaseDriver;
    
    // Create a voucher in the database without drop amount
    await faucetDb.run(
      "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, ?, ?, ?)",
      ["NODROP123", "", null, null, null]
    );
    
    // Create session with voucher that has no drop amount
    const testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      voucherCode: "NODROP123"
    });
    
    // Verify session was created successfully
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    
    // Verify voucher was updated
    const voucher = await voucherDb.getVoucher("NODROP123") as IVoucher;
    expect(!!voucher).to.equal(true, "voucher not found");
    expect(voucher.sessionId).to.equal(testSession.getSessionId(), "voucher not updated with session ID");
    
    // Verify drop amount was not set (should be undefined)
    expect(testSession.getSessionData("overrideMaxDropAmount")).to.be.undefined;
  });

  it("Handle race condition when submitting the same voucher simultaneously", async () => {
    faucetConfig.modules["voucher"] = {
      enabled: true,
    } as IVoucherConfig;
    
    await ServiceManager.GetService(ModuleManager).initialize();
    
    // Get voucher module and voucher DB
    const voucherModule = ServiceManager.GetService(ModuleManager).getModule<VoucherModule>("voucher");
    const voucherDb = (voucherModule as any).voucherDb as VoucherDB;
    const faucetDb = (voucherDb as any).db as BaseDriver;
    
    // Create a voucher in the database
    await faucetDb.run(
      "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, ?, ?, ?)",
      ["RACE123", "1000000000000000000", null, null, null]
    );
    
    // Try to create two sessions with the same voucher code simultaneously
    const sessionManager = ServiceManager.GetService(SessionManager);
    
    // Start two session creations at the same time
    const session1Promise = sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      voucherCode: "RACE123"
    });
    
    const session2Promise = sessionManager.createSession("::ffff:8.8.8.9", {
      addr: "0x0000000000000000000000000000000000001338",
      voucherCode: "RACE123"
    });
    
    // Wait for both to complete
    let successCount = 0;
    let errorCount = 0;
    let errorCode = "";
    
    try {
      await session1Promise;
      successCount++;
    } catch (ex) {
      errorCount++;
      if (ex instanceof FaucetError) {
        errorCode = ex.getCode();
      }
    }
    
    try {
      await session2Promise;
      successCount++;
    } catch (ex) {
      errorCount++;
      if (ex instanceof FaucetError) {
        errorCode = ex.getCode();
      }
    }
    
    // Verify only one session succeeded and one failed with VOUCHER_USED
    expect(successCount).to.equal(1, "expected exactly one session to succeed");
    expect(errorCount).to.equal(1, "expected exactly one session to fail");
    expect(errorCode).to.equal("VOUCHER_USED", "expected failure with VOUCHER_USED error code");
    
    // Verify the voucher was updated with the correct session info
    const voucher = await voucherDb.getVoucher("RACE123") as IVoucher;
    expect(!!voucher).to.equal(true, "voucher not found");
    expect(!!voucher.sessionId).to.equal(true, "voucher not updated with session ID");
  });
});