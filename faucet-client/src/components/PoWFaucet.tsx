import { IFaucetConfig, IFaucetStatus } from '../common/IFaucetConfig';
import { PoWClient } from '../common/PoWClient';
import React, { ReactElement } from 'react';
import { Button, Modal } from 'react-bootstrap';
import HCaptcha from "@hcaptcha/react-hcaptcha";

import './PoWFaucet.css'
import { IPoWClaimInfo, PoWSession } from '../common/PoWSession';
import { PoWMinerStatus } from './PoWMinerStatus';
import { PoWMiner } from '../common/PoWMiner';
import { renderDate } from '../utils/DateUtils';
import { weiToEth } from '../utils/ConvertHelpers';
import { PoWClaimDialog } from './PoWClaimDialog';
import { PoWFaucetStatus } from './PoWFaucetStatus';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IPoWStatusDialogProps, PoWStatusDialog } from './PoWStatusDialog';
import { PoWRestoreSessionDialog } from './PoWRestoreSessionDialog';
import { PoWFaucetCaptcha } from './PoWFaucetCaptcha';

export interface IPoWFaucetProps {
  powApiUrl: string;
  minerSrc: string;
}

enum PoWFaucetMiningStatus {
  IDLE = 0,
  STARTING = 1,
  RUNNING = 2,
  INTERRUPTED = 3,
  STOPPING = 4
};

export interface IPoWFaucetState {
  initializing: boolean;
  faucetConfig: IFaucetConfig;
  faucetStatus: IFaucetStatus[];
  isConnected: boolean;
  targetAddr: string;
  requestCaptcha: boolean;
  miningStatus: PoWFaucetMiningStatus;
  isClaimable: boolean;
  statusDialog: IPoWStatusDialogProps;
  statusMessage: string;
  showRestoreSessionDialog: boolean;
  showClaimRewardDialog: IPoWClaimInfo;
  showFaucetStatus: boolean;
}

export class PoWFaucet extends React.PureComponent<IPoWFaucetProps, IPoWFaucetState> {
  private powClient: PoWClient;
  private powSession: PoWSession;
  private captchaControl: PoWFaucetCaptcha;
  private eventListeners: {[key: string]: {
    emmiter: TypedEmitter;
    event: string;
    listener: Function;
    bound?: boolean;
  }} = {};
  private faucetStatucClickCount = 0;
  private restoredPersistedState = false;

  constructor(props: IPoWFaucetProps, state: IPoWFaucetState) {
    super(props);

    this.powClient = new PoWClient({
      powApiUrl: props.powApiUrl,
    });
    this.powClient.on("open", () => {
      let faucetConfig = this.powClient.getFaucetConfig();
      this.setState({
        initializing: false,
        faucetConfig: faucetConfig,
        faucetStatus: faucetConfig.faucetStatus,
        isConnected: true,
      });

      if(!this.restoredPersistedState)
        this.restorePersistedState();
    });
    this.powClient.on("close", () => {
      this.setState({
        isConnected: false,
      });
    });

    this.powSession = new PoWSession({
      client: this.powClient,
      getInputs: () => {
        var capToken = "";
        if(this.captchaControl) {
          capToken = this.captchaControl.getToken();
          this.captchaControl.resetToken();
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
      "sessionError": {
        emmiter: this.powSession,
        event: "error",
        listener: (error) => this.onPoWSessionError(error),
      },
      "sessionClaimable": {
        emmiter: this.powSession,
        event: "claimable",
        listener: (claimInfo) => this.onPoWSessionClaimable(claimInfo),
      },
    };

    this.state = {
      initializing: true,
      faucetConfig: null,
      faucetStatus: [],
      isConnected: false,
      targetAddr: "",
      requestCaptcha: false,
      miningStatus: PoWFaucetMiningStatus.IDLE,
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

  private onPoWClientFaucetStatus(faucetStatus: IFaucetStatus[]) {
    this.setState({
      faucetStatus: faucetStatus
    });
  }

  private onPoWSessionUpdate() {
    let sessionInfo = this.powSession.getSessionInfo();
    if(this.state.miningStatus === PoWFaucetMiningStatus.IDLE && sessionInfo) {
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
        miningStatus: PoWFaucetMiningStatus.RUNNING,
        targetAddr: sessionInfo.targetAddr,
        isClaimable: (sessionInfo.balance >= this.state.faucetConfig.minClaim),
        statusMessage: null,
      });
    }
    else if(this.state.miningStatus !== PoWFaucetMiningStatus.IDLE && !sessionInfo) {
      if(this.powSession.getMiner()) {
        this.powSession.getMiner().stopMiner();
        this.powSession.setMiner(null);
      }
      this.setState({
        miningStatus: PoWFaucetMiningStatus.IDLE,
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

  private onPoWSessionError(err: any) {
    this.setState({
      statusDialog: {
        title: "Session Error",
        body: (
          <div className='alert alert-danger'>{err && err.message ? err.message : err ? err.toString() : ""}</div>
        ),
        closeButton: {
          caption: "Close",
        }
      },
    });
  }

  private onPoWSessionClaimable(claimInfo: IPoWClaimInfo) {
    this.setState({
      showClaimRewardDialog: claimInfo
    });
  }

	public render(): React.ReactElement<IPoWFaucetProps> {
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
      case PoWFaucetMiningStatus.IDLE:
        requestCaptcha = enableCaptcha && this.state.faucetConfig.hcapSession;
      case PoWFaucetMiningStatus.STARTING:
        actionButtonControl = (
          <button 
            className="btn btn-success start-action" 
            onClick={(evt) => this.onStartMiningClick()} 
            disabled={!this.state.isConnected || this.state.miningStatus == PoWFaucetMiningStatus.STARTING}>
              {this.state.statusMessage ? this.state.statusMessage : "Start Mining"}
          </button>
        );
        break;
      case PoWFaucetMiningStatus.RUNNING:
      case PoWFaucetMiningStatus.INTERRUPTED:
      case PoWFaucetMiningStatus.STOPPING:
        actionButtonControl = (
          <button 
            className="btn btn-danger stop-action" 
            onClick={(evt) => this.onStopMiningClick(false)} 
            disabled={!this.state.isConnected || this.state.miningStatus !== PoWFaucetMiningStatus.RUNNING}>
              {this.state.statusMessage ? this.state.statusMessage : (this.state.isClaimable ? "Stop Mining & Claim Rewards" : "Stop Mining")}
          </button>
        );
        break;
    }

    let faucetStatusEls = this.state.faucetStatus.map((status, idx) => {
      let faucetStatusClass: string = "";
      switch(status.level) {
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

      return (
        <div key={"status" + idx} className={["faucet-status-alert alert", faucetStatusClass].join(" ")} role="alert">
          {status.ishtml ? 
          <div dangerouslySetInnerHTML={{__html: status.text}} /> :
          <span>{status.text}</span>}
        </div>
      );
    })
    
    return (
      <div className='faucet-page'>
        <div className="faucet-title">
          <h1 className="center">{this.state.faucetConfig.faucetTitle}</h1>
          <div className="faucet-status-link" onClick={() => this.onFaucetStatusClick()}></div>
        </div>
        {faucetStatusEls}
        {!this.state.isConnected ? 
          <div className="faucet-status-alert alert alert-danger" role="alert">
            <span>Connection to faucet server lost. Reconnecting...</span>
          </div>
        : null}
        <div className="pow-header center">
          <div className="pow-status-container">
            {this.powSession.getMiner() ? 
              <PoWMinerStatus powMiner={this.powSession.getMiner()} powSession={this.powSession} faucetConfig={this.state.faucetConfig} stopMinerFn={(force) => this.onStopMiningClick(force)} /> :
              <div className='pow-faucet-home'>
                {this.state.faucetConfig.faucetImage ?
                  <img src={this.state.faucetConfig.faucetImage} className="image" />
                : null}
              </div>
            }
          </div>
        </div>
        {this.state.showRestoreSessionDialog ? 
          <PoWRestoreSessionDialog 
            powSession={this.powSession} 
            faucetConfig={this.state.faucetConfig} 
            closeFn={() => this.setState({ showRestoreSessionDialog: false })}
            setDialog={(dialog) => this.setState({ statusDialog: dialog })}
          /> 
        : null}
        {this.state.showClaimRewardDialog ? 
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
              });
            }}
            setDialog={(dialog) => this.setState({ statusDialog: dialog })}
          />
        : null}
        {this.state.statusDialog ? 
          <PoWStatusDialog 
            {...this.state.statusDialog} 
            closeFn={() => this.setState({ statusDialog: null })} 
          /> 
        : null}
        <div className="faucet-inputs">
          <input 
            className="form-control" 
            value={this.state.targetAddr} 
            placeholder={"Please enter ETH address" + (this.state.faucetConfig.resolveEnsNames ? " or ENS name" : "")} 
            onChange={(evt) => this.setState({ targetAddr: evt.target.value })} 
            disabled={this.state.miningStatus !== PoWFaucetMiningStatus.IDLE} 
          />
          {requestCaptcha ? 
            <div className='faucet-captcha'>
              <PoWFaucetCaptcha 
                faucetConfig={this.state.faucetConfig} 
                ref={(cap) => this.captchaControl = cap} 
              />
            </div>
          : null}
          <div className="faucet-actions center">
            {actionButtonControl}  
          </div>
          {renderControl}
        </div>
        <div className='faucet-description'>
          {this.state.faucetConfig.faucetHtml ?
            <div className="pow-home-container" dangerouslySetInnerHTML={{__html: this.state.faucetConfig.faucetHtml}} />
          : null}
        </div>
      </div>
    );
	}

  private onStartMiningClick() {
    this.setState({
      miningStatus: PoWFaucetMiningStatus.STARTING,
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
        miningStatus: PoWFaucetMiningStatus.RUNNING,
        isClaimable: false,
        statusMessage: null,
      });
    }, (err) => {
      this.setState({
        miningStatus: PoWFaucetMiningStatus.IDLE,
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

  private onStopMiningClick(force: boolean) {
    let sessionInfo = this.powSession.getSessionInfo();
    if(!this.state.isClaimable && sessionInfo.balance > 0 && !force) {
      this.setState({
        statusDialog: {
          title: "Mining balance too low",
          body: (
            <div className='alert alert-warning'>
              Your mining balance of {Math.round(weiToEth(sessionInfo.balance) * 1000) / 1000} {this.state.faucetConfig.faucetCoinSymbol} is too low to be claimed.<br />
              The minimum allowed amount is {Math.round(weiToEth(this.state.faucetConfig.minClaim) * 1000) / 1000} {this.state.faucetConfig.faucetCoinSymbol}.<br />
              Do you want to stop mining and loose the rewards you've already collected?
              </div>
          ),
          closeButton: {
            caption: "Continue mining",
          },
          applyButton: {
            caption: "Stop mining",
            applyFn: () => {
              this.onStopMiningClick(true);
            }
          }
        },
      });
      return;
    }

    this.setState({
      miningStatus: PoWFaucetMiningStatus.STOPPING,
      statusMessage: "Claiming rewards..."
    });
    this.powSession.getMiner().stopMiner();

    this.powSession.closeSession().then(() => {
      this.powSession.setMiner(null);
      this.setState({
        miningStatus: PoWFaucetMiningStatus.IDLE,
        statusMessage: null,
      });
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

}
