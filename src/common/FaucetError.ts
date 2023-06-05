
export class FaucetError extends Error {
  private code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }

  public toString(): string {
    return "[" + this.code + "] " + super.toString();
  }

  public getCode(): string {
    return this.code;
  }
}
