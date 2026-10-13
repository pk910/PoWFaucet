import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IFaucetConfig, ITicketProofModuleConfig } from '../../../common/FaucetConfig';
import { IFaucetContext } from '../../../common/FaucetContext';
import { OverlayChildren } from 'react-bootstrap/esm/Overlay';

import './TicketProofLogin.css';

export interface ITicketProofLoginProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
}

export interface ITicketProofLoginState {
  loginPending: boolean;
  authInfo: ITicketProofAuthInfo | null;
}

export interface ITicketProofAuthInfo {
  identifier: string;
  tier: string;
  event: string;
  issuedAt: number;
  token: string;
}

const MODULE_NAME = "ticket-proof";
const PROOF_PARAMS = ["v", "id", "tier", "partner", "event", "exp", "sig"];

/**
 * Login with a partner ticket proof.
 *
 * There is no popup and no callback: the event app sends the attendee here with the
 * proof in the query string. On mount the proof is swapped for a faucet token through
 * the module's login endpoint, the token is kept in localStorage and the proof is
 * removed from the url (it is a bearer, and the browser history is no place for it).
 */
export class TicketProofLogin extends React.PureComponent<ITicketProofLoginProps, ITicketProofLoginState> {

  constructor(props: ITicketProofLoginProps) {
    super(props);

    this.state = {
      loginPending: false,
      authInfo: null,
    };
  }

  public componentDidMount() {
    let proof = this.readProofFromUrl();
    if(proof) {
      this.stripProofFromUrl();
      this.loginWithProof(proof);
    }
    else if(localStorage[MODULE_NAME + '.AuthInfo']) {
      try {
        let authInfo = JSON.parse(localStorage[MODULE_NAME + '.AuthInfo']);
        this.loadAuthInfo(authInfo);
      } catch(ex) {
        console.error("error parsing auth info from localstorage: ", ex);
      }
    }
  }

  /** the module's client config block; the component is only rendered when the module is enabled */
  private get moduleConfig(): ITicketProofModuleConfig {
    return this.props.faucetConfig.modules[MODULE_NAME] as ITicketProofModuleConfig;
  }

  public render(): React.ReactElement {
    let logo = this.moduleConfig.loginLogo;
    return (
      <div className='faucet-ticketproof-auth'>
        <div className='auth-icon'>
          {logo ?
            <div className='logo logo-ticketproof' style={{backgroundImage: "url('" + logo + "')"}}></div>
          :
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="logo logo-ticketproof-default">
              <path d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a.5.5 0 0 1-.5.5 1.5 1.5 0 0 0 0 3 .5.5 0 0 1 .5.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11.5V10a.5.5 0 0 1 .5-.5 1.5 1.5 0 1 0 0-3A.5.5 0 0 1 0 6V4.5ZM1.5 4a.5.5 0 0 0-.5.5v1.05a2.5 2.5 0 0 1 0 4.9v1.05a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-1.05a2.5 2.5 0 0 1 0-4.9V4.5a.5.5 0 0 0-.5-.5h-13Z"/>
              <path d="M6 5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z"/>
            </svg>
          }
        </div>
        {this.state.authInfo ?
          this.renderLoginState() :
          this.renderLoginButton()
        }
      </div>
    );
  }

  /*
   * The overlay container is handed over as a function: this component first renders
   * while the page's container ref is still null, and an OverlayTrigger that got
   * `undefined` then falls back to document.body, outside the `.faucet-bootstrap`
   * scope that carries the tooltip styles (bare text floating over the page).
   */
  private renderInfoIcon(): React.ReactElement | null {
    if(!this.moduleConfig.infoHtml)
      return null;
    return (
      <OverlayTrigger
        placement="bottom"
        container={() => this.props.faucetContext.getContainer()}
        overlay={this.renderInfoHtml() as OverlayChildren}
      >
        <span className="ticketproof-info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </span>
      </OverlayTrigger>
    );
  }

  private renderLoginButton(): React.ReactElement {
    let moduleConfig = this.moduleConfig;
    let appLabel = moduleConfig.appLabel || "the event app";
    return (
      <div className='auth-field auth-noauth'>
        <div>
          {moduleConfig.loginLabel || "Event attendee? Login with your Ticket."}
          {this.renderInfoIcon()}
        </div>
        <div>
          {this.state.loginPending ?
            <span>
              <span className='inline-spinner'>
                <img src="/images/spinner.gif" className="spinner" />
              </span>
              Verifying your ticket proof...
            </span>
          : moduleConfig.appUrl ?
            <span>
              <a href={moduleConfig.appUrl} target="_blank" rel="noopener noreferrer">
                Get your proof in {appLabel}
              </a>
              <span className='auth-hint'> (open your ticket and tap the faucet perk, it brings you back here)</span>
            </span>
          :
            <span className='auth-hint'>Open the faucet perk on your ticket in {appLabel} to log in.</span>
          }
        </div>
      </div>
    );
  }

  private renderLoginState(): React.ReactElement {
    let moduleConfig = this.moduleConfig;
    let authInfo = this.state.authInfo as ITicketProofAuthInfo;
    return (
      <div className='auth-field auth-profile'>
        <div className='auth-info'>
          {moduleConfig.userLabel || "Authenticated with Event Ticket."}
          {this.renderInfoIcon()}
        </div>
        <div className="auth-logout">
          <a href="#" onClick={(evt) => {evt.preventDefault(); this.onLogoutClick()}}>
            Logout
          </a>
        </div>
        <div className='auth-info'>
          Ticket:
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 250, hide: 400 }}
            container={() => this.props.faucetContext.getContainer()}
            overlay={(props) => this.renderTicketInfo(authInfo, props)}
          >
            <span className="auth-ident-truncated">{authInfo.identifier}</span>
          </OverlayTrigger>
          <span className='auth-tier'>({authInfo.tier})</span>
        </div>
      </div>
    );
  }

  private renderTicketInfo(authInfo: ITicketProofAuthInfo, props: any): React.ReactElement {
    return (
      <Tooltip id="ticketproof-tooltip" {...props}>
        <div className='ticketproof-info'>
          <table>
            <tbody>
              <tr>
                <td className='ticketproof-title'>Ticket:</td>
                <td className='ticketproof-value'>{authInfo.identifier}</td>
              </tr>
              <tr>
                <td className='ticketproof-title'>Event:</td>
                <td className='ticketproof-value'>{authInfo.event}</td>
              </tr>
              <tr>
                <td className='ticketproof-title'>Tier:</td>
                <td className='ticketproof-value'>{authInfo.tier}</td>
              </tr>
            </tbody>
          </table>
          <div className='ticketproof-note'>The ticket id is a pseudonym issued by the event app; it carries no personal data.</div>
        </div>
      </Tooltip>
    );
  }

  private renderInfoHtml(): React.ReactElement {
    return (
      <Tooltip id="ticketproof-tooltip">
        <div className='ticketproof-info' dangerouslySetInnerHTML={{__html: this.moduleConfig.infoHtml || ""}}></div>
      </Tooltip>
    );
  }

  public getToken(): string | undefined {
    return this.state.authInfo?.token;
  }

  private readProofFromUrl(): {[key: string]: string} | null {
    let params = new URLSearchParams(window.location.search);
    if(!params.get("sig") || !params.get("id"))
      return null;
    let proof: {[key: string]: string} = {};
    PROOF_PARAMS.forEach((key) => {
      let value = params.get(key);
      if(value !== null)
        proof[key] = value;
    });
    return proof;
  }

  private stripProofFromUrl() {
    let params = new URLSearchParams(window.location.search);
    PROOF_PARAMS.forEach((key) => params.delete(key));
    let search = params.toString();
    let url = window.location.pathname + (search ? "?" + search : "") + window.location.hash;
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch(ex) {
      console.error("could not remove the ticket proof from the url: ", ex);
    }
  }

  private loginWithProof(proof: {[key: string]: string}) {
    this.setState({
      loginPending: true,
    });
    this.props.faucetContext.faucetApi.apiPost("/ticketProofLogin", undefined, proof).then((authResult) => {
      this.setState({
        loginPending: false,
      });
      if(authResult.data) {
        this.loadAuthInfo(authResult.data);
        localStorage[MODULE_NAME + '.AuthInfo'] = JSON.stringify(authResult.data);
      }
      else {
        this.props.faucetContext.showDialog({
          title: "Could not verify your ticket proof",
          body: (<div className='alert alert-danger'>[{authResult.errorCode || "ERROR"}] {authResult.errorMessage || "Unknown error"}</div>),
          closeButton: { caption: "Close" },
        });
      }
    }, (err) => {
      this.setState({
        loginPending: false,
      });
      this.props.faucetContext.showDialog({
        title: "Could not verify your ticket proof",
        body: (<div className='alert alert-danger'>{err?.toString()}</div>),
        closeButton: { caption: "Close" },
      });
    });
  }

  private onLogoutClick() {
    localStorage.removeItem(MODULE_NAME + ".AuthInfo");
    this.setState({
      authInfo: null,
    });
  }

  private loadAuthInfo(authInfo: ITicketProofAuthInfo) {
    this.setState({
      authInfo: authInfo,
    });
  }

}
