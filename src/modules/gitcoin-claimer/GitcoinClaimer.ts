// Gitcoin Passport API has known limits by default, so we need to comsider that when implementing this module.
// For example, allow to run getScore and submitPassport only once per X minutes.
// By default X will be 2 minutes.
// More about rate limits here:
// https://docs.passport.xyz/building-with-passport/passport-api/api-reference#rate-limits

import LRUCache from "lru-cache";
import { z } from "zod";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import {
  EthWalletManager,
  TransactionPromiseResult,
  TransactionResult,
} from "../../eth/EthWalletManager.js";
import { FetchUtil } from "../../utils/FetchUtil.js";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { zodSchemaBodyValidation } from "../../utils/zodSchemaBodyValidation.js";
import { SessionManager } from "../../session/SessionManager.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { ModuleManager } from "../ModuleManager.js";
import { RecurringLimitsModule } from "../recurring-limits/RecurringLimitsModule.js";
import { isValidAddress } from "ethereumjs-util";
import { nowSeconds } from "../../utils/DateUtils.js";
import { FaucetError } from "../../common/FaucetError.js";

type Address = string;

type ScoreResponse = {
  address: Address;
  score: string;
  status: "DONE" | "PROCESSING";
  last_score_timestamp: string;
  expiration_date: string;
  evidence: {
    type: string;
    success: boolean;
    rawScore: string;
    threshold: string;
  } | null;
  error: string | null;
  stamp_scores: Record<string, string> | null;
};

const zodGitcoinSigningMessage = z.object({
  message: z.string(),
  nonce: z.string(),
});

type GitcoinSigningMessage = Required<z.infer<typeof zodGitcoinSigningMessage>>;

const zodPassportSubmitData = z.object({
  address: z.string(),
});

type PassportSubmitData = Required<z.infer<typeof zodPassportSubmitData>>;

// Cache for Gitcoin scores. We need it to avoid multiple requests to the Gitcoin API.
const GitcoinScoreCache = new LRUCache<Address, number>({
  ttl: 1000 * 60 * 2, // 2 minutes
  ttlAutopurge: true,
});

const GitcoinPassportSubmissions = new LRUCache<
  Address,
  {
    timestamp: number;
  }
>({
  ttl: 1000 * 60 * 5, // 5 minutes
  ttlAutopurge: true,
});

class GitcoinAPI {
  private baseUrl: string = "https://api.scorer.gitcoin.co";
  private accessToken: string;
  private scorerId: string;
  private headers: Record<string, string>;

  constructor(accessToken: string, scorerId: string) {
    if (!accessToken)
      throw new FaucetError(
        "GITCOIN_API_ERROR",
        "Gitcoin API access token is required"
      );
    if (!scorerId)
      throw new FaucetError(
        "GITCOIN_API_ERROR",
        "Gitcoin API scorer ID is required"
      );
    this.accessToken = accessToken;
    this.scorerId = scorerId;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": `${this.accessToken}`,
    };
  }

  public async getScore(address: Address): Promise<{
    value: number;
    needToSubmit: boolean;
  }> {
    const cachedScore = GitcoinScoreCache.get(address);
    if (cachedScore) {
      return {
        value: cachedScore,
        needToSubmit: false,
      };
    }

    const headers = this.headers;
    const url = `${this.baseUrl}/registry/score/${this.scorerId}/${address}`;
    const response = await FetchUtil.fetch(url, {
      headers,
      method: "GET",
    });

    // Handle errors
    if (response.status !== 200) {
      let reason = response.statusText;
      try {
        const respBody = (await response.json()) as any;
        if (respBody.detail && typeof respBody.detail === "string") {
          reason = respBody.detail;
        }
      } catch (e) {}

      return { value: 0, needToSubmit: true };
    }

    const score = (await response.json()) as ScoreResponse;
    const scoreNumber = Number(score.score);
    GitcoinScoreCache.set(address, scoreNumber);
    return {
      value: scoreNumber,
      needToSubmit: false,
    };
  }

  public async getSigningMessage(): Promise<GitcoinSigningMessage> {
    const url = `${this.baseUrl}/registry/score/${this.scorerId}/signing-message`;
    const response = await FetchUtil.fetch(url, {
      headers: this.headers,
      method: "GET",
    });

    // Not ok
    if (response.status !== 200) {
      const errorMessage = `Failed to get Gitcoin signing message: ${response.statusText}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        errorMessage
      );
      throw new FaucetError("GITCOIN_API_ERROR", errorMessage);
    }

    const signingMessage = (await response.json()) as GitcoinSigningMessage;
    return signingMessage;
  }

  public async submitPassport(
    passport: Omit<PassportSubmitData, "scorer_id">
  ): Promise<{ result: "success" }> {
    const url = `${this.baseUrl}/registry/submit-passport`;

    const response = await FetchUtil.fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        address: passport.address,
        scorer_id: this.scorerId,
      }),
    });

    // Not ok
    if (response.status !== 200) {
      const errorMessage = `Failed to submit Gitcoin passport for address ${passport.address}: ${response.statusText}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        errorMessage
      );
      throw new FaucetError("GITCOIN_API_ERROR", errorMessage);
    }

    // Cache the submission
    GitcoinPassportSubmissions.set(passport.address, {
      timestamp: Date.now(),
    });

    return { result: "success" };
  }
}

function makeGitcoinClaimerError(
  reason: "disabled" | "noScorerId" | "noApiToken"
) {
  let code = "GITCOIN_CLAIM_INIT";
  let reasonText = "";
  //
  switch (reason) {
    case "disabled": {
      reasonText = "Gitcoin claimer is disabled";
      break;
    }
    case "noScorerId": {
      reasonText = "Gitcoin API scorer ID is required (gitcoinScorerId)";
      break;
    }
    case "noApiToken": {
      reasonText = "Gitcoin API access token is required (gitcoinApiToken)";
      break;
    }
  }

  return new FaucetError(code, reasonText);
}

export class GitcoinClaimer {
  private _isEnabled: boolean = false;
  private _db: FaucetDatabase;
  private _ethWallet: EthWalletManager;
  private _gitcoinApi: GitcoinAPI;
  private _sessionManager: SessionManager;
  private _moduleManager: ModuleManager;
  // Set of users currently claiming Gitcoin rewards
  private _currentlyClaimingUsers: Set<string> = new Set();

  public async initialize(): Promise<void> {
    // Check if the Gitcoin claimer is enabled
    const gitcoinClaimerEnabled = faucetConfig.gitcoinClaimerEnabled;
    this._isEnabled = gitcoinClaimerEnabled;

    const gitcoinApiToken = faucetConfig.gitcoinApiToken;
    const gitcoinScorerId = faucetConfig.gitcoinScorerId;
    if (this._isEnabled && !gitcoinApiToken)
      throw makeGitcoinClaimerError("noApiToken");
    if (this._isEnabled && !gitcoinScorerId)
      throw makeGitcoinClaimerError("noScorerId");

    this._db = ServiceManager.GetService(FaucetDatabase);
    this._ethWallet = ServiceManager.GetService(EthWalletManager);
    this._gitcoinApi = new GitcoinAPI(gitcoinApiToken, gitcoinScorerId);
    this._sessionManager = ServiceManager.GetService(SessionManager);
    this._moduleManager = ServiceManager.GetService(ModuleManager);
  }

  public isEnabled(): boolean {
    return this._isEnabled;
  }

  // TODO: Implement decorator/HoF for guarding methods
  private guard() {
    if (!this._isEnabled) {
      throw makeGitcoinClaimerError("disabled");
    }
  }

  public async getAddressScore(body: Buffer): Promise<{
    value: number;
    needToSubmit: boolean;
  }> {
    this.guard();
    const validated = zodSchemaBodyValidation(
      body,
      z.object({ address: z.string() })
    );
    const result = await this._gitcoinApi.getScore(validated.address);
    return result;
  }

  public async getSingingMessage(): Promise<GitcoinSigningMessage> {
    this.guard();
    return this._gitcoinApi.getSigningMessage();
  }

  public async submitPassport(body: Buffer): Promise<{
    result: "pending" | "success";
    canSubmitAt?: number;
  }> {
    this.guard();
    const validated = zodSchemaBodyValidation(
      body,
      zodPassportSubmitData
    ) as PassportSubmitData;

    // Validate address
    if (!isValidAddress(validated.address)) {
      throw new FaucetError(
        "GITCOIN_ADDRESS_ERROR",
        "Invalid address for Gitcoin passport submission"
      );
    }

    const cachedSubmission = GitcoinPassportSubmissions.get(validated.address);
    if (cachedSubmission) {
      const canSubmitAt = cachedSubmission.timestamp + 1000 * 60 * 5; // 5 minutes from the last submission
      return {
        result: "pending",
        canSubmitAt,
      };
    }

    const result = await this._gitcoinApi.submitPassport(validated);
    return result;
  }

  public async checkIfUserCanClaimGitcoin(
    userId: string,
    remoteIP: string
  ): Promise<{ can: boolean; reason: string }> {
    this.guard();
    const activeSessions = this._sessionManager
      .getActiveSessions()
      .filter((activeSession) => {
        return activeSession.getUserId() === userId;
      });

    if (activeSessions.length > 0) {
      return {
        can: false,
        reason:
          "Please stop your active mining session before claiming Gitcoin rewards",
      };
    }

    const recurringLimitsModule =
      this._moduleManager.getModule<RecurringLimitsModule>("recurring-limits");
    const time = await recurringLimitsModule?.getTimeToNewSessionStart(
      userId,
      remoteIP
    );
    if (time > 0) {
      return { can: false, reason: "User has reached the limit of sessions" };
    }

    // Any claimable sessions at that moment?
    const claimableSessions = await ServiceManager.GetService(
      FaucetDatabase
    ).getClaimableSessions(userId);
    if (claimableSessions.length > 0) {
      return {
        can: false,
        reason: "User already has claimable mining sessions",
      };
    }

    return { can: true, reason: "No limiting conditions" };
  }

  public async claimGitcoin(
    body: Buffer,
    userId: string,
    remoteIP: string
  ): Promise<string> {
    this.guard();
    // Check address score
    const { value: score } = await this.getAddressScore(body);

    // Check if the score is enough
    if (score < faucetConfig.gitcoinMinimumScore) {
      throw new FaucetError(
        "GITCOIN_CLAIM_ERROR",
        `Gitcoin score is too low: ${score} (minimum required: ${faucetConfig.gitcoinMinimumScore})`
      );
    }
    // Check if can claim
    const { can: canClaim, reason } = await this.checkIfUserCanClaimGitcoin(
      userId,
      remoteIP
    );
    if (!canClaim) {
      throw new FaucetError("GITCOIN_CLAIM_ERROR", reason);
    }

    // Extract target address
    let targetAddress: string;
    const validatedTargetAddress = zodSchemaBodyValidation(
      body,
      z.object({ address: z.string() })
    );

    // Validate more
    if (
      !validatedTargetAddress.address ||
      !isValidAddress(validatedTargetAddress.address)
    ) {
      const message = `GITCOIN_CLAIM_ERROR: Invalid target address by user ${userId}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        message
      );
      throw new FaucetError("GITCOIN_CLAIM_ERROR", message);
    }
    targetAddress = validatedTargetAddress.address;

    // Check if the user is already claiming
    if (this._hasClaimingByUser(userId)) {
      throw new FaucetError(
        "GITCOIN_CLAIM_ERROR",
        "User is already claiming Gitcoin rewards"
      );
    }

    // Add user to the claiming set
    this._addClaimingByUser(userId);
    const clearClaiming = () => this._removeClaimingByUser(userId);

    // Create claim record
    let claimRecordId;
    try {
      claimRecordId = await this._db.createGitcoinClaim(
        userId,
        targetAddress,
        remoteIP
      );
    } catch (ex) {
      const message = `Failed to create GitcoinClaim record: ${
        ex.message
      } || ${JSON.stringify(ex)}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        message
      );
      clearClaiming();
      throw new FaucetError("GITCOIN_CLAIM_ERROR", message);
    }
    // If no Uuid returned, throw an error
    if (!claimRecordId) {
      clearClaiming();
      throw new FaucetError(
        "GITCOIN_CLAIM_ERROR",
        "Failed to create GitcoinClaim record. Returned null value."
      );
    }

    // Send transaction
    let transactionResult: TransactionResult;
    try {
      transactionResult = await this._ethWallet.sendGitcoinClaimTx(
        targetAddress
      );
    } catch (ex) {
      clearClaiming();
      // If the transaction fails, delete the claim record
      await this._db.deleteGitcoinClaimRecord(claimRecordId);
      // Log and throw
      const message = `Failed to send GitcoinClaim transaction: ${
        ex.message
      } || ${JSON.stringify(ex)}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        message
      );
      throw new FaucetError("GITCOIN_CLAIM_ERROR", message);
    }

    const txHash = transactionResult.txHash;
    // If the transaction is successful, update the claim record
    try {
      await this._db.updateGitcoinClaimRecordTxHash(claimRecordId, txHash);
    } catch (ex) {
      // Log and throw
      const message = `Failed to update GitcoinClaim record with txHash: ${
        ex.message
      } || ${JSON.stringify(ex)}`;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        message
      );
      clearClaiming();
      throw new FaucetError("GITCOIN_CLAIM_ERROR", message);
    }

    clearClaiming();
    return txHash;
  }

  private _addClaimingByUser(userId: string) {
    this._currentlyClaimingUsers.add(userId);
  }

  private _removeClaimingByUser(userId: string) {
    this._currentlyClaimingUsers.delete(userId);
  }

  private _hasClaimingByUser(userId: string) {
    return this._currentlyClaimingUsers.has(userId);
  }
}
