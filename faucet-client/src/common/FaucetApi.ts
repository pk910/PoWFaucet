import { IClientClaimStatusRsp, IClientFaucetStatusRsp } from "../types/FaucetStatus";
import { IPassportInfo } from "../types/PassportInfo";
import { IFaucetConfig } from "./FaucetConfig";
import { IFaucetSessionInfo, IFaucetSessionStatus } from "./FaucetSession";
import { FaucetTime } from "./FaucetTime";

export class FaucetApi {
  private readonly faucetTime: FaucetTime;
  private apiBaseUrl: string;

  public constructor(apiUrl: string) {
    this.faucetTime = new FaucetTime();
    if (apiUrl.match(/\/$/)) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 1);
    }
    this.apiBaseUrl = apiUrl;
  }

  public getFaucetTime(): FaucetTime {
    return this.faucetTime;
  }

  public getApiUrl(endpoint?: string, fqdn?: boolean): string {
    if(!endpoint)
      endpoint = "";
    else if(!endpoint.match(/^\//))
      endpoint = "/" + endpoint;
    let apiUrl = this.apiBaseUrl + endpoint;
    if(fqdn && apiUrl.match(/^\//)) {
      // add current host
      let hostUrl = location.protocol + "//" + location.host;
      apiUrl = hostUrl + apiUrl;
    }
    return apiUrl;
  }


  private async apiGet(
      endpoint: string,
      args?: {
        [arg: string]: string | number;
      }
  ): Promise<any> {
    if (!endpoint.match(/^\//)) {
      endpoint = "/" + endpoint;
    }

    const argsStr = this.prepareArgs(args);

    let rsp = await fetch(this.apiBaseUrl + endpoint + argsStr);
    return await rsp.json();
  }

  private async apiPost(
      endpoint: string,
      args?: {
        [arg: string]: string | number;
      },
      data?: any
  ): Promise<any> {
    if (!endpoint.match(/^\//)) {
      endpoint = "/" + endpoint;
    }

    const argsStr = this.prepareArgs(args);

    const rsp = await fetch(this.apiBaseUrl + endpoint + argsStr, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await rsp.json();
  }

  public async getFaucetConfig(): Promise<IFaucetConfig> {
    const config = await this.apiGet("/getFaucetConfig", {
      cliver: 2,
    });
    this.faucetTime.syncTimeOffset(config.time);
    return config;
  }

  public getSession(sessionId: string): Promise<IFaucetSessionInfo> {
    return this.apiGet("/getSession", {
      session: sessionId,
    });
  }

  public getSessionStatus(
      sessionId: string,
      details?: boolean
  ): Promise<IFaucetSessionStatus> {
    return this.apiGet("/getSessionStatus", {
      session: sessionId,
      // @ts-ignore
      details: details ? 1 : undefined,
    });
  }

  public startSession(inputData: {
    addr: string;
  }): Promise<IFaucetSessionInfo> {
    return this.apiPost("/startSession", {}, inputData);
  }

  public claimReward(inputData: any): Promise<IFaucetSessionStatus> {
    return this.apiPost("/claimReward", {}, inputData);
  }

  public getQueueStatus(): Promise<IClientClaimStatusRsp> {
    return this.apiGet("/getQueueStatus");
  }

  public getFaucetStatus(): Promise<IClientFaucetStatusRsp> {
    return this.apiGet("/getFaucetStatus");
  }

  public getPassportInfo(sessionId: string): Promise<IPassportInfo> {
    return this.apiGet("/getPassportInfo", {
      session: sessionId
    });
  }

  public refreshPassport(sessionId: string): Promise<IPassportInfo> {
    return this.apiGet("/refreshPassport", {
      session: sessionId
    });
  }

  public refreshPassportJson(sessionId: string, json: string): Promise<IPassportInfo> {
    return this.apiPost("/refreshPassport", {
      session: sessionId
    }, json);
  }

  private prepareArgs(args?: { [arg: string]: string | number }) {
    let argsStr = "";
    if (args) {
      let argParts: string[] = [];
      Object.keys(args).forEach((key) => {
        if (!args[key]) {
          return;
        }
        argParts.push(key + "=" + encodeURIComponent(args[key].toString()));
      });
      if (argParts.length > 0) {
        argsStr = "?" + argParts.join("&");
      }
    }

    return argsStr;
  }
}
