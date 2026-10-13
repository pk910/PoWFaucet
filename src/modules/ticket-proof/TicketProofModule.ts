import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, ITicketProofConfig, ITicketProofGrantConfig } from './TicketProofConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { renderTimespan } from "../../utils/DateUtils.js";
import { FaucetWebApi, IFaucetApiUrl } from "../../webserv/FaucetWebApi.js";
import { IncomingMessage } from "http";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";
import { SessionManager } from "../../session/SessionManager.js";
import { TicketProofDB } from './TicketProofDB.js';
import { ITicketProofData, TicketProofToken } from './TicketProofToken.js';
import { parseTicketProof, verifyTicketProof } from './TicketProofVerifier.js';

export interface TicketProofGrantPerks {
  factor?: number;
  skipModules?: string[];
  overrideMaxDrop?: number;
}

/**
 * Event ticket login through partner ticket proofs.
 *
 * The event app mints a signed, pseudonymous proof for one ticket and sends the
 * attendee to the faucet with it in the query string. `ticketProofLogin` swaps it for a
 * faucet token; the session start reads the token and applies the configured grants
 * per ticket, like the zupass module does per attendee.
 */
export class TicketProofModule extends BaseModule<ITicketProofConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private ticketDb: TicketProofDB;
  private ticketToken: TicketProofToken;

  protected override async startModule(): Promise<void> {
    // a module with no signer or partner loads like any other (the module manager
    // enables every module from a bare config) but refuses every proof until configured
    if(!this.isConfigured())
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "ticket-proof module: signerAddress and partner are required, no proof will be accepted");

    this.ticketDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(TicketProofDB, this);
    this.ticketToken = new TicketProofToken(this.moduleName);

    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "Ticket proof login config",
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          partner: this.moduleConfig.partner,
          events: this.moduleConfig.events,
          appUrl: this.moduleConfig.appUrl,
          appLabel: this.moduleConfig.appLabel,
          loginLogo: this.moduleConfig.loginLogo,
          loginLabel: this.moduleConfig.loginLabel,
          userLabel: this.moduleConfig.userLabel,
          infoHtml: this.moduleConfig.infoHtml,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 2, "Ticket proof login check",
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 5, "Ticket proof save session",
      (session: FaucetSession) => this.processSessionComplete(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "Ticket proof reward factor",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "ticketProofLogin",
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processTicketProofLogin(req, url, body)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("ticketProofLogin");
    return Promise.resolve();
  }

  private isConfigured(): boolean {
    return !!this.moduleConfig.signerAddress && !!this.moduleConfig.partner;
  }

  public getTicketDb(): TicketProofDB {
    return this.ticketDb;
  }

  public getTicketToken(): TicketProofToken {
    return this.ticketToken;
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    let ticketInfo: ITicketProofData | null = null;
    if(userInput.ticketProofToken) {
      ticketInfo = typeof userInput.ticketProofToken === "string" ? this.ticketToken.parse(userInput.ticketProofToken) : null;
      if(!ticketInfo) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Invalid ticket proof login token from " + session.getRemoteIP());
        throw new FaucetError(
          "TICKETPROOF_TOKEN",
          "Invalid ticket login token",
        );
      }
      if(this.moduleConfig.tokenValidity > 0 && ticketInfo.issuedAt + this.moduleConfig.tokenValidity < Math.floor(Date.now() / 1000)) {
        throw new FaucetError(
          "TICKETPROOF_TOKEN_EXPIRED",
          "Your ticket login has expired, please request a new proof in the event app.",
        );
      }
    }

    if(this.moduleConfig.requireLogin && !ticketInfo) {
      throw new FaucetError(
        "TICKETPROOF_REQUIRED",
        "You need to authenticate with your event ticket to use this faucet.",
      );
    }

    if(ticketInfo) {
      this.checkLimit(ticketInfo, session);

      let perks: TicketProofGrantPerks = {};
      for(let i = 0; i < this.moduleConfig.grants.length; i++) {
        await this.checkGrant(ticketInfo, this.moduleConfig.grants[i], perks);
      }

      session.setSessionData("ticketproof.data", {
        identifier: ticketInfo.identifier,
        tier: ticketInfo.tier,
        event: ticketInfo.event,
      });
      if(typeof perks.factor === "number")
        session.setSessionData("ticketproof.factor", perks.factor);
      if(typeof perks.overrideMaxDrop === "number")
        session.setSessionData("overrideMaxDropAmount", perks.overrideMaxDrop.toString());
      if(perks.skipModules) {
        let skipModules = session.getSessionData<Array<string>>("skip.modules", []);
        perks.skipModules.forEach((mod) => {
          if(!mod)
            return;
          if(skipModules.indexOf(mod) === -1)
            skipModules.push(mod);
        });
        session.setSessionData("skip.modules", skipModules);
      }
    }
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    let ticketInfo = session.getSessionData<ITicketProofData>("ticketproof.data");
    if(!ticketInfo)
      return;

    await this.ticketDb.setTicketSession(session.getSessionId(), ticketInfo.identifier, ticketInfo.tier, ticketInfo.event);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    let ticketFactor = session.getSessionData("ticketproof.factor");
    if(typeof ticketFactor !== "number")
      return;
    rewardFactors.push({
      factor: ticketFactor,
      module: this.moduleName,
    });
  }

  /**
   * Swap a proof for a faucet login token.
   *
   * The proof arrives as the query string the event app built, posted by the client
   * as json (query parameters are accepted too, for a hand-made link). The answer is
   * the same shape the zupass callback uses, so the client can share its handling.
   */
  private async processTicketProofLogin(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let params: {[key: string]: unknown} = Object.assign({}, url.query);
    if(body && body.length > 0) {
      try {
        let bodyJson = JSON.parse(body.toString("utf8"));
        if(bodyJson && typeof bodyJson === "object")
          params = Object.assign(params, bodyJson);
      } catch(ex) {
        return { errorCode: "PROOF_INVALID", errorMessage: "Invalid request body." };
      }
    }

    if(!this.isConfigured())
      return { errorCode: "PROOF_NOT_CONFIGURED", errorMessage: "Ticket login is not configured on this faucet." };

    let proof = parseTicketProof(params);
    if(!proof)
      return { errorCode: "PROOF_INVALID", errorMessage: "Missing or malformed ticket proof." };

    let verdict = verifyTicketProof(proof, {
      signerAddress: this.moduleConfig.signerAddress,
      domain: this.moduleConfig.domain,
      version: this.moduleConfig.version,
      partner: this.moduleConfig.partner,
      events: this.moduleConfig.events || [],
      tiers: this.moduleConfig.tiers || [],
    });
    if(verdict.valid === false) {
      // the identifier is a pseudonym and the signature is a bearer: log neither
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Rejected ticket proof (" + verdict.code + ", event " + proof.event + ", tier " + proof.tier + ")");
      return { errorCode: verdict.code, errorMessage: verdict.reason };
    }

    let data: ITicketProofData = {
      identifier: proof.identifier,
      tier: proof.tier,
      event: proof.event,
      issuedAt: Math.floor(Date.now() / 1000),
      token: "",
    };
    data.token = this.ticketToken.generate(data);
    return { data: data };
  }

  private async checkGrant(ticketData: ITicketProofData, grant: ITicketProofGrantConfig, perks: TicketProofGrantPerks): Promise<void> {
    if(grant.tiers && grant.tiers.length > 0 && grant.tiers.indexOf(ticketData.tier) === -1)
      return;

    let finishedSessions = await this.ticketDb.getTicketSessions(ticketData.identifier, grant.duration, true);

    if(grant.limitCount > 0 && finishedSessions.length >= grant.limitCount) {
      if(!grant.required)
        return;
      let errMsg = grant.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"),
        " in the last ",
        renderTimespan(grant.duration)
      ].join("");
      throw new FaucetError(
        "TICKETPROOF_LIMIT",
        errMsg,
      );
    }

    if(grant.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((session) => totalAmount += BigInt(session.dropAmount));
      if(totalAmount >= BigInt(grant.limitAmount)) {
        if(!grant.required)
          return;
        let errMsg = grant.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(grant.duration)
        ].join("");
        throw new FaucetError(
          "TICKETPROOF_LIMIT",
          errMsg,
        );
      }
    }

    // apply perks
    if(grant.skipModules) {
      perks.skipModules = grant.skipModules
    }
    if(typeof grant.rewardFactor === "number") {
      perks.factor = grant.rewardFactor;
    }
    if(typeof grant.overrideMaxDrop !== "undefined") {
      perks.overrideMaxDrop = grant.overrideMaxDrop;
    }
  }

  private checkLimit(ticketData: ITicketProofData, session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;

    let activeSessions = ServiceManager.GetService(SessionManager).getActiveSessions();
    let concurrentSessionCount = activeSessions.filter((sess) => {
      if(sess === session)
        return false;
      let ticketInfo = sess.getSessionData<ITicketProofData>("ticketproof.data");
      if(!ticketInfo)
        return false;
      return ticketInfo.identifier === ticketData.identifier;
    }).length;

    if(concurrentSessionCount >= this.moduleConfig.concurrencyLimit) {
      throw new FaucetError(
        "TICKETPROOF_CONCURRENCY_LIMIT",
        "Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per ticket",
      );
    }
  }

}
