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

}
