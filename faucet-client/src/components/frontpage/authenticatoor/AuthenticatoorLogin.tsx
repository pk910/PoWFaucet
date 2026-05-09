import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { OverlayChildren } from 'react-bootstrap/esm/Overlay';
import { IFaucetConfig } from '../../../common/FaucetConfig';
import { IFaucetContext } from '../../../common/FaucetContext';

import './AuthenticatoorLogin.css';

interface IAuthenticatoorTokenInfo {
  authenticated: boolean;
  token: string;
  exp: number;
  user: string;
}

interface IAuthenticatoorClient {
  checkLogin(): Promise<IAuthenticatoorTokenInfo>;
  login(): void;
  logout(): void;
  getToken(): string | null;
  isLoggedIn(): boolean;
  authServiceURL(): string;
}

declare global {
  interface Window {
    ethpandaops?: {
      authenticatoor?: IAuthenticatoorClient;
    };
  }
}

export interface IAuthenticatoorLoginProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
}

export interface IAuthenticatoorLoginState {
  scriptLoading: boolean;
  scriptLoaded: boolean;
  scriptError: string | null;
  loginInfo: IAuthenticatoorTokenInfo | null;
}

const SCRIPT_LOADERS: { [url: string]: Promise<void> } = {};

function loadScript(src: string): Promise<void> {
  if(SCRIPT_LOADERS[src])
    return SCRIPT_LOADERS[src];
  return SCRIPT_LOADERS[src] = new Promise<void>((resolve, reject) => {
    let script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      delete SCRIPT_LOADERS[src];
      reject(new Error("failed loading " + src));
    };
    document.head.appendChild(script);
  });
}

export class AuthenticatoorLogin extends React.PureComponent<IAuthenticatoorLoginProps, IAuthenticatoorLoginState> {

  constructor(props: IAuthenticatoorLoginProps) {
    super(props);

    this.state = {
      scriptLoading: false,
      scriptLoaded: false,
      scriptError: null,
      loginInfo: null,
    };
  }

  public componentDidMount() {
    let authUrl = this.props.faucetConfig.modules.authenticatoor?.authUrl;
    if(!authUrl)
      return;

    let scriptUrl = authUrl.replace(/\/+$/, "") + "/client.js";
    this.setState({ scriptLoading: true });

    loadScript(scriptUrl).then(() => {
      this.setState({ scriptLoading: false, scriptLoaded: true });
      let client = window.ethpandaops?.authenticatoor;
      if(!client) {
        this.setState({ scriptError: "authenticatoor client did not initialize" });
        return;
      }
      client.checkLogin().then((info) => {
        this.setState({ loginInfo: info });
      });
    }).catch((err) => {
      this.setState({
        scriptLoading: false,
        scriptError: err.message || err.toString(),
      });
    });
  }

  public render(): React.ReactElement {
    return (
      <div className='faucet-auth faucet-authenticatoor-auth'>
        <div className='auth-icon'>
          {this.props.faucetConfig.modules.authenticatoor.loginLogo ?
            <div className='logo logo-authenticatoor' style={{backgroundImage: "url('"+ this.props.faucetConfig.modules.authenticatoor.loginLogo +"')"}}></div>
          :
            <div className='logo logo-authenticatoor'></div>
          }
        </div>
        {this.state.loginInfo?.authenticated ?
          this.renderAuthed() :
          this.renderLogin()
        }
      </div>
    );
  }

  private renderLogin(): React.ReactElement {
    let modCfg = this.props.faucetConfig.modules.authenticatoor;
    return (
      <div className='auth-field auth-noauth'>
        <div>
          {modCfg.loginLabel || (modCfg.requireLogin ? "Login required to use this faucet." : "Optional login for additional benefits.")}
          {modCfg.infoHtml ? this.renderInfoIcon() : null}
        </div>
        <div>
          <a href="#" onClick={(evt) => { evt.preventDefault(); this.onLoginClick() }}>
            {(this.state.scriptLoading || (this.state.scriptLoaded && !this.state.loginInfo && !this.state.scriptError)) ?
              <span className='inline-spinner'>
                <img src={(this.props.faucetContext.faucetUrls.imagesUrl || "/images") + "/spinner.gif"} className="spinner" />
              </span>
            : null}
            Login
          </a>
        </div>
        {this.state.scriptError ?
          <div className='auth-info' style={{color: "#a00"}}>Failed to load auth client: {this.state.scriptError}</div>
        : null}
      </div>
    );
  }

  private renderAuthed(): React.ReactElement {
    let modCfg = this.props.faucetConfig.modules.authenticatoor;
    let info = this.state.loginInfo;
    return (
      <div className='auth-field auth-profile'>
        <div className='auth-info'>
          {modCfg.userLabel || "Authenticated"}: <strong>{info.user || "(unknown)"}</strong>
          {modCfg.infoHtml ? this.renderInfoIcon() : null}
        </div>
        <div className='auth-logout'>
          <a href="#" onClick={(evt) => { evt.preventDefault(); this.onLogoutClick() }}>
            Logout
          </a>
        </div>
      </div>
    );
  }

  private renderInfoIcon(): React.ReactElement {
    return (
      <OverlayTrigger
        placement="bottom"
        container={this.props.faucetContext.getContainer()}
        overlay={this.renderInfoTooltip() as OverlayChildren}
      >
        <span className="auth-info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </span>
      </OverlayTrigger>
    );
  }

  private renderInfoTooltip(): React.ReactElement {
    let html = this.props.faucetConfig.modules.authenticatoor.infoHtml;
    if(!html)
      return null;
    return (
      <Tooltip id="authenticatoor-tooltip">
        <div className='authenticatoor-info' dangerouslySetInnerHTML={{__html: html}}></div>
      </Tooltip>
    );
  }

  public getToken(): string | null {
    let client = window.ethpandaops?.authenticatoor;
    return client ? client.getToken() : null;
  }

  private onLoginClick() {
    let client = window.ethpandaops?.authenticatoor;
    if(!client)
      return;
    client.login();
  }

  private onLogoutClick() {
    let client = window.ethpandaops?.authenticatoor;
    if(client)
      client.logout();
    this.setState({
      loginInfo: { authenticated: false, token: "", exp: 0, user: "" },
    });
  }

}
