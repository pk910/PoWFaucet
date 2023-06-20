import { IFaucetConfig, PoWHashAlgo } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useParams, useNavigate, NavigateFunction } from "react-router-dom";
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetSession, IFaucetSessionInfo } from '../../common/FaucetSession';
import { PoWClient } from '../../pow/PoWClient';
import { TypedEmitter } from 'tiny-typed-emitter';
import { PoWSession } from '../../pow/PoWSession';
import { PoWMiner } from '../../pow/PoWMiner';
import { PoWMinerStatus } from './PoWMinerStatus';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { PassportInfo } from '../passport/PassportInfo';
import { ConnectionAlert } from './ConnectionAlert';

export interface IMiningPageProps {
  pageContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
  navigateFn: NavigateFunction;
  sessionId: string;
}

export interface IMiningPageState {
  loadedSession: boolean;
  loadingError: string;
  clientConnected: boolean;
  closingSession: boolean;
  isClaimable: boolean;
  refreshIdx: number;
}

export class MiningPage extends React.PureComponent<IMiningPageProps, IMiningPageState> {
  private eventListeners: {[key: string]: {
    emmiter: TypedEmitter;
    event: string;
    listener: Function;
    bound?: boolean;
  }} = {};
  private faucetSession: FaucetSession;
  private powClient: PoWClient;
  private powMiner: PoWMiner;
  private powSession: PoWSession;
  private connectionAlertId: number = null;

  constructor(props: IMiningPageProps, state: IMiningPageState) {
    super(props);

    this.initPoWControls();
    this.eventListeners = {
      "clientOpen": {
        emmiter: this.powClient,
        event: "open",
        listener: () => this.updateConnectionState(true),
      },
      "clientClose": {
        emmiter: this.powClient,
        event: "close",
        listener: () => this.updateConnectionState(false),
      },
      "sessionBalance": {
        emmiter: this.powSession,
        event: "balanceUpdate",
        listener: () => {
          this.setState({
            isClaimable: (this.powSession.getBalance() >= this.props.faucetConfig.minClaim),
          });
          FaucetSession.persistSessionInfo(this.faucetSession);
        },
      },
      "sessionError": {
        emmiter: this.powSession,
        event: "error",
        listener: (error) => this.processSessionError(error),
      },
      "sessionClose": {
        emmiter: this.powSession,
        event: "close",
        listener: (sessionInfo) => this.processSessionStatusRedirects(sessionInfo),
      },
    };
    
    this.state = {
      loadedSession: false,
      loadingError: null,
      clientConnected: false,
      closingSession: false,
      isClaimable: false,
      refreshIdx: 0,
		};
  }

  private initPoWControls() {
    if(!this.props.faucetConfig.modules.pow)
      return;
    
    if(this.props.pageContext.activeSession && this.props.pageContext.activeSession.getSessionId() === this.props.sessionId) {
      this.faucetSession = this.props.pageContext.activeSession;
      this.props.pageContext.activeSession = null;
    }
    else
      this.faucetSession = new FaucetSession(this.props.pageContext, this.props.sessionId);
    
    let powWsEndpoint = this.props.faucetConfig.modules.pow.powWsUrl || "/ws/pow";
    if(powWsEndpoint.match(/^\//))
      powWsEndpoint = location.origin.replace(/^http/, "ws") + powWsEndpoint;
    this.powClient = new PoWClient({
      powApiUrl: powWsEndpoint,
      sessionId: this.faucetSession.getSessionId(),
    });

    this.powSession = new PoWSession({
      client: this.powClient,
      session: this.faucetSession,
      time: this.props.pageContext.faucetApi.getFaucetTime(),
      showNotification: (type: string, message: string, time?: number|boolean, timeout?: number) => {
        return this.props.pageContext.showNotification(type, message, time, timeout);
      }
    });

    this.powMiner = new PoWMiner({
      time: this.props.pageContext.faucetApi.getFaucetTime(),
      session: this.powSession,
      hashrateLimit: this.props.faucetConfig.modules.pow.powHashrateLimit,
      nonceCount: this.props.faucetConfig.modules.pow.powNonceCount,
      powParams: this.props.faucetConfig.modules.pow.powParams,
      difficulty: this.props.faucetConfig.modules.pow.powDifficulty,
      workerSrc: {
        [PoWHashAlgo.SCRYPT]: "/js/powfaucet-worker-sc.js?" + FAUCET_CLIENT_BUILDTIME,
        [PoWHashAlgo.CRYPTONIGHT]: "/js/powfaucet-worker-cn.js?" + FAUCET_CLIENT_BUILDTIME,
        [PoWHashAlgo.ARGON2]: "/js/powfaucet-worker-a2.js?" + FAUCET_CLIENT_BUILDTIME,
      }
    });
  }

  private updateConnectionState(connected: boolean, initial?: boolean) {
    this.setState({
      clientConnected: connected
    });
    console.log("updateConnectionState", connected);
    if(connected && this.connectionAlertId !== null) {
      this.props.pageContext.hideStatusAlert(this.connectionAlertId);
      this.connectionAlertId = null;
    }
    else if(!connected && this.connectionAlertId === null) {
      let now = Math.floor((new Date()).getTime() / 1000);
      this.connectionAlertId = this.props.pageContext.showStatusAlert("error", 30, (
        <ConnectionAlert 
          faucetConfig={this.props.faucetConfig}
          initialConnection={!!initial}
          disconnectTime={now}
          timeoutCb={() => {
            FaucetSession.persistSessionInfo(null);
            this.props.navigateFn("/details/" + this.props.sessionId);
          }}
        />
      ));
    }
  }

  public componentDidMount() {
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(eventListener.bound) return;
      if(!eventListener.emmiter) return;
      eventListener.emmiter.on(eventListener.event, eventListener.listener as any);
      eventListener.bound = true;
    });
    if(!this.state.loadedSession) {
      this.faucetSession.loadSessionInfo().then((sessionInfo) => {
        if(sessionInfo.status === "running" && sessionInfo.tasks?.filter((task) => task.module === "pow").length > 0) {
          this.updateConnectionState(false, true);
          this.powClient.start();
          this.powSession.resumeSession();
          this.powMiner.startMiner();

          this.setState({
            loadedSession: true,
            isClaimable: (this.powSession.getBalance() >= this.props.faucetConfig.minClaim),
          });
          FaucetSession.persistSessionInfo(this.faucetSession);
        }
        else 
          this.processSessionStatusRedirects(sessionInfo);
      }, (err) => {
        this.setState({
          loadedSession: false,
          loadingError: err.error || err.toString(),
        });
      });
    }
  }

  public componentWillUnmount() {
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(!eventListener.bound)
        return;
      eventListener.emmiter.off(eventListener.event, eventListener.listener as any);
      eventListener.bound = false;
    });
    if(this.powClient) {
      this.powClient.stop();
    }
    if(this.powMiner) {
      this.powMiner.stopMiner();
    }
    if(this.connectionAlertId) {
      this.props.pageContext.hideStatusAlert(this.connectionAlertId);
      this.connectionAlertId = null;
    }
  }

	public render(): React.ReactElement<IMiningPageProps> {
    if(this.state.loadingError) {
      return (
        <div className='alert alert-danger'>
          Can't mine for this session: {typeof this.state.loadingError == "string" ? this.state.loadingError : ""}<br />
          See <a href={'#/details/' + this.props.sessionId}>Session Details</a>
        </div>
      );
    }
    else if(!this.state.loadedSession) {
      return (
        <div className="faucet-loading">
          <div className="loading-spinner">
            <img src="/images/spinner.gif" className="spinner" />
            <span className="spinner-text">Loading...</span>
          </div>
        </div>
      );
    }
    else if(this.state.loadingError) {
      return (
        <div className='alert alert-danger'>
          Can't mine for this session: {typeof this.state.loadingError == "string" ? this.state.loadingError : ""}<br />
          See <a href={'#/details/' + this.props.sessionId}>Session Details</a>
        </div>
      );
    }

    this.powMiner.setPoWParams(this.props.faucetConfig.modules.pow.powParams, this.props.faucetConfig.modules.pow.powDifficulty, this.props.faucetConfig.modules.pow.powNonceCount);

    return (
      <div className='page-mining'>
        <div className="pow-status-container">
          <PoWMinerStatus 
            powClient={this.powClient}
            powMiner={this.powMiner} 
            powSession={this.powSession} 
            time={this.props.pageContext.faucetApi.getFaucetTime()} 
            faucetConfig={this.props.faucetConfig} 
            passportScoreInfo={this.faucetSession.getModuleState("passport")}
            openPassportInfo={() => this.onOpenPassportClick()}
          />
        </div>
        <div className="faucet-actions center">
          <button 
            className="btn btn-danger stop-action" 
            onClick={(evt) => this.onStopMiningClick(false)} 
            disabled={!this.state.clientConnected || this.state.closingSession}>
              {this.state.isClaimable ? "Stop Mining & Claim Rewards" : "Stop Mining"}
          </button>
          </div>
      </div>
    );
	}

  private async onStopMiningClick(force?: boolean) {
    if(!this.state.isClaimable && this.powSession.getBalance() > 0n && !force) {
      this.props.pageContext.showDialog({
        title: "Mining balance too low",
        body: (
          <div className='alert alert-warning'>
            Your mining balance of {toReadableAmount(this.powSession.getBalance(), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)} is too low to be claimed.<br />
            The minimum allowed amount is {toReadableAmount(this.props.faucetConfig.minClaim, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}.<br />
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
      });
      return;
    }

    this.setState({
      closingSession: true
    });
    try {
      await this.powSession.closeSession();
    } catch(ex) {
      this.props.pageContext.showDialog({
        title: "Could not close session",
        body: (<div className='alert alert-danger'>{ex.toString()}</div>),
        closeButton: { caption: "Close" },
      });
    }
    this.setState({
      closingSession: false
    });
  }

  private async onOpenPassportClick() {
    this.props.pageContext.showDialog({
      title: "Passport Details",
      size: "lg",
      body: (
        <div className='passport-dialog'>
          <PassportInfo 
            pageContext={this.props.pageContext}
            faucetConfig={this.props.faucetConfig}
            sessionId={this.props.sessionId}
            targetAddr={this.faucetSession.getTargetAddr()}
            refreshFn={(passportScore) => {
              this.faucetSession.setModuleState("passport", passportScore);
              this.setState({
                refreshIdx: this.state.refreshIdx + 1,
              });
            }}
          />
        </div>
      ),
      closeButton: { caption: "Close" },
    });
  }

  private async processSessionError(error: any) {
    let showDialog: boolean = false;
    if(error.data?.code === "CLIENT_KILLED" || error.data?.code === "INVALID_SESSION") {
      if(error.data.message.match(/reconnected from another client/))
        showDialog = true;
    }
    else {
      showDialog = true;
    }
    if(showDialog) {
      this.powMiner.stopMiner();
      this.props.pageContext.showDialog({
        title: "Session error",
        body: (<div className='alert alert-danger'>{error.data?.code ? "[" + error.data?.code + "] " : ""} {error.data?.message}</div>),
        applyButton: { 
          caption: "View Details",
          applyFn: () => {
            this.props.navigateFn("/details/" + this.props.sessionId);
          },
        },
        closeButton: { caption: "Close" },
        closeFn: () => {
          this.props.navigateFn("/");
        }
      });
    }
  }

  private processSessionStatusRedirects(sessionInfo: IFaucetSessionInfo) {
    if(sessionInfo.status === "claimable") {
      FaucetSession.persistSessionInfo(this.faucetSession);
      this.props.navigateFn("/claim/" + sessionInfo.session);
    }
    else if(sessionInfo.status === "failed") {
      FaucetSession.persistSessionInfo(null);
      this.props.navigateFn("/details/" + sessionInfo.session);
    }
    else {
      FaucetSession.persistSessionInfo(null);
      this.props.navigateFn("/details/" + this.props.sessionId);
    }
  }

}

export default (props) => {
  let params = useParams();
  return (
    <MiningPage 
      {...props}
      pageContext={useContext(FaucetPageContext)}
      faucetConfig={useContext(FaucetConfigContext)}
      navigateFn={useNavigate()}
      sessionId={params.session}
    />
  );
};

