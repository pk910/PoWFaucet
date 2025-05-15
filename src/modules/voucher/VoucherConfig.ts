import { IBaseModuleConfig } from "../BaseModule.js";

export interface IVoucherConfig extends IBaseModuleConfig {
  voucherLabel: string | null;
  infoHtml: string | null;
}

export const defaultConfig: IVoucherConfig = {
  enabled: false,
  voucherLabel: null,
  infoHtml: null,
}
