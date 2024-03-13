
export enum PCDTypeName {
  EdDSATicket = "eddsa-ticket-pcd",
  SemaphoreIdentity = "semaphore-identity-pcd",
}

export enum ArgumentTypeName {
  String = "String",
  Number = "Number",
  BigInt = "BigInt",
  Boolean = "Boolean",
  Object = "Object",
  StringArray = "StringArray",
  PCD = "PCD",
  ToggleList = "ToggleList",
  Unknown = "Unknown"
}

export enum PCDRequestType {
  Get = "Get",
}

export interface PCDRequest {
  returnUrl: string;
  type: PCDRequestType;
}

export interface ProveOptions {
  genericProveScreen?: boolean;
  title?: string;
  description?: string;
  debug?: boolean;
  proveOnServer?: boolean;
  signIn?: boolean;
}

export interface PCDGetRequest
  extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: string;
  args: any;
  options?: ProveOptions;
}
