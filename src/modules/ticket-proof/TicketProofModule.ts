import { ServiceManager } from "../../common/ServiceManager.js";
import { faucetConfig } from "../../config/FaucetConfig.js";
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
  /**
   * Sessions this process let through, per ticket, until the database knows them.
   *
   * The grant check reads the database, but a session only gets there after it
   * completed (the ticket row in SessionComplete, the session row by the lazy save),
   * and the session manager lists a session only once it is running. A burst of
   * starts with the same token overlaps that window: every start reads zero sessions
   * and every one gets the drop. So the module remembers the sessions it admitted
   * itself, synchronously before its first await, and counts them along with the
   * database rows. Failed sessions are forgotten on the next lookup, sessions the
   * database returns are dropped from here.
   */

  protected override async startModule(): Promise<void> {
    // a module with no signer or partner loads like any other (the module manager
    // enables every module from a bare config) but refuses every proof until configured
    if(!this.isConfigured())
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "ticket-proof module: signerAddress and partner are required, no proof will be accepted");

    this.ticketDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(TicketProofDB, this);
    this.ticketToken = new TicketProofToken(this.moduleName, this.moduleConfig.partner);

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
      this, ModuleHookAction.SessionAdmit, 2, "Ticket proof limit check",
      (session: FaucetSession) => this.processSessionAdmit(session)
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
      // decided here, before the hooks the perks skip; the concurrency limit and the
      // limits of the applied grants are checked on admission
      let perks: TicketProofGrantPerks = {};
      let appliedGrants: ITicketProofGrantConfig[] = [];
      for(let i = 0; i < this.moduleConfig.grants.length; i++) {
        if(await this.checkGrant(ticketInfo, this.moduleConfig.grants[i], perks, session))
          appliedGrants.push(this.moduleConfig.grants[i]);
      }
      session.setSessionModuleRef("ticketproof.grants", appliedGrants);

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

  // Runs one session at a time: the sessions admitted before are visible.
  private async processSessionAdmit(session: FaucetSession): Promise<void> {
    let ticketInfo = session.getSessionData<ITicketProofData>("ticketproof.data");
    if(!ticketInfo)
      return;
    this.checkLimit(ticketInfo, session);
    let appliedGrants = session.getSessionModuleRef("ticketproof.grants") as ITicketProofGrantConfig[] || [];
    for(let i = 0; i < appliedGrants.length; i++) {
      let limitMessage = await this.getGrantLimitMessage(ticketInfo, appliedGrants[i], session);
      if(limitMessage)
        throw new FaucetError("TICKETPROOF_LIMIT", limitMessage);
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

    let verdict = await verifyTicketProof(proof, {
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

  /**
   * The running sessions of a ticket that are not among `knownIds` (the database has those).
   * Running sessions are admitted ones; a session still starting is not admitted yet and is
   * checked on its own admission.
   */
  private getRunningSessions(identifier: string, session: FaucetSession, knownIds?: Set<string>): FaucetSession[] {
    return ServiceManager.GetService(SessionManager).getActiveSessions().filter((sess) => {
      if(sess === session || (knownIds && knownIds.has(sess.getSessionId())))
        return false;
      let ticketInfo = sess.getSessionData<ITicketProofData>("ticketproof.data");
      return !!ticketInfo && ticketInfo.identifier === identifier;
    });
  }

  // Applies the grant's perks when it is within its limits; returns whether it
  // did. A required grant over its limits fails the session.
  private async checkGrant(ticketData: ITicketProofData, grant: ITicketProofGrantConfig, perks: TicketProofGrantPerks, session: FaucetSession): Promise<boolean> {
    if(grant.tiers && grant.tiers.length > 0 && grant.tiers.indexOf(ticketData.tier) === -1)
      return false;

    let limitMessage = await this.getGrantLimitMessage(ticketData, grant, session);
    if(limitMessage) {
      if(!grant.required)
        return false;
      throw new FaucetError("TICKETPROOF_LIMIT", limitMessage);
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
    return true;
  }

  private async getGrantLimitMessage(ticketData: ITicketProofData, grant: ITicketProofGrantConfig, session: FaucetSession): Promise<string | null> {
    if(!(grant.limitCount > 0) && !(grant.limitAmount > 0))
      return null;
    let finishedSessions = await this.ticketDb.getTicketSessions(ticketData.identifier, grant.duration, true);
    let runningSessions = this.getRunningSessions(ticketData.identifier, session, new Set(finishedSessions.map((sess) => sess.sessionId)));
    let sessionCount = finishedSessions.length + runningSessions.length;

    if(grant.limitCount > 0 && sessionCount >= grant.limitCount) {
      return grant.message || [
        "You have already created ",
        sessionCount,
        (sessionCount > 1 ? " sessions" : " session"),
        " in the last ",
        renderTimespan(grant.duration)
      ].join("");
    }

    if(grant.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((sess) => totalAmount += BigInt(sess.dropAmount));
      // a running session has no final amount yet; assume the most it could get
      runningSessions.forEach((sess) => totalAmount += (sess.getDropAmount() > 0n ? sess.getDropAmount() : BigInt(faucetConfig.maxDropAmount)));
      if(totalAmount >= BigInt(grant.limitAmount)) {
        return grant.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(grant.duration)
        ].join("");
      }
    }
    return null;
  }

  private checkLimit(ticketData: ITicketProofData, session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;

    let concurrentSessionCount = this.getRunningSessions(ticketData.identifier, session).length;
    if(concurrentSessionCount >= this.moduleConfig.concurrencyLimit) {
      throw new FaucetError(
        "TICKETPROOF_CONCURRENCY_LIMIT",
        "Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per ticket",
      );
    }
  }

}
