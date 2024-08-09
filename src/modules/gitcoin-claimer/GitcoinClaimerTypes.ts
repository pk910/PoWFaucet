export enum GitcoinClaimStatus {
  DONE = "DONE",
  PROCESSING = "PROCESSING",
}

export type GitcoinClaimTableType = {
  Uuid: string;
  UserId: string;
  TargetAddress: string;
  TxHash: string;
  Status: GitcoinClaimStatus;
  DateCreated: number;
  DateUpdated: number;
  DateClaimed: number;
  DropAmount: string;
  RemoteIP: string;
};
