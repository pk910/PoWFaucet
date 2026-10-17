import { IFaucetDialogProps } from "../components/shared/FaucetDialog";
import { PoWMinerWorkerSrc } from "../types/PoWMinerSrc";
import { FaucetApi } from "./FaucetApi";
import { FaucetSession } from "./FaucetSession";

export interface IFaucetContextUrls {
  baseUrl: string;
  apiUrl: string;
  wsBaseUrl: string; 
  minerSrc: PoWMinerWorkerSrc;
  imagesUrl: string;
}

/**
 * What a page puts into the card's one header: its own title instead of the faucet's, a meta
 * line instead of the claim range, a status pill at the right. Unset fields keep the default.
 */
export interface IPageHeader {
  title?: string;
  meta?: string;
  pill?: {
    text: string;
    kind?: "live" | "info" | "warn" | "crit" | "";
  };
}

export interface IFaucetContext {
  faucetUrls: IFaucetContextUrls;
  faucetApi: FaucetApi;
  activeSession?: FaucetSession;

  showStatusAlert(level: string, prio: number, body: React.ReactElement): number;
  hideStatusAlert(alertId: number): void

  showNotification(type: string, message: string, time?: number|boolean, timeout?: number): number;
  hideNotification(notificationId: number): void;

  showDialog(dialogProps: IFaucetDialogProps): number;
  hideDialog(dialogId: number): void;
  getContainer(): HTMLElement;

  refreshConfig(): void;

  /** the page's header, or null to show the faucet's own again */
  setPageHeader(header: IPageHeader | null): void;

}
