
import { ArgsOf, PCDPackage } from "@pcd/pcd-types"

export enum PCDRequestType {
  Get = "Get",
}

export interface PCDRequest {
  returnUrl: string
  type: PCDRequestType
}

export interface ProveOptions {
  genericProveScreen?: boolean;
  title?: string;
  description?: string;
  debug?: boolean;
  proveOnServer?: boolean;
  signIn?: boolean;
}

export interface PCDGetRequest<T extends PCDPackage = PCDPackage> extends PCDRequest {
  type: PCDRequestType.Get
  pcdType: T["name"]
  args: ArgsOf<T>
  options?: ProveOptions
}