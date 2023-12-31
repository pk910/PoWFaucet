import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { FetchUtil } from '../../src/utils/FetchUtil.js';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { IGithubConfig } from '../../src/modules/github/GithubConfig.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FaucetSession } from '../../src/session/FaucetSession.js';
import { encryptStr } from '../../src/utils/CryptoUtils.js';
import { FaucetHttpResponse } from '../../src/webserv/FaucetHttpServer.js';

interface IFakeFetchResponse {
  url: RegExp;
  rsp?: any;
  json?: any;
  fail?: boolean;
  promise?: Promise<void>;
  calls: {
    url: string;
    opts: any;
  }[];
}


describe("Faucet module: github", () => {
  let globalStubs;
  let fakeFetchResponses: IFakeFetchResponse[];

  beforeEach(async () => {
    fakeFetchResponses = [];
    globalStubs = bindTestStubs({
      "fetch": sinon.stub(FetchUtil, "fetch").callsFake(fakeFetch),
    });
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    faucetConfig.modules["github"] = {
      enabled: true,
      appClientId: "test-client-id",
      appSecret: "test-app-secret",
      callbackState: "test-callback-state",
      redirectUrl: "test-redirect-url",
      authTimeout: 86400,
      cacheTime: 86400,
      checks: [],
      restrictions: [],
    } as IGithubConfig;
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  function fakeFetch(url: any, opts: any): Promise<any> {
    for(let i = 0; i < fakeFetchResponses.length; i++) {
      if(fakeFetchResponses[i].url.test(url)) {
        let promise = fakeFetchResponses[i].promise || Promise.resolve();
        if(!fakeFetchResponses[i].calls)
          fakeFetchResponses[i].calls = [];
        fakeFetchResponses[i].calls.push({
          url: url,
          opts: opts,
        });
        return promise.then(() => {
          if(fakeFetchResponses[i].fail)
            throw fakeFetchResponses[i].rsp;
          return fakeFetchResponses[i].rsp;
        });
      }
    }
    return Promise.reject("no fake response");
  }

  function addFakeFetchResponse(opts: IFakeFetchResponse): IFakeFetchResponse {
    if(opts.json && !opts.rsp) {
      opts.rsp = { json: () => {
        return Promise.resolve(opts.json);
      }};
    }
    fakeFetchResponses.push(opts);
    return opts;
  }

  function addGithubApiResponses(): {
    authToken: IFakeFetchResponse;
    userInfo: IFakeFetchResponse;
    ownRepos: IFakeFetchResponse;
  } {
    return {
      authToken: addFakeFetchResponse({
        url: /github\.com\/login\/oauth\/access_token/,
        rsp: { text: () => Promise.resolve("access_token=test_access_token&scope=&token_type=bearer") },
        calls: [],
      }),
      userInfo: addFakeFetchResponse({
        url: /api\.github\.com\/user$/,
        json: {
          id: 1337,
          name: "testus",
          url: "https://api.github.com/users/testus",
          html_url: "https://github.com/testus",
          avatar_url: "https://avatars.githubusercontent.com/u/1337?v=4",
          created_at: "2010-11-21T22:06:08Z",
          public_repos: 10,
          followers: 5,
        },
        calls: [],
      }),
      ownRepos: addFakeFetchResponse({
        url: /api\.github\.com\/graphql$/,
        json: {
          data: {
            viewer: {
              repositories: {
                edges: [
                  { node: {
                    id: "R_kgDOHCncMQ",
                    name: "PoWFaucet",
                    forkCount: 629,
                    stargazerCount: 1521,
                    url: "https://github.com/pk910/PoWFaucet",
                  }},
                ]
              }
            }
          }
        },
        calls: [],
      }),
    };
  }

  function generateTestToken(accessToken: string, userId: number, time?: number): string {
    if(!time)
      time = Math.floor(new Date().getTime() / 1000);
    let resolver = ServiceManager.GetService(ModuleManager).getModule<any>("github").githubResolver;
    return resolver.generateFaucetToken(accessToken, userId, time);
  }

  it("Check client config exports", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['github']).to.equal(true, "no github config exported");
    expect(clientConfig.modules['github'].clientId).to.equal("test-client-id", "client config missmatch: clientId");
    expect(clientConfig.modules['github'].authTimeout).to.equal(86400, "client config missmatch: authTimeout");
    expect(clientConfig.modules['github'].redirectUrl).to.equal("test-redirect-url", "client config missmatch: redirectUrl");
    expect(clientConfig.modules['github'].callbackState).to.equal("test-callback-state", "client config missmatch: callbackState");
  });

  it("Start session with github token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let apiRsp = addGithubApiResponses();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.userInfo.calls[0].opts?.headers['Authorization']).to.equal("token test-github-token", "unexpected access token in api call");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
    expect(testSession.getSessionData("github.uid")).to.equal(1337, "unexpected github info in session data: github.uid");
    expect(testSession.getSessionData("github.user")).to.equal("testus", "unexpected github info in session data: github.user");
  });

  it("Check github requirements: unexpected api error", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
    });
    let apiRsp = addGithubApiResponses();
    apiRsp.userInfo.fail = true;
    apiRsp.userInfo.rsp = "test-error";
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/missing or invalid github token/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: missing authentication", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
    });
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/missing or invalid github token/, "unexpected error message");
  });

  it("Check github requirements: invalid token 1", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
    });
    let apiRsp = addGithubApiResponses();
    apiRsp.userInfo.json.created_at = new Date().toISOString();
    let error: FaucetError | null = null;
    try {
      let resolver = ServiceManager.GetService(ModuleManager).getModule<any>("github").githubResolver;
      let invalidToken = encryptStr([
        "github",
        "13",
      ].join("\n"), resolver.getTokenPassphrase());
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: invalidToken,
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/missing or invalid github token/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(0, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: invalid token 2", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
    });
    let apiRsp = addGithubApiResponses();
    apiRsp.userInfo.json.created_at = new Date().toISOString();
    let error: FaucetError | null = null;
    try {
      let resolver = ServiceManager.GetService(ModuleManager).getModule<any>("github").githubResolver;
      let invalidToken = encryptStr([
        "not_github",
        "13",
        "1337",
        "test"
      ].join("\n"), resolver.getTokenPassphrase());
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: invalidToken,
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/missing or invalid github token/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(0, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: expired token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
    });
    let apiRsp = addGithubApiResponses();
    apiRsp.userInfo.json.created_at = new Date().toISOString();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337, 100),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/missing or invalid github token/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(0, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: account age", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minAccountAge: 86400,
    });
    let apiRsp = addGithubApiResponses();
    apiRsp.userInfo.json.created_at = new Date().toISOString();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/account age check failed/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: repository count", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minRepoCount: 20,
    });
    let apiRsp = addGithubApiResponses();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/repository count check failed/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: follower count", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minFollowers: 20,
      message: "test error: {0}",
    });
    let apiRsp = addGithubApiResponses();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/follower count check failed/, "unexpected error message");
    expect(error?.message).to.matches(/test error/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(0, "unexpected number of own repos api calls");
  });

  it("Check github requirements: own repository count", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minOwnRepoCount: 20,
    });
    let apiRsp = addGithubApiResponses();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/own repository count check failed/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(1, "unexpected number of own repos api calls");
  });

  it("Check github requirements: own repository stars", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minOwnRepoStars: 2000,
    });
    let apiRsp = addGithubApiResponses();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_CHECK", "unexpected error code");
    expect(error?.message).to.matches(/own repository star count check failed/, "unexpected error message");

    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(1, "unexpected number of own repos api calls");
  });

  it("Check reward factor handling", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      minOwnRepoStars: 1000,
      rewardFactor: 2,
    });
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      minOwnRepoStars: 3000,
      rewardFactor: 3,
    });
    let apiRsp = addGithubApiResponses();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(1, "unexpected number of own repos api calls");
    expect(testSession.getSessionData("github.factor")).to.equal(2, "unexpected github info in session data: github.factor");

    let reward = await testSession.addReward(100n);
    expect(reward).to.equal(200n, "unexpected reward");
  });

  it("Check github info caching", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).checks.push({
      required: true,
      minOwnRepoStars: 1000,
    });
    let apiRsp = addGithubApiResponses();
    let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession1.getSessionStatus()).to.equal("claimable", "unexpected session status");
    let testSession2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession2.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(apiRsp.userInfo.calls?.length || 0).to.equal(1, "unexpected number of user info api calls");
    expect(apiRsp.ownRepos.calls?.length || 0).to.equal(1, "unexpected number of own repos api calls");
  });

  it("Check authentication callback: authentication error", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/githubCallback?error=test_error&error_description=test+error+message",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/github\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/test_error/, "test error code not in response page");
  });

  it("Check authentication callback: unknown parameters", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/githubCallback?test=test_error",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/github\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/UNKNOWN/, "UNKNOWN error code not in response page");
  });

  it("Check authentication callback: successful authentication", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let apiRsp = addGithubApiResponses();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/githubCallback?code=test_auth_code",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/github\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/"user": *"testus"/, "auth result not in response page");
  });

  it("Check authentication callback: api error", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let apiRsp = addGithubApiResponses();
    apiRsp.authToken.fail = true;
    apiRsp.authToken.rsp = "test error";
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/githubCallback?code=test_auth_code",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/github\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/AUTH_ERROR/, "AUTH_ERROR error code not in response page");
  });

  it("Check authentication callback: unexpected error", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let apiRsp = addGithubApiResponses();
    apiRsp.authToken.rsp = {text: () => Promise.resolve("no proper response")};
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/githubCallback?code=test_auth_code",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/github\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/AUTH_ERROR/, "AUTH_ERROR error code not in response page");
  });

  it("Check github based recurring restrictions: exceed session count", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).restrictions.push({
      limitCount: 1,
      limitAmount: 0,
      duration: 10,
      message: "test-message"
    });
    let apiRsp = addGithubApiResponses();
    let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession1.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession1.getSessionData("github.uid")).to.equal(1337, "unexpected github info in session data: github.uid");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/test-message/, "unexpected error message");
  });

  it("Check github based recurring restrictions: exceed total amount", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["github"] as IGithubConfig).restrictions.push({
      limitCount: 0,
      limitAmount: 10,
      duration: 10,
      message: "test-message"
    });
    let apiRsp = addGithubApiResponses();
    let testSession1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      githubToken: generateTestToken("test-github-token", 1337),
    });
    expect(testSession1.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession1.getSessionData("github.uid")).to.equal(1337, "unexpected github info in session data: github.uid");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        githubToken: generateTestToken("test-github-token", 1337),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("GITHUB_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/test-message/, "unexpected error message");
  });

});