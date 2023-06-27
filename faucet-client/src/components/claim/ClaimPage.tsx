import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useParams, useNavigate, NavigateFunction } from "react-router-dom";
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetSession, IFaucetSessionStatus } from '../../common/FaucetSession';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { renderDate, renderTimespan } from '../../utils/DateUtils';
import { ClaimInput } from './ClaimInput';
import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { ClaimNotificationClient, IClaimNotificationUpdateData } from './ClaimNotificationClient';

import './ClaimPage.css'

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
  private updateTimer: NodeJS.Timeout;
  private loadingStatus: boolean;
  private isTimedOut: boolean;
  private notificationClient: ClaimNotificationClient;
  private notificationClientActive: boolean;
  private lastStatusPoll: number;

  constructor(props: IClaimPageProps, state: IClaimPageState) {
    super(props);

    let claimWsEndpoint = "/ws/claim";
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
    if(!this.state.sessionStatus)
      this.refreshSessionStatus();
  }

  public componentWillUnmount() {
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private async refreshSessionStatus() {
    if(this.loadingStatus)
      return;
    
    this.loadingStatus = true;
    this.setState({
      loadingStatus: true,
    });

    try {
      let sessionStatus = await this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId, !this.state.sessionDetails);
      if(sessionStatus.details) {
        this.setState({
          sessionDetails: sessionStatus.details,
        })
      }
      this.setState({
        loadingStatus: false,
        sessionStatus: sessionStatus,
      }, () => {
        this.setUpdateTimer();
      });
    }
    catch(err) {
      this.setState({
        loadingStatus: false,
        loadingError: err.error?.toString() || err.toString() || true,
      });
    }
    this.loadingStatus = false;
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
      this.setUpdateTimer();
    }, timeLeft);
  }

	public render(): React.ReactElement<IClaimPageProps> {
    let exactNow = (new Date()).getTime();
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

      if(this.state.sessionStatus.status === "claiming") {
        if(!this.notificationClientActive) {
          this.notificationClientActive = true;
          this.notificationClient.start();
        }

        if(exactNow - this.lastStatusPoll > 30 * 1000 || this.state.sessionStatus.claimIdx <= (this.state.claimNotification?.confirmedIdx || 0)) {
          this.lastStatusPoll = exactNow;
          this.refreshSessionStatus();
        }
      }
      else {
        if(this.notificationClientActive) {
          this.notificationClientActive = false;
          this.notificationClient.stop();
        }
      }
    }

    return (
      <div className='page-claim'>
        <div className='container'>
          <div className='row'>
            <div className='col'>
              <h5>Claim Rewards</h5>
            </div>
          </div>
          {this.renderClaim()}
        </div>
      </div>
    )
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
            <img src="/images/spinner.gif" className="spinner" />
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

    return (
      <div>
        <div className='row'>
          <div className='col-3'>
            Wallet:
          </div>
          <div className='col'>
            {this.state.sessionStatus.target}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Amount:
          </div>
          <div className='col'>
            {toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Timeout:
          </div>
          <div className='col'>
            {this.state.sessionStatus.status === "claimable" ?
              <span className='claim-timeout'>
                {renderDate(new Date((this.state.sessionStatus.start + this.props.faucetConfig.sessionTimeout) * 1000), true)}  ({renderTimespan(claimTimeout)})
              </span> :
              <span className='claim-timeout'>
                -
              </span>
            }
          </div>
        </div>
        {this.state.sessionStatus.status === "claimable" ? this.renderClaimForm() : null}
        {this.state.sessionStatus.status === "claiming" ? this.renderClaimStatus() : null}
        {this.state.sessionStatus.status === "failed" ? this.renderSessionFailed() : null}
        {this.state.sessionStatus.status === "finished" ? this.renderSessionFinished() : null}
        {this.state.sessionStatus.status !== "claimable" ?
          <div className='row'>
            <div className='col'>
            </div>
            <div className='col-4'>
              <button 
                className="btn btn-secondary action-btn"
                onClick={() => {
                  this.props.navigateFn("/");
                }}>
                  Return to startpage
                </button>
            </div>
          </div>
        : null}
      </div>
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
          <div className="queue-info container">
            <div className='row'>
              <div className='col-3'>
                TX-Status:
              </div>
              <div className='col'>
                {(this.state.sessionStatus.claimHash || this.state.sessionStatus.claimIdx <= this.state.claimNotification?.processedIdx) ? 
                  "Sending" :
                  "Queued"
                }
              </div>
            </div>
            {this.state.sessionStatus.claimHash ? 
              <div className='row'>
                <div className='col-3'>
                  TX-Hash:
                </div>
                <div className='col'>
                  <span className='txhash'>
                    {this.props.faucetConfig.ethTxExplorerLink ? 
                      <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.sessionStatus.claimHash)} target='_blank' rel='noopener noreferrer'>{this.state.sessionStatus.claimHash}</a> :
                      <span>{this.state.sessionStatus.claimHash}</span>}
                  </span>
                </div>
              </div>
              : null
            }
            <div className='row'>
              <div className='col-3'>
                Queue Position:
              </div>
              <div className='col'>
                <OverlayTrigger
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
                </OverlayTrigger>
              </div>
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
          <div className="sh-html" dangerouslySetInnerHTML={{__html: this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.preHtml)}} />
        : null}
        {shareEls.length > 0 ? 
          <div className='sh-opt'>
            <span className='sh-label'>{resultSharingCaption}</span>
            {shareEls}
          </div>
        : null}
        {this.props.faucetConfig.resultSharing.postHtml ?
          <div className="sh-html" dangerouslySetInnerHTML={{__html: this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.postHtml)}} />
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

      let sessionStatus = await this.props.pageContext.faucetApi.claimReward(claimData);
      if(sessionStatus.status === "failed")
        throw sessionStatus;
      
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

