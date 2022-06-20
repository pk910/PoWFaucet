import { IncomingMessage } from "http";
import { faucetConfig } from "../common/FaucetConfig";
import { FaucetHttpResponse } from "./FaucetWebServer";

export interface IFaucetApiUrl {
  path: string[];
  query: {[key: string]: string};
}

export class FaucetWebApi {

  public onApiRequest(req: IncomingMessage): Promise<any> {
    return Promise.resolve().then(() => {
      let apiUrl = this.parseApiUrl(req.url);
      if(!apiUrl || apiUrl.path.length === 0)
        return new FaucetHttpResponse(404, "Not Found");

      let res: any | Promise<any> = null;
      switch(apiUrl.path[0].toLowerCase()) {
        case "getMaxReward".toLowerCase(): 
          return this.onGetMaxReward();
      }

      return new FaucetHttpResponse(404, "Not Found");
    });
  }

  private parseApiUrl(url: string): IFaucetApiUrl {
    let urlMatch = /\/api\/([^?]+)(?:\?(.*))?/.exec(url);
    if(!urlMatch)
      return null;
    let urlRes: IFaucetApiUrl = {
      path: urlMatch[1] && urlMatch[1].length > 0 ? urlMatch[1].split("/") : [],
      query: {}
    };
    if(urlMatch[2] && urlMatch[2].length > 0) {
      urlMatch[2].split("&").forEach((query) => {
        let parts = query.split("=", 2);
        urlRes[parts[0]] = (parts.length == 1) ? true : parts[1];
      });
    }
    return urlRes;
  }

  private onGetMaxReward(): number {
    return faucetConfig.claimMaxAmount;
  }

}
