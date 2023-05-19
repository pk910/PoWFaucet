import React from 'react';
import { IFaucetConfig, IFaucetStatus } from '../common/IFaucetConfig';
import { IPoWClientConnectionKeeper, PoWClient } from '../common/PoWClient';
import { IPoWClaimInfo, IPoWSessionInfo, PoWSession } from '../common/PoWSession';
import { PoWMinerStatus } from './PoWMinerStatus';
import { PoWMiner } from '../common/PoWMiner';
import { toReadableAmount } from '../utils/ConvertHelpers';
import { PoWClaimDialog } from './PoWClaimDialog';
import { PoWFaucetStatus } from './PoWFaucetStatus';
import { TypedEmitter } from 'tiny-typed-emitter';
import { IPoWStatusDialogProps, PoWStatusDialog } from './PoWStatusDialog';
import { PoWRestoreSessionDialog } from './PoWRestoreSessionDialog';
import { PoWFaucetCaptcha } from './PoWFaucetCaptcha';
import { PoWApi } from '../common/PoWApi';
import { PoWFaucetNotification } from './PoWFaucetNotification';
import { PoWTime } from '../common/PoWTime';
import './PoWFaucet.css'
import { PoWQueueStatus } from './PoWQueueStatus';

export interface IPoWFaucetProps {
  powWebsockUrl: string;
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
  showQueueStatus: boolean;
  showFaucetStatus: boolean;
  notifications: IPoWFaucetNotification[];
}

export interface IPoWFaucetNotification {
  id: number;
  type: string;
  message: string;
  time?: number;
  timeout?: number;
  timerId?: NodeJS.Timeout;
}

export class PoWFaucet extends React.PureComponent<IPoWFaucetProps, IPoWFaucetState> {
  private powApi: PoWApi;
  private powClient: PoWClient;
  private powSession: PoWSession;
  private miningConnKeper: IPoWClientConnectionKeeper;
  private powTime: PoWTime;
  private captchaControl: PoWFaucetCaptcha;
  private eventListeners: {[key: string]: {
    emmiter: TypedEmitter;
    event: string;
    listener: Function;
    bound?: boolean;
  }} = {};
  private faucetStatucClickCount = 0;
  private restoredPersistedState = false;
  private configRefreshInterval: NodeJS.Timer;
  private lastConfigRefresh = 0;
  private notificationIdCounter = 1;
  private notifications: IPoWFaucetNotification[] = [];

  constructor(props: IPoWFaucetProps, state: IPoWFaucetState) {
    super(props);

    this.powTime = new PoWTime();
    this.powApi = new PoWApi(props.powApiUrl);
    this.powClient = new PoWClient({
      powApiUrl: props.powWebsockUrl,
    });
    this.powClient.on("open", () => {
      let faucetConfig = this.powClient.getFaucetConfig();
      this.lastConfigRefresh = (new Date()).getTime();
      this.powTime.syncTimeOffset(faucetConfig.time);
      this.setState({
        initializing: false,
        faucetConfig: faucetConfig,
        faucetStatus: faucetConfig.faucetStatus,
        isConnected: true,
      });
    });
    this.powClient.on("close", () => {
      this.lastConfigRefresh = (new Date()).getTime();
      this.setState({
        isConnected: false,
      });
    });

    this.powSession = new PoWSession({
      client: this.powClient,
      powTime: this.powTime,
      getInputs: () => {
        let capPromise: Promise<string>;
        if(this.captchaControl) {
          capPromise = this.captchaControl.getToken();
          capPromise.then(() => {
            this.captchaControl.resetToken();
          });
        }
        else
          capPromise = Promise.resolve("");
        return capPromise.then((capToken) => {
          return {
            addr: this.state.targetAddr,
            token: capToken
          }
        });
      },
      showNotification: (type, message, time, timeout) => this.showNotification(type, message, time, timeout),
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
      showQueueStatus: !!(location.hash && location.hash.match(/queue\-status/)),
      showFaucetStatus: !!(location.hash && location.hash.match(/faucet\-status/)),
      notifications: [],
		};
  }

  public componentDidMount() {
    this.loadFaucetConfig();
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(eventListener.bound)
        return;
      eventListener.emmiter.on(eventListener.event, eventListener.listener as any);
      eventListener.bound = true;
    });
    this.startConfigRefreshInterval();  
  }

  public componentWillUnmount() {
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(!eventListener.bound)
        return;
      eventListener.emmiter.off(eventListener.event, eventListener.listener as any);
      eventListener.bound = false;
    });
    if(this.configRefreshInterval) {
      clearInterval(this.configRefreshInterval);
      this.configRefreshInterval = null;
    }
  }

  private startConfigRefreshInterval() {
    if(this.configRefreshInterval)
      clearInterval(this.configRefreshInterval);
    this.configRefreshInterval = setInterval(() => {
      let now = (new Date()).getTime();
      if(this.lastConfigRefresh < now - (10 * 60 * 1000) && !this.state.isConnected) {
        this.loadFaucetConfig();
      }
    }, 30 * 1000);
  }

  private loadFaucetConfig() {
    this.powApi.getFaucetConfig().then((faucetConfig) => {
      this.lastConfigRefresh = (new Date()).getTime();
      this.powTime.syncTimeOffset(faucetConfig.time);
      this.setState({
        initializing: false,
        faucetConfig: faucetConfig,
        faucetStatus: faucetConfig.faucetStatus,
      });
      if(!this.restoredPersistedState)
        this.restorePersistedState(faucetConfig);
    });
  }

  private restorePersistedState(faucetConfig: IFaucetConfig) {
    this.restoredPersistedState = true;
    let persistedSession = this.powSession.getStoredSessionInfo(faucetConfig);
    let persistedClaim = this.powSession.getStoredClaimInfo(faucetConfig);

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
          hashrateLimit: this.state.faucetConfig.powHashrateLimit,
          powTime: this.powTime,
        }));
      }
      if(this.miningConnKeper)
        this.miningConnKeper.close();
      this.miningConnKeper = this.powClient.newConnectionKeeper();
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
      if(this.miningConnKeper) {
        this.miningConnKeper.close();
        this.miningConnKeper = null;
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
    else if(this.state.showQueueStatus) {
      return <PoWQueueStatus powApi={this.powApi} faucetConfig={this.state.faucetConfig} />;
    }
    else if(this.state.showFaucetStatus) {
      return <PoWFaucetStatus powApi={this.powApi} faucetConfig={this.state.faucetConfig} />;
    }

    let actionButtonControl: React.ReactElement;
    let enableCaptcha = !!this.state.faucetConfig.hcapSiteKey;
    let requestCaptcha = false;

    switch(this.state.miningStatus) {
      case PoWFaucetMiningStatus.IDLE:
      case PoWFaucetMiningStatus.STARTING:
        requestCaptcha = enableCaptcha && this.state.faucetConfig.hcapSession;
        actionButtonControl = (
          <button 
            className="btn btn-success start-action" 
            onClick={(evt) => this.onStartMiningClick()} 
            disabled={this.state.miningStatus == PoWFaucetMiningStatus.STARTING}>
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
        {this.state.miningStatus !== PoWFaucetMiningStatus.IDLE && !this.state.isConnected ? 
          <div className="faucet-status-alert alert alert-danger" role="alert">
            <span>Connection to faucet server lost. Reconnecting...</span>
          </div>
        : null}
        <div className="pow-header center">
          <div className="pow-status-container">
            {this.powSession.getMiner() ? 
              <PoWMinerStatus 
                powClient={this.powClient}
                powMiner={this.powSession.getMiner()} 
                powSession={this.powSession} 
                powTime={this.powTime} 
                faucetConfig={this.state.faucetConfig} 
                stopMinerFn={(force) => this.onStopMiningClick(force)} 
                setDialog={(dialog) => this.setState({ statusDialog: dialog })}
              /> :
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
            restoreFn={(sessionInfo) => this.onRestoreSession(sessionInfo)}
            setDialog={(dialog) => this.setState({ statusDialog: dialog })}
          /> 
        : null}
        {this.state.showClaimRewardDialog ? 
          <PoWClaimDialog 
            powClient={this.powClient}
            powSession={this.powSession}
            powTime={this.powTime}
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
                variant='session'
              />
            </div>
          : null}
          <div className="faucet-actions center">
            {actionButtonControl}  
          </div>
        </div>
        <div className='faucet-description'>
          {this.state.faucetConfig.faucetHtml ?
            <div className="pow-home-container" dangerouslySetInnerHTML={{__html: this.state.faucetConfig.faucetHtml}} />
          : null}
        </div>
        <div className='faucet-notifications'>
          {this.state.notifications.map((notification) => (
            <PoWFaucetNotification 
              key={notification.id} 
              type={notification.type} 
              message={notification.message} 
              time={notification.time} 
              hideFn={() => this.hideNotification(notification.id)} 
            />
          ))}
        </div>
        <div className='faucet-footer'>
          <div className="faucet-client-version">v{FAUCET_CLIENT_VERSION}</div>
        </div>
      </div>
    );
	}

  private onStartMiningClick() {
    this.setState({
      miningStatus: PoWFaucetMiningStatus.STARTING,
      statusMessage: "Starting mining..."
    });
    if(this.miningConnKeper)
      this.miningConnKeper.close();
    this.miningConnKeper = this.powClient.newConnectionKeeper();

    this.powSession.startSession().then(() => {
      this.powSession.setMiner(new PoWMiner({
        session: this.powSession,
        workerSrc: this.props.minerSrc,
        powParams: this.state.faucetConfig.powParams,
        nonceCount: this.state.faucetConfig.powNonceCount,
        hashrateLimit: this.state.faucetConfig.powHashrateLimit,
        powTime: this.powTime,
      }));
      this.setState({
        miningStatus: PoWFaucetMiningStatus.RUNNING,
        isClaimable: false,
        statusMessage: null,
      });
    }, (err) => {
      if(this.miningConnKeper) {
        this.miningConnKeper.close();
        this.miningConnKeper = null;
      }
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

  private onRestoreSession(sessionInfo: IPoWSessionInfo): Promise<void> {
    if(this.miningConnKeper)
      this.miningConnKeper.close();
    this.miningConnKeper = this.powClient.newConnectionKeeper();

    return this.powSession.resumeSession(sessionInfo).catch((ex) => {
      if(this.miningConnKeper) {
        this.miningConnKeper.close();
        this.miningConnKeper = null;
      }
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
              Your mining balance of {toReadableAmount(sessionInfo.balance, this.state.faucetConfig.faucetCoinDecimals, this.state.faucetConfig.faucetCoinSymbol)} is too low to be claimed.<br />
              The minimum allowed amount is {toReadableAmount(this.state.faucetConfig.minClaim, this.state.faucetConfig.faucetCoinDecimals, this.state.faucetConfig.faucetCoinSymbol)}.<br />
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
      if(this.miningConnKeper) {
        this.miningConnKeper.close();
        this.miningConnKeper = null;
      }
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

  private showNotification(type: string, message: string, time?: number|boolean, timeout?: number): number {
    let notificationId = this.notificationIdCounter++;
    let notification: IPoWFaucetNotification = {
      id: notificationId,
      type: type,
      message: message,
      time: typeof time == "number" ? time : time ? (new Date()).getTime() : null,
      timeout: timeout ? (new Date()).getTime() + timeout : 0,
      timerId: timeout ? setTimeout(() => {
        notification.timerId = null;
        this.hideNotification(notification.id);
      }, timeout) : null,
    }
    if(this.notifications.length > 10) {
      this.notifications.splice(0, this.notifications.length - 10).forEach((n) => {
        if(n.timerId) {
          clearTimeout(n.timerId);
          n.timerId = null;
        }
      });
    }
    this.notifications.push(notification);
    this.setState({
      notifications: this.notifications.slice()
    })
    return notificationId;
  }

  private hideNotification(notificationId: number): void {
    let notificationIdx = -1;
    let notification: IPoWFaucetNotification;
    for(let idx = 0; idx < this.state.notifications.length; idx++) {
      if(this.notifications[idx].id === notificationId) {
        notificationIdx = idx;
        notification = this.state.notifications[idx];
        break;
      }
    }
    if(notificationIdx !== -1) {
      if(notification.timerId) {
        clearTimeout(notification.timerId);
        notification.timerId = null;
      }

      this.notifications.splice(notificationIdx, 1);
      this.setState({
        notifications: this.notifications.slice()
      });
    }
  }

}
