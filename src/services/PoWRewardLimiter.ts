
import * as fs from 'fs';
import YAML from 'yaml'
import { faucetConfig, IFacuetRestrictionConfig } from "../common/FaucetConfig";
import { ServiceManager } from '../common/ServiceManager';
import { PoWSession, PoWSessionStatus } from '../websock/PoWSession';
import { EthClaimManager } from './EthClaimManager';
import { EthWalletManager } from './EthWalletManager';
import { IIPInfo } from "./IPInfoResolver";
import { PoWOutflowLimiter } from './PoWOutflowLimiter';

export interface IPoWRewardRestriction {
  reward: number;
  messages: {
    key: string;
    text: string;
    notify: boolean|string;
  }[];
  blocked: false|"close"|"kill";
}

export class PoWRewardLimiter {
  private ipInfoMatchRestrictions: [pattern: string, restriction: number | IFacuetRestrictionConfig][];
  private ipInfoMatchRestrictionsRefresh: number;
  private balanceRestriction: number;
  private balanceRestrictionsRefresh: number;

  public refreshIpInfoMatchRestrictions(force?: boolean) {
    let now = Math.floor((new Date()).getTime() / 1000);
    let refresh = faucetConfig.ipInfoMatchRestrictedRewardFile ? faucetConfig.ipInfoMatchRestrictedRewardFile.refresh : 30;
    if(this.ipInfoMatchRestrictionsRefresh > now - refresh && !force)
      return;
    
    this.ipInfoMatchRestrictionsRefresh = now;
    this.ipInfoMatchRestrictions = [];
    Object.keys(faucetConfig.ipInfoMatchRestrictedReward).forEach((pattern) => {
      this.ipInfoMatchRestrictions.push([pattern, faucetConfig.ipInfoMatchRestrictedReward[pattern]]);
    });
    
    if(faucetConfig.ipInfoMatchRestrictedRewardFile && faucetConfig.ipInfoMatchRestrictedRewardFile.file && fs.existsSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file)) {
      // load restrictions list
      fs.readFileSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file, "utf8").split(/\r?\n/).forEach((line) => {
        let match = /^([0-9]{1,2}): (.*)$/.exec(line);
        if(!match)
          return;
        this.ipInfoMatchRestrictions.push([match[2], parseInt(match[1])]);
      });
    }
    if(faucetConfig.ipInfoMatchRestrictedRewardFile && faucetConfig.ipInfoMatchRestrictedRewardFile.yaml) {
      // load yaml file
      if(Array.isArray(faucetConfig.ipInfoMatchRestrictedRewardFile.yaml))
        faucetConfig.ipInfoMatchRestrictedRewardFile.yaml.forEach((file) => this.refreshIpInfoMatchRestrictionsFromYaml(file));
      else
        this.refreshIpInfoMatchRestrictionsFromYaml(faucetConfig.ipInfoMatchRestrictedRewardFile.yaml);
    }
  }

  private refreshIpInfoMatchRestrictionsFromYaml(yamlFile: string) {
    if(!fs.existsSync(yamlFile))
      return;
    
    let yamlSrc = fs.readFileSync(yamlFile, "utf8");
    let yamlObj = YAML.parse(yamlSrc);

    if(Array.isArray(yamlObj.restrictions)) {
      yamlObj.restrictions.forEach((entry) => {
        let pattern = entry.pattern;
        delete entry.pattern;
        this.ipInfoMatchRestrictions.push([pattern, entry]);
      })
    }
  }

  private wrapFactorRestriction(restriction: number | IFacuetRestrictionConfig): IFacuetRestrictionConfig {
    if(typeof restriction === "number") {
      return {
        reward: restriction,
      };
    }
    return restriction;
  }

  private getIPInfoString(session: PoWSession, ipinfo: IIPInfo) {
    let infoStr = [
      "ETH: " + session.getTargetAddr(),
      "IP: " + session.getLastRemoteIp(),
      "Ident: " + session.getIdent(),
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
      
    let faucetBalance = ServiceManager.GetService(EthWalletManager).getFaucetBalance();
    if(faucetBalance === null)
      return;
    
    this.balanceRestrictionsRefresh = now;
    faucetBalance -= this.getUnclaimedBalance(); // subtract mined balance from active & claimable sessions
    faucetBalance -= ServiceManager.GetService(EthClaimManager).getQueuedAmount(); // subtract pending transaction amounts
    
    this.balanceRestriction = Math.min(
      this.getStaticBalanceRestriction(faucetBalance),
      this.getDynamicBalanceRestriction(faucetBalance)
    );
  }

  public getUnclaimedBalance(): bigint {
    let unclaimedBalance = 0n;
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

  private getStaticBalanceRestriction(balance: bigint): number {
    if(!faucetConfig.faucetBalanceRestrictedReward)
      return 100;

    let restrictedReward = 100;
    let minbalances = Object.keys(faucetConfig.faucetBalanceRestrictedReward).map((v) => parseInt(v)).sort((a, b) => a - b);
    let faucetBalance = ServiceManager.GetService(EthWalletManager).decimalUnitAmount(balance);
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

  private getDynamicBalanceRestriction(balance: bigint): number {
    if(!faucetConfig.faucetBalanceRestriction || !faucetConfig.faucetBalanceRestriction.enabled)
      return 100;
    let targetBalance = BigInt(faucetConfig.faucetBalanceRestriction.targetBalance) * BigInt(Math.pow(10, ServiceManager.GetService(EthWalletManager).getFaucetDecimals()));
    if(balance >= targetBalance)
      return 100;
    if(balance <= faucetConfig.spareFundsAmount)
      return 0;

    let mineableBalance = balance - BigInt(faucetConfig.spareFundsAmount);
    let balanceRestriction = parseInt((mineableBalance * 100000n / targetBalance).toString()) / 1000;
    return balanceRestriction;
  }

  public getBalanceRestriction(): number {
    this.refreshBalanceRestriction();
    return this.balanceRestriction;
  }

  public getSessionRestriction(session: PoWSession): IPoWRewardRestriction {
    let restriction: IPoWRewardRestriction = {
      reward: 100,
      messages: [],
      blocked: false,
    };
    let msgKeyDict = {};
    let sessionIpInfo = session.getLastIpInfo();

    let applyRestriction = (restr: number | IFacuetRestrictionConfig) => {
      restr = this.wrapFactorRestriction(restr);
      if(restr.reward < restriction.reward)
        restriction.reward = restr.reward;
      if(restr.blocked) {
        if(restr.blocked === "close" && !restriction.blocked)
          restriction.blocked = restr.blocked;
        else if(restr.blocked === "kill")
          restriction.blocked = restr.blocked;
        else if(restr.blocked === true && !restriction.blocked)
          restriction.blocked = "close";
      }
      if(restr.message && (!restr.msgkey || !msgKeyDict.hasOwnProperty(restr.msgkey))) {
        if(restr.msgkey)
          msgKeyDict[restr.msgkey] = true;
        restriction.messages.push({
          text: restr.message,
          notify: restr.notify,
          key: restr.msgkey,
        });
      }
    };

    if(sessionIpInfo && faucetConfig.ipRestrictedRewardShare) {
      if(sessionIpInfo.hosting && faucetConfig.ipRestrictedRewardShare.hosting)
        applyRestriction(faucetConfig.ipRestrictedRewardShare.hosting);
      if(sessionIpInfo.proxy && faucetConfig.ipRestrictedRewardShare.proxy)
        applyRestriction(faucetConfig.ipRestrictedRewardShare.proxy);
      if(sessionIpInfo.countryCode && typeof faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] !== "undefined")
        applyRestriction(faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode]);
    }

    if(faucetConfig.ipInfoMatchRestrictedReward || faucetConfig.ipInfoMatchRestrictedRewardFile) {
      this.refreshIpInfoMatchRestrictions();
      let infoStr = this.getIPInfoString(session, sessionIpInfo);
      this.ipInfoMatchRestrictions.forEach((entry) => {
        if(infoStr.match(new RegExp(entry[0], "mi"))) {
          applyRestriction(entry[1]);
        }
      });
    }
    
    return restriction;
  }


  public getShareReward(session: PoWSession): bigint {
    let shareReward = BigInt(faucetConfig.powShareReward);

    // apply balance restriction if faucet wallet is low on funds
    let balanceRestriction = Math.min(
      this.getBalanceRestriction(),
      ServiceManager.GetService(PoWOutflowLimiter).getOutflowRestriction()
    );
    if(balanceRestriction < 100)
      shareReward = shareReward * BigInt(Math.floor(balanceRestriction * 1000)) / 100000n;

    let restrictedReward = session.getRewardRestriction();
    if(restrictedReward.reward < 100)
      shareReward = shareReward * BigInt(Math.floor(restrictedReward.reward * 1000)) / 100000n;

    // apply boost factor
    let boostInfo = session.getBoostInfo();
    if(boostInfo) {
      shareReward = shareReward * BigInt(Math.floor(boostInfo.factor * 100000)) / 100000n
    }

    return shareReward;
  }

  public getVerificationReward(session: PoWSession): bigint {
    let shareReward = BigInt(faucetConfig.powShareReward) * BigInt(faucetConfig.verifyMinerRewardPerc * 100) / 10000n;

    // apply balance restriction if faucet wallet is low on funds
    let balanceRestriction = Math.min(
      this.getBalanceRestriction(),
      ServiceManager.GetService(PoWOutflowLimiter).getOutflowRestriction()
    );
    if(balanceRestriction < 100)
      shareReward = shareReward * BigInt(Math.floor(balanceRestriction * 1000)) / 100000n;
    
    let restrictedReward = session.getRewardRestriction();
    if(restrictedReward.reward < 100)
      shareReward = shareReward * BigInt(Math.floor(restrictedReward.reward * 1000)) / 100000n;

    // apply boost factor
    let boostInfo = session.getBoostInfo();
    if(boostInfo) {
      shareReward = shareReward * BigInt(Math.floor(boostInfo.factor * 100000)) / 100000n
    }

    return shareReward;
  }
  
}
