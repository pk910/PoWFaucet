import { FaucetError } from "../../common/FaucetError.js";

const INIT_ERRORS_REASONS = {
  disabled: "Gitcoin claimer is disabled",
  noScorerId: "Gitcoin API scorer ID is required (gitcoinScorerId)",
  noApiToken: "Gitcoin API access token is required (gitcoinApiToken)",
};

export function makeGitcoinClaimerError(
  reason: "disabled" | "noScorerId" | "noApiToken"
) {
  return new FaucetError("GITCOIN_CLAIM_INIT", INIT_ERRORS_REASONS[reason]);
}
