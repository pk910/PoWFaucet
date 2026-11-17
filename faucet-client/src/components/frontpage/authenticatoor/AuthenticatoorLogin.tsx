import React from 'react';
import { Tooltip } from 'react-bootstrap';
import { OverlayChildren } from 'react-bootstrap/esm/Overlay';
import { IFaucetConfig } from '../../../common/FaucetConfig';
import { IFaucetContext } from '../../../common/FaucetContext';

import './AuthenticatoorLogin.css';
import { FaucetOverlay } from '../../shared/FaucetOverlay';
import { IAuthenticatoorGrantInfo } from '../../../types/AuthenticatoorGrants';
import { toReadableAmount } from '../../../utils/ConvertHelpers';
import { renderTimespan } from '../../../utils/DateUtils';

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
  grants: IAuthenticatoorGrantInfo[] | null;
  grantsLoading: boolean;
  grantsError: string | null;
  // id of the selected grant, "" for none
  selectedGrant: string;
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
      grants: null,
      grantsLoading: false,
      grantsError: null,
      selectedGrant: "",
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
        if(info?.authenticated)
          this.loadGrants();
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
        {modCfg.grantSelection ? this.renderGrants() : null}
      </div>
    );
  }

  private loadGrants() {
    if(!this.props.faucetConfig.modules.authenticatoor?.grantSelection)
      return;
    let token = this.getToken();
    if(!token)
      return;
    this.setState({ grantsLoading: true, grantsError: null });
    this.props.faucetContext.faucetApi.getAuthenticatoorGrants(token).then((rsp) => {
      if(rsp.errorCode) {
        this.setState({ grantsLoading: false, grants: null, grantsError: rsp.errorMessage || rsp.errorCode });
        return;
      }
      let grants = rsp.grants || [];
      let selected = grants.find((grant) => grant.id === this.state.selectedGrant && grant.available);
      this.setState({
        grantsLoading: false,
        grants: grants,
        selectedGrant: selected ? selected.id : "",
      });
    }, (err) => {
      this.setState({ grantsLoading: false, grants: null, grantsError: err?.message || String(err) });
    });
  }

  private renderGrants(): React.ReactElement {
    if(this.state.grantsError) {
      return (
        <div className='auth-grants'>
          <div className='auth-grants-error'>Could not load your grants: {this.state.grantsError}</div>
        </div>
      );
    }
    if(!this.state.grants) {
      return this.state.grantsLoading ? (
        <div className='auth-grants'>
          <div className='auth-grant-details'>Loading your grants…</div>
        </div>
      ) : null;
    }
    if(this.state.grants.length === 0)
      return null;
    return (
      <div className='auth-grants' role="radiogroup" aria-label="Grant for this session">
        {this.renderGrantOption("", "Standard", null, ["Default benefits of your login"], true)}
        {this.state.grants.map((grant) => this.renderGrantOption(
          grant.id,
          grant.name,
          grant.description,
          this.getGrantDetails(grant),
          grant.available,
        ))}
      </div>
    );
  }

  private renderGrantOption(id: string, name: string, description: string | null, details: string[], available: boolean): React.ReactElement {
    let inputId = "authenticatoor-grant-" + (id || "none");
    return (
      <div key={inputId} className={'auth-grant' + (available ? '' : ' auth-grant-unavailable')}>
        <input
          className='form-check-input'
          type='radio'
          name='authenticatoor-grant'
          id={inputId}
          value={id}
          checked={this.state.selectedGrant === id}
          disabled={!available}
          onChange={() => this.setState({ selectedGrant: id })}
        />
        <label className='auth-grant-label' htmlFor={inputId}>
          <span className='auth-grant-name'>{name}</span>
          {description ? <span className='auth-grant-description'>{description}</span> : null}
          {details.length > 0 ? <span className='auth-grant-details'>{details.join(" · ")}</span> : null}
        </label>
      </div>
    );
  }

  private getGrantDetails(grant: IAuthenticatoorGrantInfo): string[] {
    let config = this.props.faucetConfig;
    let readable = (amount: string) => toReadableAmount(BigInt(amount), config.faucetCoinDecimals, config.faucetCoinSymbol);
    let details: string[] = [];
    if(grant.dropAmount)
      details.push(readable(grant.dropAmount) + " drop");
    if(grant.rewardFactor !== null)
      details.push(grant.rewardFactor + "x reward");
    if(grant.noMining)
      details.push("no mining");
    let period = renderTimespan(grant.duration);
    if(grant.limitCount > 0)
      details.push(grant.usedCount + "/" + grant.limitCount + " used per " + period);
    if(BigInt(grant.limitAmount) > 0n)
      details.push(readable(grant.usedAmount) + " of " + readable(grant.limitAmount) + " used per " + period);
    if(!grant.available) {
      if(grant.nextAvailable) {
        let wait = Math.max(grant.nextAvailable - this.props.faucetContext.faucetApi.getFaucetTime().getSyncedTime(), 60);
        details.push("available again in " + renderTimespan(wait));
      } else {
        details.push("used up");
      }
    }
    return details;
  }

  private renderInfoIcon(): React.ReactElement {
    return (
      <FaucetOverlay
        placement="bottom"
        overlay={this.renderInfoTooltip() as OverlayChildren}
      >
        <span className="auth-info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </span>
      </FaucetOverlay>
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

  // The grant selected for the next session, null for none.
  public getGrant(): string | null {
    if(!this.state.loginInfo?.authenticated || !this.state.selectedGrant)
      return null;
    let grant = this.state.grants?.find((grant) => grant.id === this.state.selectedGrant);
    return grant && grant.available ? grant.id : null;
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
      grants: null,
      grantsError: null,
      selectedGrant: "",
    });
  }

}
