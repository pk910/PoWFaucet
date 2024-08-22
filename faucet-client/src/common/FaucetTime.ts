export class FaucetTime {
  private offset: number;

  public constructor() {
    this.offset = 0;
  }

  public syncTimeOffset(remoteTime: number) {
    let localTime = Math.floor(new Date().getTime() / 1000);
    this.offset = localTime - remoteTime;
  }

  public getLocalDate(): Date {
    return new Date();
  }

  public getLocalTime(): number {
    return Math.floor(this.getLocalDate().getTime() / 1000);
  }

  public getSyncedDate(): Date {
    let localDate = new Date();
    return new Date(localDate.getTime() - this.offset * 1000);
  }

  public getSyncedTime(): number {
    return Math.floor(this.getSyncedDate().getTime() / 1000);
  }
}
