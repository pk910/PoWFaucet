import { GitcoinClaimTableType } from "./GitcoinClaimerTypes";

export const GitcoinClaimsColumns: Array<keyof GitcoinClaimTableType> = [
  "Uuid",
  "UserId",
  "TargetAddress",
  "TxHash",
  "Status",
  "DateCreated",
  "DateUpdated",
  "DropAmount",
  "DateClaimed",
  "RemoteIP",
] as const;
