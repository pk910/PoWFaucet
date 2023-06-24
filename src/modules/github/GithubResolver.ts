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

export interface IGithubInfoOpts {
  loadOwnRepo: boolean;
}

export interface IGithubInfo {
  time: number;
  uid: number;
  user: string;
  loaded: string[];
  info: {
    createTime: number;
    repoCount: number;
    followers: number;
    ownRepoCount?: number;
    ownRepoStars?: number;
    ownRepoForks?: number;
  }
}


export class GithubResolver {
  private module: GithubModule;

  public constructor(module: GithubModule) {
    this.module = module;
  }

  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
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
    let faucetToken = this.generateFaucetToken(accessToken, userInfo.uid, now);
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

  private generateFaucetToken(accessToken: string, userId: number, time: number): string {
    return encryptStr([
      this.module.getModuleName(),
      time.toString(),
      userId.toString(),
      accessToken,
    ].join("\n"), this.getTokenPassphrase());
  }

  private parseFaucetToken(faucetToken: string): [accessToken: string, userId: number, tokenTime: number] {
    let tokenData = decryptStr(faucetToken, this.getTokenPassphrase())?.split("\n") || [];
    if(tokenData.length !== 4)
      return null;
    if(tokenData[0] !== this.module.getModuleName())
      return null;
    return [tokenData[3], parseInt(tokenData[2]), parseInt(tokenData[1])];
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

  public async getGithubInfo(token: string, opts: IGithubInfoOpts): Promise<IGithubInfo> {
    // parse token
    let tokenData = this.parseFaucetToken(token);
    if(!tokenData)
      throw "invalid github token";
    if(tokenData[2] + this.module.getModuleConfig().authTimeout < this.now())
      throw "github token expired";
    let accessToken = tokenData[0];
    let userId = tokenData[1];
    
    let cachedGithubInfo = await this.module.getGithubDb().getGithubInfo(userId);
    if(cachedGithubInfo && // check if all optional fields are loaded in the cached info
      (!opts.loadOwnRepo || cachedGithubInfo.loaded.indexOf("ownrepos") !== -1)
    ) {
      return cachedGithubInfo;
    }

    let userInfo = await this.fetchProfileInfo(accessToken);
    if(!userInfo.uid)
      throw "github api error";

    let promises: Promise<void>[] = [];
    let githubInfo: IGithubInfo = {
      time: this.now(),
      uid: userInfo.uid,
      user: userInfo.user,
      loaded: [],
      info: {
        createTime: userInfo.created,
        repoCount: userInfo.repos,
        followers: userInfo.followers,
      }
    };
    if(opts.loadOwnRepo) {
      githubInfo.loaded.push("ownrepos");
      promises.push(this.loadOwnRepoInfo(githubInfo, accessToken));
    }

    await Promise.all(promises);
    await this.module.getGithubDb().setGithubInfo(userId, githubInfo, this.module.getModuleConfig().cacheTime);
    return githubInfo;
  }

  private async loadOwnRepoInfo(githubInfo: IGithubInfo, accessToken: string) {
    let graphQuery = `{
      viewer {
        repositories(
          first: 100
          isFork: false
          privacy: PUBLIC
          ownerAffiliations: OWNER
        ) {
          edges {
            node {
              id
              name
              forkCount
              stargazerCount
              url
            }
          }
        }
      }
    }`;
    let graphData = await fetch("https://api.github.com/graphql", {
      method: 'POST',
      body: JSON.stringify({
        query: graphQuery,
      }),
      headers: {
        'Authorization': 'token ' + accessToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }).then((rsp) => rsp.json());

    githubInfo.info.ownRepoCount = 0;
    githubInfo.info.ownRepoStars = 0;
    githubInfo.info.ownRepoForks = 0;
    let repositories = graphData.data.viewer.repositories.edges;
    for(let i = 0; i < repositories.length; i++) {
      githubInfo.info.ownRepoCount++;
      githubInfo.info.ownRepoStars += repositories[i].node.stargazerCount;
      githubInfo.info.ownRepoForks += repositories[i].node.forkCount;
    }
  }

}
