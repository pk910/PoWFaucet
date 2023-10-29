import { IBaseModuleConfig } from "../BaseModule";

export interface IZupassConfig extends IBaseModuleConfig {
  zupassUrl: string | null;
  zupassApiUrl: string | null;
  zupassWatermark: string;
  zupassExternalNullifier: string;
  redirectUrl: string | null;
  requireLogin: boolean;
  concurrencyLimit: number;
  event: IZupassEventConfig | null;
  verify: {
    signer?: string[];
    productId?: string[];
    eventId?: string[];
  };
  grants: IZupassGrantConfig[];
}

export interface IZupassEventConfig {
  name: string;
  eventIds: string[];
  productIds: string[];
}

export interface IZupassGrantConfig {
  limitCount: number;
  limitAmount: number;
  duration: number;
  skipModules?: string[];
  rewardFactor?: number;
  required?: boolean;
  message?: string;
}

export const defaultConfig: IZupassConfig = {
  enabled: false,
  zupassUrl: null,
  zupassApiUrl: null,
  zupassWatermark: "powfaucet challenge",
  zupassExternalNullifier: "powfaucet",
  redirectUrl: null,
  requireLogin: false,
  concurrencyLimit: 0,
  event: null,
  verify: null,
  grants: [],
}
