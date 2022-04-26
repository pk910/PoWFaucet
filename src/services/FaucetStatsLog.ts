
import * as fs from 'fs';
import * as path from 'path';
import { faucetConfig } from '../common/FaucetConfig';
import { PoWSession } from '../websock/PoWSession';
import { ClaimTx } from './EthWeb3Manager';

export class FaucetStatsLog {
  private enabled: boolean;
  private statsFile: string;

  public constructor() {
    if(faucetConfig.faucetStats) {
      this.enabled = true;
      this.statsFile = path.join(faucetConfig.appBasePath, faucetConfig.faucetStats.logfile || "faucet-stats.log");
    }
    else {
      this.enabled = false;
    }
  }

  private addStatsEntry(type: string, data: any) {
    if(!this.enabled)
      return;
    let now = Math.floor((new Date()).getTime() / 1000);
    let entry = type + " " + now + " " + JSON.stringify(data) + "\n";
    fs.appendFileSync(this.statsFile, entry);
  }

  public addSessionStats(session: PoWSession) {
    let ipinfo = session.getLastIpInfo();
    this.addStatsEntry("SESS", {
      st: Math.floor(session.getStartTime().getTime() / 1000),
      ip: session.getLastRemoteIp(),
      to: session.getTargetAddr(),
      val: session.getBalance(),
      hr: Math.round(session.getReportedHashRate()),
      no: session.getLastNonce(),
      loc: ipinfo ? {
        c: ipinfo.countryCode,
        r: ipinfo.regionCode,
        h: ipinfo.hosting ? 1 : undefined,
        p: ipinfo.proxy ? 1 : undefined,
      } : null,
      id: session.getSessionId(),
    });
  }

  public addClaimStats(claim: ClaimTx) {
    this.addStatsEntry("CLAIM", {
      to: claim.target,
      val: claim.amount,
      sess: claim.session,
    });
  }

}
