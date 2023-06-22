import fetch from 'node-fetch';
import { faucetConfig } from "../../config/FaucetConfig";
import { decryptStr, encryptStr } from "../../utils/CryptoUtils";
import { GithubModule } from "./GithubModule";

export interface IGithubAuthInfo {
  time: number;
  uid: number;
  user: string;
  url: string;
  avatar: string;
  token: string;
}

export interface IGithubUserInfo {
  uid: number;
  user: string;
  api: string;
  url: string;
  avatar: string;
  repos: number;
  followers: number;
  created: number;
}

export class GithubResolver {
  private module: GithubModule;

  public constructor(module: GithubModule) {
    this.module = module;
  }

  public async createAuthInfo(authCode: string): Promise<IGithubAuthInfo> {
    // get access token
    let accessToken: string;

    try {
      let tokenReqData = new URLSearchParams();
      tokenReqData.append("client_id", this.module.getModuleConfig().appClientId);
      tokenReqData.append("client_secret", this.module.getModuleConfig().appSecret);
      tokenReqData.append("code", authCode);
      let tokenRsp = await fetch("https://github.com/login/oauth/access_token", {
        method: 'POST',
        body: tokenReqData,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).then((rsp) => rsp.text());
      
      let tokenRspData = new URLSearchParams(tokenRsp);
      if(tokenRspData.has("access_token"))
        accessToken = tokenRspData.get("access_token");
      else
        throw "could not fetch access token" + (tokenReqData.has("error") ? ": [" + tokenReqData.get("error") + "] " + tokenReqData.get("error_description") : "");
    } catch(ex) {
      throw "error while fetching access token: " + ex.toString();
    }

    let userInfo = await this.fetchProfileInfo(accessToken);
    let now = Math.floor(new Date().getTime() / 1000);
    let faucetToken = this.generateFaucetToken(accessToken, now);
    return {
      time: now,
      uid: userInfo.uid,
      user: userInfo.user,
      url: userInfo.url,
      avatar: userInfo.avatar,
      token: faucetToken,
    };
  }

  private getTokenPassphrase() {
    return faucetConfig.faucetSecret + "-" + this.module.getModuleName() + "-authtoken";
  }

  private generateFaucetToken(accessToken: string, time: number): string {
    return encryptStr([
      this.module.getModuleName(),
      time.toString(),
      accessToken,
    ].join("\n"), this.getTokenPassphrase());
  }

  private parseFaucetToken(faucetToken: string): [string, number] {
    let tokenData = decryptStr(faucetToken, this.getTokenPassphrase())?.split("\n") || [];
    if(tokenData.length !== 3)
      return null;
    if(tokenData[0] !== this.module.getModuleName())
      return null;
    return [tokenData[2], parseInt(tokenData[1])];
  }

  private async fetchProfileInfo(accessToken: string): Promise<IGithubUserInfo> {
    let userData = await fetch("https://api.github.com/user", {
      method: 'GET',
      headers: {'Authorization': 'token ' + accessToken}
    }).then((rsp) => rsp.json());
    return {
      uid: userData.id,
      user: userData.name,
      api: userData.url,
      url: userData.html_url,
      avatar: userData.avatar_url,
      repos: userData.public_repos,
      followers: userData.followers,
      created: Math.floor(new Date(userData.created_at).getTime() / 1000),
    };
  }

}
