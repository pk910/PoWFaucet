import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useParams, useNavigate, NavigateFunction } from "react-router";
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetSession, IFaucetSessionStatus } from '../../common/FaucetSession';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { renderDate, renderTimespan } from '../../utils/DateUtils';
import { ClaimInput } from './ClaimInput';
import { SlotOutlet } from '../../sdk/SlotOutlet';
import { emitHook, emitHookSafe } from '../../sdk/hooks';
import { Spinner, Tooltip } from 'react-bootstrap';
import { ClaimNotificationClient, IClaimNotificationUpdateData } from './ClaimNotificationClient';
import { FaucetApiError } from '../../common/FaucetApi';

import './ClaimPage.css'
import { FaucetOverlay } from '../shared/FaucetOverlay';

// Component that preserves DOM elements by only setting innerHTML once
class ResultSharingHtml extends React.Component<{ html: string }> {
  private divRef = React.createRef<HTMLDivElement>();
  private htmlSet = false;

  componentDidMount() {
    if (this.divRef.current && !this.htmlSet) {
      this.divRef.current.innerHTML = this.props.html;
      this.htmlSet = true;
    }
  }

  shouldComponentUpdate() {
    // Never update once rendered - preserves iframe and all DOM elements
    return false;
  }

  render() {
    return <div className="sh-html" ref={this.divRef} />;
  }
}

export interface IClaimPageProps {
  pageContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
  navigateFn: NavigateFunction;
  sessionId: string;
}

export interface IClaimPageState {
  sessionStatus: IFaucetSessionStatus;
  sessionDetails: {data: any, claim: any};
  loadingStatus: boolean;
  loadingError: string|boolean;
  isTimedOut: boolean;
  claimProcessing: boolean;
  refreshIndex: number;
  claimNotification: IClaimNotificationUpdateData;
  claimNotificationConnected: boolean;
}


export class ClaimPage extends React.PureComponent<IClaimPageProps, IClaimPageState> {
  private updateTimer: ReturnType<typeof setTimeout>;
  private loadingStatus: boolean;
  private isTimedOut: boolean;
  private notificationClient: ClaimNotificationClient;
  private notificationClientActive: boolean;
  /** when the last status request was started; the fallback poll measures from here */
  private lastStatusPoll: number = 0;
  /** the last status request failed: the next one comes sooner than the fallback */
  private lastPollFailed = false;
  /** the server said the claim is settled and the page has not seen a final status yet */
  private claimSettled = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private initialRetries = 0;
  private unmounted = false;

  constructor(props: IClaimPageProps) {
    super(props);

    let claimWsEndpoint: string;
    if(this.props.pageContext.faucetUrls.wsBaseUrl) 
      claimWsEndpoint = this.props.pageContext.faucetUrls.wsBaseUrl + "/claim";
    else
      claimWsEndpoint = "/ws/claim";
    if(claimWsEndpoint.match(/^\//))
      claimWsEndpoint = location.origin.replace(/^http/, "ws") + claimWsEndpoint;
    this.notificationClient = new ClaimNotificationClient({
      claimWsUrl: claimWsEndpoint,
      sessionId: this.props.sessionId,
    });
    this.notificationClient.on("update", (message) => {
      this.setState({
        claimNotification: message.data,
      });
      if(message.data?.settled)
        this.onClaimSettled();
    });
    this.notificationClient.on("error", (message) => {
      // the server ends the socket once the session is no longer claiming: the final status is there to fetch
      if(/claim settled|session not claiming/.test(message.data?.reason || ""))
        this.onClaimSettled();
    });
    this.notificationClient.on("open", () => {
      this.setState({
        claimNotificationConnected: true,
      });
    });
    this.notificationClient.on("close", () => {
      this.setState({
        claimNotificationConnected: false,
      });
    });

    this.state = {
      sessionStatus: null,
      sessionDetails: null,
      loadingStatus: false,
      loadingError: false,
      isTimedOut: false,
      claimProcessing: false,
      refreshIndex: 0,
      claimNotification: null,
      claimNotificationConnected: false,
		};
  }

  public componentDidMount() {
    this.unmounted = false;
    this.updateHeader();
    this.refreshSessionStatus();
  }

  public componentDidUpdate(prevProps: IClaimPageProps, prevState: IClaimPageState) {
    if(prevState.sessionStatus !== this.state.sessionStatus || prevState.isTimedOut !== this.state.isTimedOut)
      this.updateHeader();
    if(prevState.sessionStatus !== this.state.sessionStatus)
      this.updateNotificationClient();
  }

  /** the notification socket is open while the claim is in the queue and closed otherwise */
  private updateNotificationClient() {
    let claiming = this.state.sessionStatus?.status === "claiming";
    if(claiming && !this.notificationClientActive) {
      this.notificationClientActive = true;
      this.notificationClient.start();
    }
    else if(!claiming && this.notificationClientActive) {
      this.notificationClientActive = false;
      this.notificationClient.stop();
    }
  }

  /** the claim left the queue: ask for its final status now; the timer asks again should the answer not be final yet */
  private onClaimSettled() {
    if(this.claimSettled)
      return;
    this.claimSettled = true;
    this.refreshSessionStatus();
  }

  public componentWillUnmount() {
    this.unmounted = true;
    this.props.pageContext.setPageHeader(null);
    clearTimeout(this.retryTimer);
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    if(this.notificationClientActive) {
      this.notificationClientActive = false;
      this.notificationClient.stop();
    }
  }

  private async refreshSessionStatus() {
    if(this.loadingStatus)
      return;
    
    this.loadingStatus = true;
    this.lastStatusPoll = (new Date()).getTime();
    this.setState({
      loadingStatus: true,
    });

    try {
      let sessionStatus = await this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId, !this.state.sessionDetails);
      this.lastPollFailed = false;
      if(sessionStatus.status !== "claiming")
        this.claimSettled = false;
      if(sessionStatus.details) {
        this.setState({
          sessionDetails: sessionStatus.details,
        })
      }
      this.setState({
        loadingStatus: false,
        loadingError: false,
        sessionStatus: sessionStatus,
      }, () => {
        this.setUpdateTimer();
      });
    }
    catch(err) {
      this.lastPollFailed = true;
      if(this.state.sessionStatus) {
        // the page keeps the status it has; the timer asks again
        console.warn("[ClaimPage] session status request failed", err);
        this.setState({
          loadingStatus: false,
        });
      }
      else {
        this.setState({
          loadingStatus: false,
          loadingError: err.error?.toString() || err.toString() || true,
        });
        let transient = !(err instanceof FaucetApiError) || err.isTransient();
        if(transient && !this.unmounted && this.initialRetries < 5) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            this.refreshSessionStatus();
          }, 2000 * 2 ** this.initialRetries++);
        }
      }
    }
    this.loadingStatus = false;
  }

  /**
   * While the claim is in the queue the notification socket says when it is settled and the page
   * asks for the status once. This timer is the fallback for a socket that is down: every 30 s,
   * and every 5 s after a failed request or while a settled claim's status is not final yet.
   * Never from render: a request answered with "claiming" must not start the next one.
   */
  private pollClaimStatus() {
    if(this.state.sessionStatus?.status !== "claiming")
      return;
    let interval = (this.lastPollFailed || this.claimSettled) ? 5 * 1000 : 30 * 1000;
    if((new Date()).getTime() - this.lastStatusPoll >= interval)
      this.refreshSessionStatus();
  }

  private setUpdateTimer() {
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    let exactNow = (new Date()).getTime();

    let timeLeft = (1000 - (exactNow % 1000)) + 2;
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      this.setState({
        refreshIndex: this.state.refreshIndex + 1,
      });
      this.pollClaimStatus();
      this.setUpdateTimer();
    }, timeLeft);
  }

	public render(): React.ReactElement<IClaimPageProps> {
    let now = this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();

    if(this.state.sessionStatus) {
      let claimTimeout = (this.state.sessionStatus.start + this.props.faucetConfig.sessionTimeout) - now;
      if(claimTimeout < 0 && this.state.sessionStatus.status === "claimable" && !this.isTimedOut) {
        this.isTimedOut = true;
        this.setState({
          isTimedOut: true
        });
        
        this.props.pageContext.showDialog({
          title: "Claim expired",
          body: (
            <div className='alert alert-danger'>
              Sorry, your reward ({toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}) has not been claimed in time.
            </div>
          ),
          closeButton: {
            caption: "Close"
          },
          closeFn: () => {
            this.refreshSessionStatus();
          }
        });
      }
    }

    return (
      <div className='page-claim'>
        <SlotOutlet slot="claim.before" faucetConfig={this.props.faucetConfig}
          sessionId={this.props.sessionId} navigate={(path) => this.props.navigateFn(path)} />
        {this.renderClaim()}
        <SlotOutlet slot="claim.after" faucetConfig={this.props.faucetConfig}
          sessionId={this.props.sessionId} navigate={(path) => this.props.navigateFn(path)} />
      </div>
    )
	}

  /** the card's header while this page is on */
  private updateHeader() {
    let status = this.state.sessionStatus;
    let pill: { text: string, kind: "live" | "info" | "warn" | "crit" } = null;
    if(status && !this.state.isTimedOut) {
      switch(status.status) {
        case "claimable": pill = { text: "Claimable", kind: "warn" }; break;
        case "claiming": pill = { text: "Claiming", kind: "info" }; break;
        case "finished": pill = { text: "Confirmed", kind: "live" }; break;
        case "failed": pill = { text: "Failed", kind: "crit" }; break;
      }
    }
    this.props.pageContext.setPageHeader({
      title: status && status.status === "finished" ? "Rewards sent" : "Claim your rewards",
      meta: this.props.faucetConfig.faucetTitle + " \u00b7 session " + this.props.sessionId.substring(0, 8) + "\u2026" + this.props.sessionId.substring(this.props.sessionId.length - 4),
      pill: pill,
    });
  }

  private renderClaim(): React.ReactElement {
    if(this.state.loadingError) {
      return (
        <div className='alert alert-danger'>
          No claimable reward found: {typeof this.state.loadingError == "string" ? this.state.loadingError : ""}
        </div>
      );
    }
    else if(!this.state.sessionStatus) {
      return (
        <div className="faucet-loading">
          <div className="loading-spinner">
            <img src={(this.props.pageContext.faucetUrls.imagesUrl || "/images") + "/spinner.gif"} className="spinner" />
            <span className="spinner-text">Loading Claim...</span>
          </div>
        </div>
      );
    }
    else if(this.state.isTimedOut) {
      return (
        <div className='alert alert-danger'>
          Sorry, your reward ({toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}) has not been claimed in time.
        </div>
      );
    }
    
    let now = this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();
    let claimTimeout = (this.state.sessionStatus.start + this.props.faucetConfig.sessionTimeout) - now;
    let status = this.state.sessionStatus.status;

    return (
      <React.Fragment>
        <div className='pf-stat pf-stat-lg'>
          <span>Reward</span>
          <b>{toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}</b>
        </div>
        <div className='pf-kv-list'>
          <div className='pf-kv'>
            <span>Wallet</span>
            <b className='pf-mono'>{this.state.sessionStatus.target}</b>
          </div>
          <div className='pf-kv'>
            <span>Claim before</span>
            {status === "claimable" ?
              <b className='claim-timeout'>
                {renderDate(new Date((this.state.sessionStatus.start + this.props.faucetConfig.sessionTimeout) * 1000), true)} <span className='claim-timeout-rel'>(in {renderTimespan(claimTimeout)})</span>
              </b> :
              <b className='claim-timeout'>-</b>
            }
          </div>
        </div>
        {status === "claimable" ? this.renderClaimForm() : null}
        {status === "claiming" ? this.renderClaimStatus() : null}
        {status === "failed" ? this.renderSessionFailed() : null}
        {status === "finished" ? this.renderSessionFinished() : null}
        {status !== "claimable" ?
          <div className='faucet-actions'>
            <button
              className="btn btn-secondary action-btn"
              onClick={() => {
                this.props.navigateFn("/");
              }}>
                Return to startpage
            </button>
          </div>
        : null}
      </React.Fragment>
    );
  }

  private renderClaimForm(): React.ReactElement {
    return (
      <ClaimInput 
        faucetConfig={this.props.faucetConfig}
        submitInputs={(claimData) => this.submitClaim(claimData)}
      />
    );
  }

  private renderClaimStatus(): React.ReactElement {
    return (
      <div className='claim-status'>
        <div className='alert alert-primary spinner-alert'>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Processing...</span>
          </Spinner>
          <span className="spinner-text">The faucet is now processing your claim...</span>
          <span className="spinner-text"><br />You can close this page now. Your claim is queued and will be processed as soon as possible.</span>
          <div className="queue-info pf-kv-list">
            <div className='pf-kv'>
              <span>TX status</span>
              <b>
                {(this.state.sessionStatus.claimHash || this.state.sessionStatus.claimIdx <= this.state.claimNotification?.processedIdx) ?
                  "Sending" :
                  "Queued"
                }
              </b>
            </div>
            {this.state.sessionStatus.claimHash ?
              <div className='pf-kv'>
                <span>TX hash</span>
                <b className='txhash'>
                  {this.props.faucetConfig.ethTxExplorerLink ?
                    <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.sessionStatus.claimHash)} target='_blank' rel='noopener noreferrer'>{this.state.sessionStatus.claimHash}</a> :
                    <span>{this.state.sessionStatus.claimHash}</span>}
                </b>
              </div>
              : null
            }
            <div className='pf-kv'>
              <span>Queue position</span>
              <b>
                <FaucetOverlay
                  placement="auto"
                  overlay={
                    <Tooltip>
                      {((this.state.sessionStatus.claimIdx || 0) - (this.state.claimNotification?.processedIdx || 0) - 1)} claims will be processed before yours.
                    </Tooltip>
                  }
                >
                  <span>
                    #{(this.state.sessionStatus.claimHash || (this.state.sessionStatus.claimIdx || 0) <= (this.state.claimNotification?.processedIdx || 0)) ?
                      "0" :
                      (this.state.sessionStatus.claimIdx || 0) - (this.state.claimNotification?.processedIdx || 0)
                    }
                  </span>
                </FaucetOverlay>
              </b>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderSessionFailed(): React.ReactElement {
    return (
      <div className='claim-status'>
        <div className='alert alert-danger'>
          Claim failed: {this.state.sessionStatus.failedReason || this.state.sessionStatus.claimMessage} {this.state.sessionStatus.failedCode ? " [" + this.state.sessionStatus.failedCode + "]" : ""}
        </div>
      </div>
    )
  }

  private renderSessionFinished(): React.ReactElement {
    return (
      <div className='claim-status'>
        <div className='alert alert-success'>
          Claim Transaction has been confirmed in block #{this.state.sessionStatus.claimBlock}!<br />
          TX: 
          <span className='txhash'>
            {this.props.faucetConfig.ethTxExplorerLink ? 
              <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.sessionStatus.claimHash)} target='_blank' rel='noopener noreferrer'>{this.state.sessionStatus.claimHash}</a> :
              <span>{this.state.sessionStatus.claimHash}</span>}
          </span>
          {this.renderResultSharing()}
        </div>
      </div>
    );
  }

  private renderResultSharing(): React.ReactElement {
    let shareEls: React.ReactElement[] = [];

    if(this.props.faucetConfig.resultSharing?.twitter) {
      let tweetMsg = this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.twitter);
      let tweetUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweetMsg);
      shareEls.push(
        <span key='tw' className='sh-link sh-tw'>
          <a href='#' target='_blank' data-url={tweetUrl} rel='noopener noreferrer' onClick={function(evt) {
            let a = document.createElement('a');
            a.target = '_blank';
            a.href = tweetUrl;
            a.click();

            evt.preventDefault();
          }}><i /><span>Tweet</span></a>
        </span>
      );
    }
    if(this.props.faucetConfig.resultSharing?.mastodon) {
      let tweetMsg = this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.mastodon);

      let tweetUrl = "/share?text=" + encodeURIComponent(tweetMsg);
      shareEls.push(
        <span  key='md' className='sh-link sh-md'>
          <a href={'https://mastodon.social' + tweetUrl} target='_blank' data-url={tweetUrl} rel='noopener noreferrer' onClick={function(evt) {

            var mastodonUrl = evt.currentTarget.getAttribute("data-instance");
            if(!mastodonUrl)
              mastodonUrl = prompt("Please enter the URL of the mastodon instance you'd like to share to:", "https://mastodon.social");
            if(mastodonUrl) {
              evt.currentTarget.setAttribute("href", mastodonUrl.replace(/\/$/, "") + tweetUrl);
              evt.currentTarget.setAttribute("data-instance", mastodonUrl);
            }
            else
              evt.preventDefault();
          }}><i /><span>Post</span></a>
        </span>
      );
    }

    let resultSharingCaption = this.props.faucetConfig.resultSharing.caption || "Support this faucet with a ";
    return (
      <div className='result-sharing'>
        {this.props.faucetConfig.resultSharing.preHtml ?
          <ResultSharingHtml key="pre-html" html={this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.preHtml)} />
        : null}
        {shareEls.length > 0 ?
          <div className='sh-opt'>
            <span className='sh-label'>{resultSharingCaption}</span>
            {shareEls}
          </div>
        : null}
        {this.props.faucetConfig.resultSharing.postHtml ?
          <ResultSharingHtml key="post-html" html={this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.postHtml)} />
        : null}
      </div>
    )
  }

  private replaceShareMessagePlaceholders(message: string): string {
    message = message.replace(/{sessionid}/ig, this.state.sessionStatus.session);
    message = message.replace(/{target}/ig, this.state.sessionStatus.target);
    message = message.replace(/{token}/ig, this.props.faucetConfig.faucetCoinSymbol);

    message = message.replace(/{amount}/ig, toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals));
    let safeUrl = location.protocol + "//" + location.hostname + location.pathname;
    message = message.replace(/{url}/ig, safeUrl);

    let claimableTime = this.state.sessionDetails.data['close.time'] || this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();
    let duration = claimableTime - this.state.sessionStatus.start;
    message = message.replace(/{duration}/ig, renderTimespan(duration));

    message = message.replace(/{hashrate}/ig, () => {
      let hashrate = duration > 0 ? (this.state.sessionDetails.data['pow.lastNonce'] || 0) / duration : 0;
      return (Math.round(hashrate * 100) / 100).toString()
    });

    return message;
  }

  private async submitClaim(claimData: any): Promise<void> {
    try {
      claimData = Object.assign({
        session: this.props.sessionId
      }, claimData ||{});

      // a module may refuse the claim here with a reason, before the request leaves the page
      await emitHook("session.claim", { sessionId: this.props.sessionId, input: claimData });
      let sessionStatus = await this.props.pageContext.faucetApi.claimReward(claimData);
      if(sessionStatus.status === "failed")
        throw sessionStatus;
      emitHookSafe("session.claimed", { sessionId: this.props.sessionId, status: sessionStatus });
      
      this.lastStatusPoll = new Date().getTime();
      this.setState({
        sessionStatus: sessionStatus,
      });
      FaucetSession.persistSessionInfo(null);
    } catch(ex) {
      let errMsg: string;
      if(ex && ex.failedCode)
        errMsg = "[" + ex.failedCode + "] " + ex.failedReason;
      else
        errMsg = ex.toString();
      this.props.pageContext.showDialog({
        title: "Claim failed",
        body: (
          <div className='alert alert-danger'>
            Could not claim rewards: {errMsg}
          </div>
        ),
        closeButton: {
          caption: "Close"
        }
      });
      throw errMsg;
    }
  }

}

export default (props) => {
  let params = useParams();
  return (
    <ClaimPage 
      key={params.session}
      {...props}
      pageContext={useContext(FaucetPageContext)}
      faucetConfig={useContext(FaucetConfigContext)}
      navigateFn={useNavigate()}
      sessionId={params.session}
    />
  );
};

