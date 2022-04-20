import { IFaucetConfig, IFaucetStatus } from '../common/IFaucetConfig';
import { PoWClient } from '../common/PoWClient';
import React, { ReactElement } from 'react';
import { Button, Modal } from 'react-bootstrap';
import HCaptcha from "@hcaptcha/react-hcaptcha";

import './PoWCaptcha.css'
import { IPoWClaimInfo, PoWSession } from '../common/PoWSession';
import { PoWMinerStatus } from './PoWMinerStatus';
import { PoWMiner } from '../common/PoWMiner';
import { renderDate } from '../utils/DateUtils';
import { weiToEth } from '../utils/ConvertHelpers';
import { PoWClaimDialog } from './PoWClaimDialog';
import { PoWFaucetStatus } from './PoWFaucetStatus';
import { TypedEmitter } from 'tiny-typed-emitter';

export interface IPoWCaptchaProps {
  powApiUrl: string;
  minerSrc: string;
}

enum PoWCaptchaMiningStatus {
  IDLE = 0,
  STARTING = 1,
  RUNNING = 2,
  INTERRUPTED = 3,
  STOPPING = 4
};

export interface IStatusDialog {
  title: string;
  body: ReactElement;
  closeButton?: {
    caption: string;
  },
  applyButton?: {
    caption: string;
    applyFn: () => void,
  },
}

export interface IPoWCaptchaState {
  initializing: boolean;
  faucetConfig: IFaucetConfig;
  faucetStatusText: string;
  faucetStatusLevel: string;
  targetAddr: string;
  requestCaptcha: boolean;
  captchaToken: string;
  miningStatus: PoWCaptchaMiningStatus;
  isClaimable: boolean;
  statusDialog: IStatusDialog;
  statusMessage: string;
  showRestoreSessionDialog: boolean;
  showClaimRewardDialog: IPoWClaimInfo;
  showFaucetStatus: boolean;
}

export class PoWCaptcha extends React.PureComponent<IPoWCaptchaProps, IPoWCaptchaState> {
  private powClient: PoWClient;
  private powSession: PoWSession;
  private hcapControl: HCaptcha;
  private eventListeners: {[key: string]: {
    emmiter: TypedEmitter;
    event: string;
    listener: Function;
    bound?: boolean;
  }} = {};
  private faucetStatucClickCount = 0;
  private restoredPersistedState = false;

  constructor(props: IPoWCaptchaProps, state: IPoWCaptchaState) {
    super(props);

    this.powClient = new PoWClient({
      powApiUrl: props.powApiUrl,
    });
    this.powClient.on("open", () => {
      let faucetConfig = this.powClient.getFaucetConfig();
      this.setState({
        initializing: false,
        faucetConfig: faucetConfig,
        faucetStatusText: faucetConfig.faucetStatus.text,
        faucetStatusLevel: faucetConfig.faucetStatus.level,
      });

      if(!this.restoredPersistedState)
        this.restorePersistedState();

    });

    this.powSession = new PoWSession({
      client: this.powClient,
      getInputs: () => {
        var capToken = this.state.captchaToken;
        if(this.hcapControl) {
          this.hcapControl.resetCaptcha();
          this.setState({ captchaToken: null, })
        }
        return {
          addr: this.state.targetAddr,
          token: capToken
        };
      },
    });

    this.eventListeners = {
      "clientFaucetStatus": {
        emmiter: this.powClient,
        event: "faucetStatus",
        listener: (faucetStatus) => this.onPoWClientFaucetStatus(faucetStatus),
      },
      "sessionUpdate": {
        emmiter: this.powSession,
        event: "update",
        listener: () => this.onPoWSessionUpdate(),
      },
      "sessionKilled": {
        emmiter: this.powSession,
        event: "killed",
        listener: (killInfo) => this.onPoWSessionKilled(killInfo),
      },
    };

    this.state = {
      initializing: true,
      faucetConfig: null,
      faucetStatusText: null,
      faucetStatusLevel: null,
      targetAddr: "",
      requestCaptcha: false,
      captchaToken: null,
      miningStatus: PoWCaptchaMiningStatus.IDLE,
      isClaimable: false,
      statusDialog: null,
      statusMessage: null,
      showRestoreSessionDialog: false,
      showClaimRewardDialog: null,
      showFaucetStatus: false,
		};
  }

  public componentDidMount() {
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(eventListener.bound)
        return;
      eventListener.emmiter.on(eventListener.event, eventListener.listener as any);
      eventListener.bound = true;
    });
  }

  public componentWillUnmount() {
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(!eventListener.bound)
        return;
      eventListener.emmiter.off(eventListener.event, eventListener.listener as any);
      eventListener.bound = false;
    });
  }

  private restorePersistedState() {
    this.restoredPersistedState = true;
    let persistedSession = this.powSession.getStoredSessionInfo();
    let persistedClaim = this.powSession.getStoredClaimInfo();

    this.setState({
      showRestoreSessionDialog: !!persistedSession,
      showClaimRewardDialog: persistedClaim
    });
  }

  private onPoWClientFaucetStatus(faucetStatus: IFaucetStatus) {
    this.setState({
      faucetStatusText: faucetStatus.text,
      faucetStatusLevel: faucetStatus.level,
    });
  }

  private onPoWSessionUpdate() {
    let sessionInfo = this.powSession.getSessionInfo();
    if(this.state.miningStatus === PoWCaptchaMiningStatus.IDLE && sessionInfo) {
      // start miner
      if(!this.powSession.getMiner()) {
        this.powSession.setMiner(new PoWMiner({
          session: this.powSession,
          workerSrc: this.props.minerSrc,
          powParams: this.state.faucetConfig.powParams,
          nonceCount: this.state.faucetConfig.powNonceCount,
        }));
      }
      this.setState({
        miningStatus: PoWCaptchaMiningStatus.RUNNING,
        targetAddr: sessionInfo.targetAddr,
        isClaimable: (sessionInfo.balance >= this.state.faucetConfig.minClaim),
        statusMessage: null,
      });
    }
    else if(this.state.miningStatus !== PoWCaptchaMiningStatus.IDLE && !sessionInfo) {
      if(this.powSession.getMiner()) {
        this.powSession.getMiner().stopMiner();
        this.powSession.setMiner(null);
      }
      this.setState({
        miningStatus: PoWCaptchaMiningStatus.IDLE,
        targetAddr: "",
        statusMessage: null,
      });
    }
    else if(this.state.isClaimable !== (sessionInfo.balance >= this.state.faucetConfig.minClaim)) {
      this.setState({
        isClaimable: (sessionInfo.balance >= this.state.faucetConfig.minClaim),
      });
    }
  }

  private onPoWSessionKilled(killInfo: any) {
    let killMsg: string = killInfo.message;
    if(killInfo.level === "session") {
      killMsg = "Your session has been killed for bad behaviour (" + killMsg + "). Are you cheating?? :(";
    }
    this.setState({
      statusDialog: {
        title: "Session killed!",
        body: (
          <div className='alert alert-danger'>{killMsg}</div>
        ),
        closeButton: {
          caption: "Close",
        }
      },
    });
  }

	public render(): React.ReactElement<IPoWCaptchaProps> {
    let renderControl: React.ReactElement;
    if(this.state.initializing) {
      return (
        <div className="pow-captcha">
          <div className="loading-spinner">
            <img src="/images/spinner.gif" className="spinner" />
            <span className="spinner-text">Connecting...</span>
          </div>
        </div>
      );
    }
    else if(this.state.showFaucetStatus) {
      return <PoWFaucetStatus powClient={this.powClient} faucetConfig={this.state.faucetConfig} />;
    }

    let actionButtonControl: React.ReactElement;
    let enableCaptcha = !!this.state.faucetConfig.hcapSiteKey;
    let requestCaptcha = false;

    switch(this.state.miningStatus) {
      case PoWCaptchaMiningStatus.IDLE:
        requestCaptcha = enableCaptcha && this.state.faucetConfig.hcapSession;
      case PoWCaptchaMiningStatus.STARTING:
        actionButtonControl = (
          <button 
            className="btn btn-success start-action" 
            onClick={(evt) => this.onStartMiningClick()} 
            disabled={this.state.miningStatus == PoWCaptchaMiningStatus.STARTING}>
              {this.state.statusMessage ? this.state.statusMessage : "Start Mining"}
          </button>
        );
        break;
      case PoWCaptchaMiningStatus.RUNNING:
      case PoWCaptchaMiningStatus.INTERRUPTED:
      case PoWCaptchaMiningStatus.STOPPING:
        actionButtonControl = (
          <button 
            className="btn btn-danger stop-action" 
            onClick={(evt) => this.onStopMiningClick()} 
            disabled={this.state.miningStatus !== PoWCaptchaMiningStatus.RUNNING}>
              {this.state.statusMessage ? this.state.statusMessage : (this.state.isClaimable ? "Stop Mining & Claim Rewards" : "Stop Mining")}
          </button>
        );
        break;
    }

    let faucetStatusClass: string = "";
    if(this.state.faucetStatusLevel) {
      switch(this.state.faucetStatusLevel) {
        case "info":
          faucetStatusClass = "alert-info";
          break;
        case "warn":
          faucetStatusClass = "alert-warning";
          break;
        case "error":
          faucetStatusClass = "alert-danger";
          break;
        default:
          faucetStatusClass = "alert-light";
          break;
      }
    }

    return (
      <div>
        <div className="faucet-title">
          <h1 className="center">{this.state.faucetConfig.faucetTitle}</h1>
          <div className="faucet-status-link" onClick={() => this.onFaucetStatusClick()}></div>
        </div>
        {this.state.faucetStatusText ? 
        <div className={["faucet-status-alert alert", faucetStatusClass].join(" ")} role="alert">
          {this.state.faucetStatusText}
        </div>
        : null}
        <div className="pow-header center">
          <div className="pow-status-container">
            {this.powSession.getMiner() ? 
              <PoWMinerStatus powMiner={this.powSession.getMiner()} powSession={this.powSession} faucetConfig={this.state.faucetConfig} stopMinerFn={() => this.onStopMiningClick()} /> :
              <img src={this.state.faucetConfig.faucetImage} className="image" />
            }
          </div>
        </div>
        {this.state.showRestoreSessionDialog ? this.renderRestoreSessionDialog() : null}
        {this.state.showClaimRewardDialog ? this.renderClaimRewardDialog() : null}
        {this.state.statusDialog ? this.renderStatusDialog() : null}
        <div className="faucet-inputs">
          <input 
            className="form-control" 
            value={this.state.targetAddr} 
            placeholder={"Please enter ETH address" + (this.state.faucetConfig.resolveEnsNames ? " or ENS name" : "")} 
            onChange={(evt) => this.setState({ targetAddr: evt.target.value })} 
            disabled={this.state.miningStatus !== PoWCaptchaMiningStatus.IDLE} 
          />
          {requestCaptcha ? 
            <div className='faucet-captcha'>
              <HCaptcha 
                sitekey={this.state.faucetConfig.hcapSiteKey} 
                onVerify={(token) => this.setState({ captchaToken: token })}
                ref={(cap) => this.hcapControl = cap} 
              />
            </div>
          : null}
          <div className="faucet-actions center">
            {actionButtonControl}  
          </div>
          {renderControl}
        </div>
      </div>
    );
	}

  private onStartMiningClick() {
    this.setState({
      miningStatus: PoWCaptchaMiningStatus.STARTING,
      statusMessage: "Starting mining..."
    });
    this.powSession.startSession().then(() => {
      this.powSession.setMiner(new PoWMiner({
        session: this.powSession,
        workerSrc: this.props.minerSrc,
        powParams: this.state.faucetConfig.powParams,
        nonceCount: this.state.faucetConfig.powNonceCount,
      }));
      this.setState({
        miningStatus: PoWCaptchaMiningStatus.RUNNING,
        isClaimable: false,
        statusMessage: null,
      });
    }, (err) => {
      this.setState({
        miningStatus: PoWCaptchaMiningStatus.IDLE,
        statusDialog: {
          title: "Could not start session.",
          body: (<div className='alert alert-danger'>{(err && err.message ? err.message : err)}</div>),
          closeButton: {
            caption: "Close",
          }
        }, 
        statusMessage: null,
      });
    });
  }

  private onStopMiningClick() {
    this.setState({
      miningStatus: PoWCaptchaMiningStatus.STOPPING,
      statusMessage: "Claiming rewards..."
    });
    this.powSession.getMiner().stopMiner();

    let sessionInfo = this.powSession.getSessionInfo();
    this.powSession.closeSession().then((claimToken) => {
      this.powSession.setMiner(null);

      if(claimToken) {
        let claimInfo: IPoWClaimInfo = {
          session: sessionInfo.sessionId,
          startTime: sessionInfo.startTime,
          target: sessionInfo.targetAddr,
          balance: sessionInfo.balance,
          token: claimToken
        };
        this.powSession.storeClaimInfo(claimInfo);
        this.setState({
          showClaimRewardDialog: claimInfo
        });
      }
      else {
        this.setState({
          miningStatus: PoWCaptchaMiningStatus.IDLE,
          statusMessage: null,
        });
      }
    });
  }

  private onFaucetStatusClick() {
    this.faucetStatucClickCount++;
    if(this.faucetStatucClickCount >= 10) {
      this.faucetStatucClickCount = 0;
      this.setState({
        showFaucetStatus: true
      });
    }
  }

  private renderStatusDialog(): ReactElement {
    return (
      <Modal show centered className="pow-captcha-modal" onHide={() => {
        this.setState({
          statusDialog: null,
        });
      }}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            {this.state.statusDialog.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.statusDialog.body}
        </Modal.Body>
        <Modal.Footer>
          {this.state.statusDialog.applyButton ? 
            <Button onClick={() => {
              this.state.statusDialog.applyButton.applyFn();
              this.setState({
                statusDialog: null,
              });
            }}>{this.state.statusDialog.applyButton.caption}</Button>
          : null}
          {this.state.statusDialog.closeButton ? 
            <Button onClick={() => {
              this.setState({
                statusDialog: null,
              });
            }}>{this.state.statusDialog.closeButton.caption}</Button>
          : null}
        </Modal.Footer>
      </Modal>
    );
  }

  private renderRestoreSessionDialog(): ReactElement {
    let storedSessionInfo = this.powSession.getStoredSessionInfo();
    return (
      <Modal show centered size="lg" className="pow-captcha-modal" onHide={() => {
        this.setState({
          showRestoreSessionDialog: false,
        });
      }}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Continue mining on previous session?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='container'>
            <div className='row'>
              <div className='col'>
                Do you want to continue mining on your previous session?
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Address:
              </div>
              <div className='col'>
                {storedSessionInfo.targetAddr}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Start Time:
              </div>
              <div className='col'>
                {renderDate(new Date(storedSessionInfo.startTime * 1000), true)}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Balance:
              </div>
              <div className='col'>
                {Math.round(weiToEth(storedSessionInfo.balance) * 100) / 100} ETH
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => {
            this.setState({
              showRestoreSessionDialog: false,
            });
            this.powSession.restoreStoredSession();
          }}>Continue previous session</Button>
          <Button onClick={() => {
            this.setState({
              showRestoreSessionDialog: false,
            });
          }}>Start new session</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  private renderClaimRewardDialog(): ReactElement {
    return (
      <PoWClaimDialog 
        powClient={this.powClient}
        powSession={this.powSession}
        reward={this.state.showClaimRewardDialog}
        faucetConfig={this.state.faucetConfig}
        onClose={(clearClaim) => {
          if(clearClaim)
            this.powSession.storeClaimInfo(null);
          this.setState({
            showClaimRewardDialog: null,
            miningStatus: PoWCaptchaMiningStatus.IDLE,
            statusMessage: null,
          });
        }}
        setDialog={(dialog) => {
          this.setState({
            statusDialog: dialog
          });
        }} 
      />
    );
  }

}
