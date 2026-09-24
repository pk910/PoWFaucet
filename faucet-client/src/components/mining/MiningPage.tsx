import { IFaucetConfig } from '../../common/FaucetConfig';
import { getPanels, IMiningPanelApi, IMiningPanelProps, IRegisteredPanel } from '../../sdk/slots';
import { SlotOutlet } from '../../sdk/SlotOutlet';
import { emitHookSafe } from '../../sdk/hooks';
import { publishSession } from '../../sdk/sdk';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useParams, useNavigate, NavigateFunction } from "react-router";
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

/** how long to wait for the faucet to resolve the module's blocking task on Leave */
const LEAVE_STATUS_RETRIES = 8;
const LEAVE_STATUS_RETRY_MS = 500;

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
  panelStarted: boolean;
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
  /**
   * The control surface a registered panel handed up.
   *
   * The page used to own the module's session itself; now a module owns it and
   * gives the page the one thing the page needs of it - the Stop button has to
   * be able to end a session it did not create.
   */
  private panelApi: IMiningPanelApi = null;
  /** the module's client config block, handed to whatever panel is registered */
  private panelConfig: unknown = null;
  private panel: IRegisteredPanel = null;
  private panelBalance: bigint = 0n;
  /**
   * Whether this session also mines, which is what decides the layout.
   *
   * It used to be `mode === "only"` - the core comparing a session state string
   * it did not define against a literal one module happened to use. What the
   * layout actually turns on is whether there is a second thing on the page, and
   * the core knows that for itself: a session with no pow task has nothing above
   * the panel, so the panel is the page.
   */
  private powTaskPresent: boolean = false;
  /** ...and whether anything else is, which is true with or without a panel to draw it */
  private moduleTaskPresent: boolean = false;
  private powActive: boolean = false;
  /** A module's session can report a leave twice (socket close and its own fallback) */
  private leaveRouted: boolean = false;

  constructor(props: IMiningPageProps) {
    super(props);

    this.initPoWControls();
    this.eventListeners = {
      "clientOpen": {
        emmiter: this.powClient,
        event: "open",
        listener: () => {
          this.props.pageContext.refreshConfig();
          this.updateConnectionState(true);
        },
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
            isClaimable: (this.powSession.getBalance() >= BigInt(this.props.faucetConfig.minClaim)),
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
      panelStarted: false,
		};
  }

  private initPoWControls() {
    if(this.props.pageContext.activeSession && this.props.pageContext.activeSession.getSessionId() === this.props.sessionId) {
      this.faucetSession = this.props.pageContext.activeSession;
      this.props.pageContext.activeSession = null;
    }
    else
      this.faucetSession = new FaucetSession(this.props.pageContext, this.props.sessionId);

    // a session with only a module panel has no pow task, so the pow stack is never built
    if(!this.props.faucetConfig.modules.pow)
      return;

    let powWsEndpoint: string;
    if(this.props.faucetConfig.modules.pow.powWsUrl)
      powWsEndpoint = this.props.faucetConfig.modules.pow.powWsUrl;
    else if(this.props.pageContext.faucetUrls.wsBaseUrl) 
      powWsEndpoint = this.props.pageContext.faucetUrls.wsBaseUrl + "/pow";
    else
      powWsEndpoint = "/ws/pow";
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
      },
      refreshConfig: () => this.props.pageContext.refreshConfig(),
    });

    this.powMiner = new PoWMiner({
      time: this.props.pageContext.faucetApi.getFaucetTime(),
      session: this.powSession,
      hashrateLimit: this.props.faucetConfig.modules.pow.powHashrateLimit,
      powParams: this.props.faucetConfig.modules.pow.powParams,
      difficulty: this.props.faucetConfig.modules.pow.powDifficulty,
      workerSrc: this.props.pageContext.faucetUrls.minerSrc,
    });
  }

  private updateConnectionState(connected: boolean, initial?: boolean) {
    this.setState({
      clientConnected: connected
    });
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
        // the session this page is on, for `PoWFaucet.session` and the modules' `session.restored` hook
        publishSession(sessionInfo);
        emitHookSafe("session.restored", { session: sessionInfo });
        let hasPowTask = sessionInfo.tasks?.filter((task) => task.module === "pow").length > 0;
        this.powTaskPresent = hasPowTask;
        // A task of somebody else's is a running session whether or not anything
        // is registered to draw it.
        //
        // Asked of the *session*, not of the registered panels, and the
        // difference is the whole point: a faucet serving a module whose client
        // failed to load - a 404 on its script, a build refused, a bundle that
        // threw - still has a player with a session, a balance and a Stop button
        // they are entitled to press. Deciding this from the slots instead left
        // that player on a page that never finished loading, which is what
        // `CoreWithoutModules` caught.
        this.moduleTaskPresent = sessionInfo.tasks?.filter((task) => task.module !== "pow").length > 0;
        let panel = this.detectPanel(sessionInfo);

        if(sessionInfo.status === "running" && (hasPowTask || this.moduleTaskPresent || panel)) {
          if(hasPowTask && this.powClient) {
            this.powActive = true;
            this.updateConnectionState(false, true);
            this.powClient.start();
            this.powSession.resumeSession();
            this.powMiner.startMiner();
          }
          if(panel)
            this.notePanel(panel.panel, panel.config);

          this.setState({
            loadedSession: true,
            clientConnected: this.powActive ? this.state.clientConnected : true,
            isClaimable: (this.getSessionBalance() >= BigInt(this.props.faucetConfig.minClaim)),
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
    publishSession(null);
    Object.keys(this.eventListeners).forEach((listenerKey) => {
      let eventListener = this.eventListeners[listenerKey];
      if(!eventListener.bound)
        return;
      eventListener.emmiter.off(eventListener.event, eventListener.listener as any);
      eventListener.bound = false;
    });
    if(this.powClient && this.powActive) {
      this.powClient.stop();
    }
    if(this.powMiner && this.powActive) {
      this.powMiner.stopMiner();
    }
    // the panel stops the session it owns when it unmounts; this only drops the handle
    this.panelApi = null;
    if(this.connectionAlertId) {
      this.props.pageContext.hideStatusAlert(this.connectionAlertId);
      this.connectionAlertId = null;
    }
  }

  /**
   * Which registered panel, if any, this session is running.
   *
   * The registered panels say which module they belong to, so the page asks the
   * session whether that module has any state and takes the first that does. It
   * used to scan the config for module names carrying a particular prefix, which
   * meant the core had to know what that kind of module was before it could
   * render one.
   *
   * A session runs at most one panel; a module records its state under its own
   * name.
   */
  private detectPanel(sessionInfo: IFaucetSessionInfo): { panel: IRegisteredPanel, config: unknown } {
    let registered = getPanels("mining");
    for(let i = 0; i < registered.length; i++) {
      let state = sessionInfo.modules ? sessionInfo.modules[registered[i].module] : null;
      if(state)
        return { panel: registered[i], config: this.props.faucetConfig.modules[registered[i].module] };
    }
    return null;
  }

  /**
   * What the page keeps of a module's session: which panel, and its config.
   *
   * Everything else - the registry lookup, the dev flags, the websocket url, the
   * session object - lives in the panel the module registers, because none of it
   * was this page's business. What is left is what the page really uses: the
   * panel's own captions, the config it hands down, and the balance, which is
   * routed through the same place the miner's is.
   */
  private notePanel(panel: IRegisteredPanel, moduleConfig: unknown) {
    this.panel = panel;
    this.panelConfig = moduleConfig;
    this.panelBalance = this.faucetSession.getDropAmount();
    this.setState({ panelStarted: true });
  }

  private onModuleBalance(balanceWei: string, reason: string) {
    emitHookSafe("session.balance", { sessionId: this.props.sessionId, balance: BigInt(balanceWei), reason: reason });
    if(this.powActive && this.powSession) {
      // route through the pow session so the miner status and the panel
      // always show the same number
      this.powSession.updateBalance({ balance: balanceWei, reason: reason });
    }
    else {
      this.panelBalance = BigInt(balanceWei);
      this.setState({
        isClaimable: (this.panelBalance >= BigInt(this.props.faucetConfig.minClaim)),
        refreshIdx: this.state.refreshIdx + 1,
      });
    }
  }

  private getSessionBalance(): bigint {
    if(this.powActive && this.powSession)
      return this.powSession.getBalance();
    return this.panelBalance;
  }

  /**
   * Routes a finished panel-only session.
   *
   * Two things make this less direct than it looks. The faucet resolves the
   * module's blocking task on its own turn, so right after the Leave the
   * session can still report as running - hence the short poll. And
   * `/getSession` only serves *running* sessions: the moment the session turns
   * claimable it answers "Session not found", so the status has to come from
   * `/getSessionStatus`, which serves finished ones too.
   */
  private onModuleLeft(attempt?: number) {
    if(this.leaveRouted)
      return;
    let tries = attempt || 0;
    this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId).then(
      (sessionStatus) => {
        if(this.leaveRouted)
          return;
        let status = sessionStatus ? sessionStatus.status : null;
        if(status === "running" && tries < LEAVE_STATUS_RETRIES) {
          setTimeout(() => this.onModuleLeft(tries + 1), LEAVE_STATUS_RETRY_MS);
          return;
        }
        this.leaveRouted = true;
        emitHookSafe("session.closed", { sessionId: this.props.sessionId, status: status });
        if(status === "claimable") {
          this.faucetSession.setStatus(status);
          FaucetSession.persistSessionInfo(this.faucetSession);
          this.props.navigateFn("/claim/" + this.props.sessionId);
          return;
        }
        FaucetSession.persistSessionInfo(null);
        this.props.navigateFn("/details/" + this.props.sessionId);
      },
      () => {
        if(this.leaveRouted)
          return;
        this.leaveRouted = true;
        this.props.navigateFn("/details/" + this.props.sessionId);
      },
    );
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
            <img src={(this.props.pageContext.faucetUrls.imagesUrl || "/images") + "/spinner.gif"} className="spinner" />
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

    if(this.powActive)
      this.powMiner.setPoWParams(this.props.faucetConfig.modules.pow.powParams, this.props.faucetConfig.modules.pow.powDifficulty);

    let panelOnly = (!!this.panel || this.moduleTaskPresent) && !this.powTaskPresent;

    return (
      <div className={'page-mining' + (panelOnly ? ' panel-only' : '')}>
        {this.powActive ?
          <div className="pow-status-container">
            <PoWMinerStatus 
              pageContext={this.props.pageContext}
              powClient={this.powClient}
              powMiner={this.powMiner} 
              powSession={this.powSession} 
              time={this.props.pageContext.faucetApi.getFaucetTime()} 
              faucetConfig={this.props.faucetConfig} 
              passportScoreInfo={this.faucetSession.getModuleState("passport")}
              openPassportInfo={() => this.onOpenPassportClick()}
            />
          </div>
        : null}
        {this.renderPanels(panelOnly)}
        <SlotOutlet slot="mining.status" faucetConfig={this.props.faucetConfig}
          sessionId={this.props.sessionId} navigate={(path) => this.props.navigateFn(path)} />
        <div className="faucet-actions center">
          <button 
            className="btn btn-danger stop-action" 
            onClick={(evt) => this.onStopMiningClick(false)} 
            disabled={!this.state.clientConnected || this.state.closingSession}>
              {this.stopButtonCaption(panelOnly)}
          </button>
          </div>
      </div>
    );
	}

  /**
   * Whatever a module put in the mining slot, where the first panel used to be
   * hard-wired.
   *
   * None registered - a build with no modules, or a faucet that offers none - and
   * this renders nothing at all, which is the page as it was before any module
   * existed. The props are the ones the first panel was given, plus the two a
   * panel needs because it owns the session: the module's config and a way to
   * hand its Stop back up.
   */
  private renderPanels(panelOnly: boolean): React.ReactNode {
    if(!this.state.panelStarted || !this.panel)
      return null;
    // The panel this session is running, not every panel registered: the page
    // resolved which module was running at load, and rendering the others would
    // mount a module the session has no state for.
    let Panel = this.panel.component;
    let props: IMiningPanelProps = {
      sessionId: this.props.sessionId,
      moduleState: this.faucetSession ? this.faucetSession.getModuleState(this.panel.module) : null,
      moduleName: this.panel.module,
      moduleConfig: this.panelConfig,
      faucetConfig: this.props.faucetConfig,
      wsBaseUrl: this.props.pageContext.faucetUrls.wsBaseUrl || null,
      collapsible: !panelOnly,
      getBalance: () => this.getSessionBalance(),
      onBalance: (balanceWei, reason) => this.onModuleBalance(balanceWei, reason),
      setMinerThrottle: (fraction) => {
        if(this.powActive && this.powMiner)
          this.powMiner.setThrottle(fraction);
      },
      onLeave: () => this.onModuleLeft(),
      onPanelReady: (api) => { this.panelApi = api; },
    };
    return <Panel {...props} />;
  }

  /**
   * The button that ends the session, in the words of whatever is running.
   *
   * When the panel is the whole page the words are the panel's - it said them
   * when it registered - and the core adds only the claim. The fallback is the
   * core's own, because mining is the core's own.
   */
  private stopButtonCaption(panelOnly: boolean): string {
    if(panelOnly) {
      let stop = this.panelCaptions().stop;
      return this.state.isClaimable ? stop + " & Claim Rewards" : stop;
    }
    return this.state.isClaimable ? "Stop Mining & Claim Rewards" : "Stop Mining";
  }

  /**
   * What the running panel asked to be called, or a neutral fallback.
   *
   * A panel that registered without captions still has to be described by two
   * buttons and a heading, and the core has nothing true to say about what it
   * does - so it says the only thing it knows, which is that there is a session.
   */
  private panelCaptions(): { balance: string; resume: string; stop: string } {
    let said = this.panel && this.panel.captions;
    return {
      balance: said && said.balance ? said.balance : "Session",
      resume: said && said.resume ? said.resume : "Continue",
      stop: said && said.stop ? said.stop : "Stop",
    };
  }

  private async onStopMiningClick(force?: boolean) {
    let panelOnly = (!!this.panel || this.moduleTaskPresent) && !this.powTaskPresent;
    if(!this.state.isClaimable && this.getSessionBalance() > 0n && !force) {
      this.props.pageContext.showDialog({
        title: (panelOnly ? this.panelCaptions().balance : "Mining") + " balance too low",
        body: (
          <div className='alert alert-warning'>
            Your balance of {toReadableAmount(this.getSessionBalance(), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)} is too low to be claimed.<br />
            The minimum allowed amount is {toReadableAmount(this.props.faucetConfig.minClaim, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}.<br />
            Do you want to stop and loose the rewards you've already collected?
            </div>
        ),
        closeButton: {
          caption: panelOnly ? this.panelCaptions().resume : "Continue mining",
        },
        applyButton: {
          caption: panelOnly ? this.panelCaptions().stop : "Stop mining",
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
      if(this.powActive) {
        await this.powSession.closeSession();
        emitHookSafe("session.closed", { sessionId: this.props.sessionId, status: "closed" });
      }
      else if(this.panelApi) {
        // a panel-only session ends by resolving its blocking task, which an
        // explicit Leave does; the leave handler then routes to the claim page
        this.panelApi.leave();
        return;
      }
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
      showDialog = true;
    }
    if(showDialog) {
      this.powClient.stop();
      this.powMiner.stopMiner();
      let viewDetailsClicked = false;
      this.props.pageContext.showDialog({
        title: "Session error",
        body: (<div className='alert alert-danger'>{error.data?.code ? "[" + error.data?.code + "] " : ""} {error.data?.message}</div>),
        applyButton: { 
          caption: "View Details",
          applyFn: () => {
            viewDetailsClicked = true;
            this.props.navigateFn("/details/" + this.props.sessionId);
          },
        },
        closeButton: { caption: "Close" },
        closeFn: () => {
          if(viewDetailsClicked)
            return;
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

