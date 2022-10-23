
import * as fs from 'fs';
import { faucetConfig } from "../common/FaucetConfig";
import { ServiceManager } from '../common/ServiceManager';
import { weiToEth } from '../utils/ConvertHelpers';
import { PoWSession, PoWSessionStatus } from '../websock/PoWSession';
import { EthWeb3Manager } from './EthWeb3Manager';
import { IIPInfo } from "./IPInfoResolver";

export class PoWRewardLimiter {
  private ipInfoMatchRestrictions: {}
  private ipInfoMatchRestrictionsRefresh: number;
  private balanceRestriction: number;
  private balanceRestrictionsRefresh: number;

  private refreshIpInfoMatchRestrictions() {
    let now = Math.floor((new Date()).getTime() / 1000);
    let refresh = faucetConfig.ipInfoMatchRestrictedRewardFile ? faucetConfig.ipInfoMatchRestrictedRewardFile.refresh : 30;
    if(this.ipInfoMatchRestrictionsRefresh > now - refresh)
      return;
    
    this.ipInfoMatchRestrictionsRefresh = now;
    this.ipInfoMatchRestrictions = Object.assign({}, faucetConfig.ipInfoMatchRestrictedReward);
    
    if(faucetConfig.ipInfoMatchRestrictedRewardFile && faucetConfig.ipInfoMatchRestrictedRewardFile.file && fs.existsSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file)) {
      fs.readFileSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file, "utf8").split(/\r?\n/).forEach((line) => {
        let match = /^([0-9]{1,2}): (.*)$/.exec(line);
        if(!match)
          return;
        this.ipInfoMatchRestrictions[match[2]] = parseInt(match[1]);
      });
    }
  }

  private getIPInfoString(ipaddr: string, ipinfo: IIPInfo, ethaddr: string) {
    let infoStr = [
      "ETH: " + ethaddr,
      "IP: " + ipaddr
    ];
    if(ipinfo) {
      infoStr.push(
        "Country: " + ipinfo.countryCode,
        "Region: " + ipinfo.regionCode,
        "City: " + ipinfo.city,
        "ISP: " + ipinfo.isp,
        "Org: " + ipinfo.org,
        "AS: " + ipinfo.as,
        "Proxy: " + (ipinfo.proxy ? "true" : "false"),
        "Hosting: " + (ipinfo.hosting ? "true" : "false")
      );
    }
    return infoStr.join("\n");
  }

  private refreshBalanceRestriction() {
    let now = Math.floor((new Date()).getTime() / 1000);
    if(this.balanceRestrictionsRefresh > now - 30)
      return;
      
    let faucetBalance = ServiceManager.GetService(EthWeb3Manager).getFaucetBalance();
    if(isNaN(faucetBalance)) {
      this.balanceRestriction = 100;
      return;
    }
    
    this.balanceRestrictionsRefresh = now;
    faucetBalance -= this.getUnclaimedBalance(); // subtract mined balance from active & claimable sessions
    
    this.balanceRestriction = Math.min(
      this.getStaticBalanceRestriction(faucetBalance),
      this.getDynamicBalanceRestriction(faucetBalance)
    );
  }

  public getUnclaimedBalance(): number {
    let unclaimedBalance = 0;
    PoWSession.getAllSessions().forEach((session) => {
      let sessionStatus = session.getSessionStatus();
      if(sessionStatus == PoWSessionStatus.CLAIMED)
        return;
      if(sessionStatus == PoWSessionStatus.SLASHED)
        return;
      if(sessionStatus == PoWSessionStatus.CLOSED && !session.isClaimable())
        return;
        unclaimedBalance += session.getBalance();
    });
    return unclaimedBalance;
  }

  private getStaticBalanceRestriction(balance: number): number {
    if(!faucetConfig.faucetBalanceRestrictedReward)
      return 100;

    let restrictedReward = 100;
    let minbalances = Object.keys(faucetConfig.faucetBalanceRestrictedReward).map((v) => parseInt(v)).sort((a, b) => a - b);
    let faucetBalance = weiToEth(balance);
    if(faucetBalance <= minbalances[minbalances.length - 1]) {
      for(let i = 0; i < minbalances.length; i++) {
        if(faucetBalance <= minbalances[i]) {
          let restriction = faucetConfig.faucetBalanceRestrictedReward[minbalances[i]];
          if(restriction < restrictedReward)
            restrictedReward = restriction;
        }
      }
    }

    return restrictedReward;
  }

  private getDynamicBalanceRestriction(balance: number): number {
    if(!faucetConfig.faucetBalanceRestriction || !faucetConfig.faucetBalanceRestriction.enabled)
      return 100;
    let targetBalance = faucetConfig.faucetBalanceRestriction.targetBalance * 1000000000000000000;
    if(balance >= targetBalance)
      return 100;
    if(balance <= faucetConfig.spareFundsAmount)
      return 0;

    let mineableBalance = balance - faucetConfig.spareFundsAmount;
    let balanceRestriction = 100 * mineableBalance / targetBalance;
    return balanceRestriction;
  }

  public getBalanceRestriction(): number {
    this.refreshBalanceRestriction();
    return this.balanceRestriction;
  }

  public getSessionRestriction(session: PoWSession): number {
    let restrictedReward = 100;
    let sessionIpInfo = session.getLastIpInfo();

    if(sessionIpInfo && faucetConfig.ipRestrictedRewardShare) {
      if(sessionIpInfo.hosting && typeof faucetConfig.ipRestrictedRewardShare.hosting === "number" && faucetConfig.ipRestrictedRewardShare.hosting < restrictedReward)
        restrictedReward = faucetConfig.ipRestrictedRewardShare.hosting;
      if(sessionIpInfo.proxy && typeof faucetConfig.ipRestrictedRewardShare.proxy === "number" && faucetConfig.ipRestrictedRewardShare.proxy < restrictedReward)
        restrictedReward = faucetConfig.ipRestrictedRewardShare.proxy;
      if(sessionIpInfo.countryCode && typeof faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] === "number" && faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] < restrictedReward)
        restrictedReward = faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode];
    }

    if(faucetConfig.ipInfoMatchRestrictedReward || faucetConfig.ipInfoMatchRestrictedRewardFile) {
      this.refreshIpInfoMatchRestrictions();
      let infoStr = this.getIPInfoString(session.getLastRemoteIp(), sessionIpInfo, session.getTargetAddr());
      Object.keys(this.ipInfoMatchRestrictions).forEach((pattern) => {
        if(infoStr.match(new RegExp(pattern, "mi")) && this.ipInfoMatchRestrictions[pattern] < restrictedReward)
          restrictedReward = this.ipInfoMatchRestrictions[pattern];
      });
    }
    
    return restrictedReward;
  }

  public getShareReward(session: PoWSession): number {
    let shareReward = faucetConfig.powShareReward;

    if(faucetConfig.faucetBalanceRestrictedReward) {
      // apply balance restriction if faucet wallet is low on funds
      let balanceRestriction = this.getBalanceRestriction();
      if(balanceRestriction < 100)
        shareReward = Math.floor(shareReward / 100 * balanceRestriction);
    }

    let restrictedReward = this.getSessionRestriction(session);
    if(restrictedReward < 100)
      shareReward = Math.floor(shareReward / 100 * restrictedReward);

    return shareReward;
  }

  public getVerificationReward(session: PoWSession): number {
    let shareReward = faucetConfig.verifyMinerReward;

    if(faucetConfig.faucetBalanceRestrictedReward) {
      // apply balance restriction if faucet wallet is low on funds
      let balanceRestriction = this.getBalanceRestriction();
      if(balanceRestriction < 100)
        shareReward = Math.floor(shareReward / 100 * balanceRestriction);
    }

    let restrictedReward = this.getSessionRestriction(session);
    if(restrictedReward < 100)
      shareReward = Math.floor(shareReward / 100 * restrictedReward);

    return shareReward;
  }
  
}
