import React from 'react';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetCaptcha } from '../shared/FaucetCaptcha';

import './GithubLogin.css';
import { toQuery } from '../../utils/QueryUtils';
import { TypedEmitter } from 'tiny-typed-emitter';
import { FaucetTime } from '../../common/FaucetTime';
import { IFaucetContext } from '../../common/FaucetContext';

export interface IGithubLoginProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig
}

export interface IGithubLoginState {
  popupOpen: boolean;
  authInfo: IGithubAuthInfo;
}

export interface IGithubAuthInfo {
  time: number;
  uid: number;
  user: string;
  url: string;
  avatar: string;
  token: string;
}

export class GithubLogin extends React.PureComponent<IGithubLoginProps, IGithubLoginState> {
  private messageEvtListener: (evt: MessageEvent) => void;
  private loginPopop: Window;

  constructor(props: IGithubLoginProps, state: IGithubLoginState) {
    super(props);

    this.messageEvtListener = (evt: MessageEvent) => this.processWindowMessage(evt);

    this.state = {
      popupOpen: false,
      authInfo: null,
		};
  }

  public componentDidMount() {
    window.addEventListener("message", this.messageEvtListener);
    if(localStorage['github.AuthResult']) {
      try {
        this.processLoginResult(JSON.parse(localStorage['github.AuthResult']));
        localStorage.removeItem("github.AuthResult");
      } catch(ex) {
        console.error("error parsing auth result from localstorage: ", ex);
      }
    }
    else if(localStorage['github.AuthInfo']) {
      try {
        let authInfo = JSON.parse(localStorage['github.AuthInfo']);
        this.loadAuthInfo(authInfo);
      } catch(ex) {
        console.error("error parsing auth info from localstorage: ", ex);
      }
    }

  }

  public componentWillUnmount() {
    window.removeEventListener("message", this.messageEvtListener);
    this.loginPopop = null;
  }

	public render(): React.ReactElement {

    return (
      <div className='faucet-auth faucet-auth-github'>
        <div className='auth-icon'>
          <div className='logo logo-github'></div>
        </div>
        {this.state.authInfo ?
          this.renderLoginState() :
          this.renderLoginButton()
        }
      </div>
    );
	}

  private renderLoginButton(): React.ReactElement {
    return (
      <div className='auth-field auth-noauth' onClick={(evt) => this.onLoginClick()}>
        <div>Not logged in to a Github account.</div>
        <div>
          <a href="#" onClick={(evt) => evt.preventDefault()}>
            {this.state.popupOpen ?
              <span className='inline-spinner'>
                <img src="/images/spinner.gif" className="spinner" />
              </span>
            : null}
            Login with Github
          </a>
        </div>
      </div>
    );
  }

  private renderLoginState(): React.ReactElement {
    return (
      <div className='auth-field auth-profile'>
        <div className='auth-info'>Authenticated with github profile <a href={this.state.authInfo.url} target="_blank" rel='noopener noreferrer'>{this.state.authInfo.user}</a></div>
        <div>
          <a href="#" onClick={(evt) => {evt.preventDefault(); this.onLogoutClick()}}>
            Logout
          </a>
        </div>
      </div>
    );
  }

  public getToken(): string {
    return this.state.authInfo?.token;
  }
  
  private onLoginClick() {
    let authUrl = "https://github.com/login/oauth/authorize?" + toQuery({
      client_id: "056812ab38f99f509f08",
      redirect_uri: this.props.faucetConfig.modules.github.redirectUrl || this.props.faucetContext.faucetApi.getApiUrl("/githubCallback", true),
      state: this.props.faucetConfig.modules.github.callbackState || undefined,
    });
    this.loginPopop = window.open(authUrl, 'github-oauth-authorize', toQuery({
      height: 800,
      width: 600
    }, ","));

    if(!this.state.popupOpen) {
      this.setState({
        popupOpen: true,
      }, () => {
        this.pollPopupState();
      });
    }
  }
  
  private onLogoutClick() {
    localStorage.removeItem("github.AuthInfo");
    this.setState({
      authInfo: null,
    });
  }


  private pollPopupState() {
    if(!this.loginPopop)
      return;
    
    if(!this.state.popupOpen)
      return;
    if(this.loginPopop.closed) {
      this.setState({
        popupOpen: false,
      });
      this.loginPopop = null;
    }
    else {
      setTimeout(() => this.pollPopupState(), 1000);
    }
  }

  private processWindowMessage(evt: MessageEvent) {
    if(!evt.data || typeof evt.data !== "object" || evt.data.authModule !== "github" || !evt.data.authResult)
      return;
    this.processLoginResult(evt.data.authResult);
  }

  private processLoginResult(authResult: any) {
    console.log("github auth: ", authResult);
    if(this.loginPopop)
      this.loginPopop.close();
    if(authResult.data) {
      this.loadAuthInfo(authResult.data);
      localStorage['github.AuthInfo'] = JSON.stringify(authResult.data);
    }
  }

  private loadAuthInfo(authInfo: IGithubAuthInfo) {
    let authTimeout = this.props.faucetConfig.modules.github?.authTimeout;
    let age = this.props.faucetContext.faucetApi.getFaucetTime().getSyncedTime() - authInfo.time;
    if(age > authTimeout - 60)
      return;

    this.setState({
      authInfo: authInfo,
    });
  }

}
