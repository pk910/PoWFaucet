import { IFaucetDialogProps } from "../components/shared/FaucetDialog";
import { FaucetApi } from "./FaucetApi";
import { FaucetSession } from "./FaucetSession";

export interface IFaucetContext {
  faucetApi: FaucetApi;
  activeSession?: FaucetSession;

  showNotification(type: string, message: string, time?: number|boolean, timeout?: number): number;
  hideNotification(notificationId: number): void;

  showDialog(dialogProps: IFaucetDialogProps): number;
  hideDialog(dialogId: number): void;

}
