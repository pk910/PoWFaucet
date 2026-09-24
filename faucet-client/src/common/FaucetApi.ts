import { IClientClaimStatusRsp, IClientFaucetStatusRsp } from "../types/FaucetStatus";
import { IPassportInfo } from "../types/PassportInfo";
import { IFaucetConfig } from "./FaucetConfig";
import { IFaucetSessionInfo, IFaucetSessionStatus } from "./FaucetSession";
import { FaucetTime } from "./FaucetTime";

/**
 * Body of `POST /startSession`.
 *
 * `module` names the module a session is being started with - the value its
 * panel registered under - and `params` is whatever that module wants said at
 * the start. **The core neither names nor parses `params`**: it is an object of
 * strings, it is stored under the module's own session-data key, and the
 * module's server half is the only thing that reads it.
 *
 * Before this shape the two fields were named for the one module that existed, and the
 * mode was typed here as a union of its two values - one module's vocabulary
 * *and* its list of choices, in the platform's API type. A second module could
 * not have expressed itself in it at all.
 */
export interface IStartSessionInput {
  addr?: string;
  /** the module this session is being started with, as its panel registered */
  module?: string;
  /** opaque to the core; `params.mode` is what the first module reads */
  params?: Record<string, string>;
  [input: string]: any;
}

export class FaucetApi {
  private faucetTime: FaucetTime;
  private apiBaseUrl: string;

  public constructor(apiUrl: string) {
    this.faucetTime = new FaucetTime();
    if(apiUrl.match(/\/$/))
      apiUrl = apiUrl.substring(0, apiUrl.length - 1);
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

  public apiGet(endpoint: string, args?: {[arg: string]: string|number|undefined}): Promise<any> {
    if(!endpoint.match(/^\//))
      endpoint = "/" + endpoint;
    
    let argsStr = "";
    if(args) {
      let argParts: string[] = [];
      Object.keys(args).forEach((key) => {
        if(!args[key])
          return;
        argParts.push(key + "=" + encodeURIComponent(args[key].toString()));
      });
      if(argParts.length > 0) {
        argsStr = "?" + argParts.join("&");
      }
    }
    
    return fetch(this.apiBaseUrl + endpoint + argsStr)
      .then((rsp) => rsp.json());
  }

  public apiPost(endpoint: string, args?: {[arg: string]: string|number|undefined}, data?: any): Promise<any> {
    if(!endpoint.match(/^\//))
      endpoint = "/" + endpoint;
    
    let argsStr = "";
    if(args) {
      let argParts: string[] = [];
      Object.keys(args).forEach((key) => {
        if(!args[key])
          return;
        argParts.push(key + "=" + encodeURIComponent(args[key].toString()));
      });
      if(argParts.length > 0) {
        argsStr = "?" + argParts.join("&");
      }
    }
    
    return fetch(this.apiBaseUrl + endpoint + argsStr, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((rsp) => rsp.json());
  }

  public getFaucetConfig(): Promise<IFaucetConfig> {
    return this.apiGet("/getFaucetConfig", {
      cliver: FAUCET_CLIENT_VERSION,
    }).then((config) => {
      this.faucetTime.syncTimeOffset(config.time);
      return config;
    });
  }

  public getSession(sessionId: string): Promise<IFaucetSessionInfo> {
    return this.apiGet("/getSession", {
      session: sessionId,
    });
  }

  public getSessionStatus(sessionId: string, details?: boolean): Promise<IFaucetSessionStatus> {
    return this.apiGet("/getSessionStatus", {
      session: sessionId,
      details: details ? 1 : undefined,
    });
  }

  public startSession(inputData: IStartSessionInput): Promise<IFaucetSessionInfo> {
    return this.apiPost("/startSession", {
      cliver: FAUCET_CLIENT_VERSION,
    }, inputData);
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

  public getPassportInfo(sessionId: string, address: string): Promise<IPassportInfo> {
    return this.apiGet("/getPassportInfo", {
      session: sessionId,
      address: address,
    });
  }

  public refreshPassport(sessionId: string, address: string): Promise<IPassportInfo> {
    return this.apiGet("/refreshPassport", {
      session: sessionId,
      address: address,
    });
  }

  public refreshPassportJson(sessionId: string, address: string, json: string): Promise<IPassportInfo> {
    return this.apiPost("/refreshPassport", {
      session: sessionId,
      address: address,
    }, json);
  }

}
