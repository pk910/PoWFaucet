import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IFaucetConfig } from '../../../common/FaucetConfig';
import { IFaucetContext } from '../../../common/FaucetContext';
import { ArgumentTypeName, PCDGetRequest, PCDRequestType, PCDTypeName } from "./ZupassTypes";

import './ZupassLogin.css';

export interface IZupassLoginProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
}

export interface IZupassLoginState {
  popupOpen: boolean;
  authInfo: IZupassAuthInfo;
}

export interface IZupassAuthInfo {
  ticketId: string;
  productId: string;
  eventId: string;
  attendeeId: string;
  token: string;
}

export class ZupassLogin extends React.PureComponent<IZupassLoginProps, IZupassLoginState> {
  private messageEvtListener: (evt: MessageEvent) => void;
  private loginPopop: Window;

  constructor(props: IZupassLoginProps, state: IZupassLoginState) {
    super(props);

    this.messageEvtListener = (evt: MessageEvent) => this.processWindowMessage(evt);

    this.state = {
      popupOpen: false,
      authInfo: null,
		};
  }

  public componentDidMount() {
    window.addEventListener("message", this.messageEvtListener);
    if(localStorage['zupass.AuthResult']) {
      try {
        this.processLoginResult(JSON.parse(localStorage['zupass.AuthResult']));
        localStorage.removeItem("zupass.AuthResult");
      } catch(ex) {
        console.error("error parsing auth result from localstorage: ", ex);
      }
    }
    else if(localStorage['zupass.AuthInfo']) {
      try {
        let authInfo = JSON.parse(localStorage['zupass.AuthInfo']);
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
      <div className='faucet-zupass-auth'>
        <div className='auth-icon'>
          <div className='logo logo-zupass' style={{backgroundImage: "url('"+ (this.props.faucetConfig.modules.zupass.loginLogo || "/images/zupass_logo.jpg") + "')"}}></div>
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
        <div>
          {this.props.faucetConfig.modules.zupass.loginLabel || "Event attendee? Login with your Ticket."}
          {this.props.faucetConfig.modules.zupass.infoHtml ?
            <OverlayTrigger
              placement="bottom"
              container={this.props.faucetContext.getContainer()}
              overlay={this.renderInfoHtml()}
            >
              <span className="zupass-info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
              </span>
            </OverlayTrigger>
          : null}
        </div>
        <div>
          <a href="#" onClick={(evt) => evt.preventDefault()}>
            {this.state.popupOpen ?
              <span className='inline-spinner'>
                <img src="/images/spinner.gif" className="spinner" />
              </span>
            : null}
            Login with Zupass
          </a>
        </div>
      </div>
    );
  }

  private renderLoginState(): React.ReactElement {
    return (
      <div className='auth-field auth-profile'>
        <div className='auth-info'>
          {this.props.faucetConfig.modules.zupass.userLabel || "Authenticated with Zupass Ticket."}
          {this.props.faucetConfig.modules.zupass.infoHtml ?
            <OverlayTrigger
              placement="bottom"
              container={this.props.faucetContext.getContainer()}
              overlay={this.renderInfoHtml()}
            >
              <span className="zupass-info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
              </span>
            </OverlayTrigger>
          : null}
        </div>
        <div className="auth-logout">
          <a href="#" onClick={(evt) => {evt.preventDefault(); this.onLogoutClick()}}>
            Logout
          </a>
        </div>
        <div className='auth-info'>
          Attendee ID: 
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 250, hide: 400 }}
            container={this.props.faucetContext.getContainer()}
            overlay={(props) => this.renderZupassTicketInfo(this.state.authInfo, props)}
          >
            <span className="auth-ident-truncated">{this.state.authInfo.attendeeId}</span>
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  private renderZupassTicketInfo(ticketInfo: IZupassAuthInfo, props: any): React.ReactElement {
    if(!ticketInfo)
      return null;

    return (
      <Tooltip id="zupass-tooltip" {...props}>
        <div className='zupass-info'>
          <table>
            <tbody>
              <tr>
                <td className='zupass-title'>TicketId:</td>
                <td className='zupass-value'>{ticketInfo.ticketId}</td>
              </tr>
              <tr>
                <td className='zupass-title'>EventId:</td>
                <td className='zupass-value'>{ticketInfo.eventId}</td>
              </tr>
              <tr>
                <td className='zupass-title'>ProductId:</td>
                <td className='zupass-value'>{ticketInfo.productId}</td>
              </tr>
              <tr>
                <td className='zupass-title'>Attendee:</td>
                <td className='zupass-value'>{ticketInfo.attendeeId}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Tooltip>
    );
  }

  private renderInfoHtml(): React.ReactElement {
    if(!this.props.faucetConfig.modules.zupass.infoHtml)
      return null;

    return (
      <Tooltip id="zupass-tooltip">
        <div className='zupass-info' dangerouslySetInnerHTML={{__html: this.props.faucetConfig.modules.zupass.infoHtml}}></div>
      </Tooltip>
    );
  }

  public getToken(): string {
    return this.state.authInfo?.token;
  }

  private onLoginClick() {

    const args = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: PCDTypeName.EdDSATicket,
        value: undefined,
        userProvided: true,
        validatorParams: {
          eventIds: this.props.faucetConfig.modules.zupass.event.eventIds,
          productIds: this.props.faucetConfig.modules.zupass.event.productIds,
          notFoundMessage: "No eligible PCDs found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: PCDTypeName.SemaphoreIdentity,
        value: undefined,
        userProvided: true
      },
      validEventIds: {
        argumentType: ArgumentTypeName.StringArray,
        value: this.props.faucetConfig.modules.zupass.event.eventIds.length != 0 ? this.props.faucetConfig.modules.zupass.event.eventIds : undefined,
        userProvided: false
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: {
          revealTicketId: true,
          revealEventId: true,
          revealAttendeeSemaphoreId: true,
          revealProductId: true,
        },
        userProvided: false
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: this.props.faucetConfig.modules.zupass.nullifier,
        userProvided: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        value: this.props.faucetConfig.modules.zupass.watermark,
        userProvided: false
      }
    };

    const req: PCDGetRequest = {
      type: PCDRequestType.Get,
      returnUrl: this.props.faucetConfig.modules.zupass.redirectUrl || this.props.faucetContext.faucetApi.getApiUrl("/zupassCallback", true),
      args: args,
      pcdType: "zk-eddsa-event-ticket-pcd",
      options: {
        genericProveScreen: true,
        title: "ZKEdDSA Proof",
        description: "zkeddsa ticket pcd request"
      }
    };
    const encReq = encodeURIComponent(JSON.stringify(req));
    let url = `${this.props.faucetConfig.modules.zupass.url}#/prove?request=${encReq}`;

    this.loginPopop = window.open(url, "_blank", "width=450,height=600,top=100,popup");

    if(!this.state.popupOpen) {
      this.setState({
        popupOpen: true,
      }, () => {
        this.pollPopupState();
      });
    }
  }

  private onLogoutClick() {
    localStorage.removeItem("zupass.AuthInfo");
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
    if(!evt.data || typeof evt.data !== "object" || evt.data.authModule !== "zupass" || !evt.data.authResult)
      return;
    this.processLoginResult(evt.data.authResult);
  }

  private processLoginResult(authResult: any) {
    console.log("Zupass auth: ", authResult);
    if(this.loginPopop)
      this.loginPopop.close();
    if(authResult.data) {
      this.loadAuthInfo(authResult.data);
      localStorage['zupass.AuthInfo'] = JSON.stringify(authResult.data);
    }
    else if(authResult.errorCode) {
      this.props.faucetContext.showDialog({
        title: "Could not authenticate with zupass",
        body: (<div className='alert alert-danger'>[{authResult.errorCode}] {authResult.errorMessage}</div>),
        closeButton: { caption: "Close" },
      });
    }
  }

  private loadAuthInfo(authInfo: IZupassAuthInfo) {
    this.setState({
      authInfo: authInfo,
    });
  }

}
