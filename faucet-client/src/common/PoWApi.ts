import { IPoWFaucetStatus } from "components/PoWFaucetStatus";
import { IFaucetConfig } from "./IFaucetConfig";

export class PoWApi {
  private apiBaseUrl: string;

  public constructor(apiUrl: string) {
    if(apiUrl.match(/\/$/))
      apiUrl = apiUrl.substring(0, apiUrl.length - 1);
    this.apiBaseUrl = apiUrl;
  }

  private apiGet(endpoint: string, args?: {[arg: string]: string|number}): Promise<any> {
    if(!endpoint.match(/^\//))
      endpoint = "/" + endpoint;
    
    let argsStr = "";
    if(args) {
      let argParts: string[] = [];
      Object.keys(args).forEach((key) => {
        argParts.push(key + "=" + encodeURIComponent(args[key].toString()));
      });
      if(argParts.length > 0) {
        argsStr = "?" + argParts.join("&");
      }
    }
    
    return fetch(this.apiBaseUrl + endpoint + argsStr)
      .then((rsp) => rsp.json());
  }

  public getFaucetConfig(): Promise<IFaucetConfig> {
    return this.apiGet("/getFaucetConfig", {
      cliver: FAUCET_CLIENT_VERSION,
    });
  }

  public getFaucetStatus(): Promise<IPoWFaucetStatus> {
    return this.apiGet("/getFaucetStatus");
  }
}
