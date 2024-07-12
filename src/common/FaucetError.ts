import { faucetConfig } from "../config/FaucetConfig.js";

export class FaucetError extends Error {
  private code: string;

  public constructor(code: string, message: string) {
    // faucetConfig.ethRpcHost is private and cannot be accessed from the outside
    const safeMessage = message.replaceAll(
      faucetConfig.ethRpcHost,
      "ETH_RPC_HOST"
    );
    super(safeMessage);
    this.code = code;
  }

  public toString(): string {
    return "[" + this.code + "] " + super.toString();
  }

  public getCode(): string {
    return this.code;
  }
}
