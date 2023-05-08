import { IPoWClaimInfo, PoWSession } from '../common/PoWSession';
import React from 'react';
import { Button, Modal, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate, renderTimespan } from '../utils/DateUtils';
import { IPoWClientConnectionKeeper, PoWClient } from '../common/PoWClient';
import { IPoWStatusDialogProps } from './PoWStatusDialog';
import { PoWFaucetCaptcha } from './PoWFaucetCaptcha';
import { PoWTime } from 'common/PoWTime';

export interface IPoWClaimDialogProps {
  powClient: PoWClient;
  powSession: PoWSession;
  faucetConfig: IFaucetConfig;
  powTime: PoWTime;
  reward: IPoWClaimInfo;
  onClose: (clearClaim: boolean) => void;
  setDialog: (dialog: IPoWStatusDialogProps) => void;
}

enum PoWClaimStatus {
  PREPARE,
  PENDING,
  CONFIRMED,
  FAILED
}

export interface IPoWClaimDialogState {
  refreshIndex: number;
  claimStatus: PoWClaimStatus;
  queueIndex: number;
  lastQueueStatusPoll: number;
  lastProcessedIdx: number;
  claimProcessing: boolean;
  pendingTime: number;
  claimError: string;
  txHash: string;
  txBlock: number;
  txError: string;
}

export class PoWClaimDialog extends React.PureComponent<IPoWClaimDialogProps, IPoWClaimDialogState> {
  private powClientClaimTxListener: ((res: any) => void);
  private powClientOpenListener: (() => void);
  private updateTimer: NodeJS.Timeout;
  private captchaControl: PoWFaucetCaptcha;
  private isTimedOut: boolean;
  private claimConnKeeper: IPoWClientConnectionKeeper;

  constructor(props: IPoWClaimDialogProps, state: IPoWClaimDialogState) {
    super(props);
    this.isTimedOut = false;
    this.state = {
      refreshIndex: 0,
      claimStatus: PoWClaimStatus.PREPARE,
      queueIndex: 0,
      lastQueueStatusPoll: 0,
      lastProcessedIdx: 0,
      claimProcessing: false,
      pendingTime: 0,
      claimError: null,
      txHash: null,
      txBlock: 0,
      txError: null,
		};
  }

  public componentDidMount() {
    if(!this.powClientClaimTxListener) {
      this.powClientClaimTxListener = (res: any) => this.onClaimStatusChange(res);
      this.props.powClient.on("claimTx", this.powClientClaimTxListener);
    }
    if(!this.powClientOpenListener) {
      this.powClientOpenListener = () => this.onPoWClientOpen();
      this.props.powClient.on("open", this.powClientOpenListener);
    }
    if(!this.updateTimer) {
      this.setUpdateTimer();
    }
  }

  public componentWillUnmount() {
    if(this.powClientClaimTxListener) {
      this.props.powClient.off("claimTx", this.powClientClaimTxListener);
      this.powClientClaimTxListener = null;
    }
    if(this.powClientOpenListener) {
      this.props.powClient.off("open", this.powClientOpenListener);
      this.powClientOpenListener = null;
    }
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private onClaimStatusChange(res: any) {
    if(res.session !== this.props.reward.session)
      return;

    if(res.error) {
      this.setState({
        claimStatus: PoWClaimStatus.FAILED,
        txError: res.error,
      });
    }
    else {
      this.setState({
        claimStatus: PoWClaimStatus.CONFIRMED,
        txHash: res.txHash,
        txBlock: res.txBlock,
      });
    }
    if(this.claimConnKeeper) {
      this.claimConnKeeper.close();
      this.claimConnKeeper = null;
    }
  }

  private onPoWClientOpen() {
    if(this.state.claimStatus !== PoWClaimStatus.PENDING)
      return;
    this.props.powClient.sendRequest("watchClaimTx", {
      sessionId: this.props.reward.session
    }).then((res) => {
      this.setState({
        queueIndex: res.queueIdx,
      });
    },(err) => {
      this.setState({
        claimStatus: PoWClaimStatus.FAILED,
        txError: "[" + err.code + "] " + err.message,
      });
    });
  }

  private setUpdateTimer() {
    let exactNow = (new Date()).getTime();
    let now = this.props.powTime.getSyncedTime();

    let claimTimeout = (this.props.reward.startTime + this.props.faucetConfig.claimTimeout) - now;
    if(claimTimeout < 0) {
      if(!this.isTimedOut) {
        this.isTimedOut = true;
        this.props.onClose(true);
        this.props.setDialog({
          title: "Claim expired",
          body: (
            <div className='altert alert-danger'>
              Sorry, your reward ({Math.round(weiToEth(this.props.reward.balance) * 1000) / 1000} {this.props.faucetConfig.faucetCoinSymbol}) has not been claimed in time.
            </div>
          ),
          closeButton: {
            caption: "Close"
          }
        });
      }
      return;
    }

    if(this.state.claimStatus === PoWClaimStatus.PENDING && exactNow - this.state.lastQueueStatusPoll > 30 * 1000) {
      this.setState({
        lastQueueStatusPoll: exactNow,
      });
      this.pollQueueStatus();
    }

    let timeLeft = (1000 - (exactNow % 1000)) + 2;
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      this.setState({
        refreshIndex: this.state.refreshIndex + 1,
      });
      this.setUpdateTimer();
    }, timeLeft);
  }

  private pollQueueStatus() {
    this.props.powClient.sendRequest("getClaimQueueState").then((res) => {
      this.setState({
        lastProcessedIdx: res.lastIdx,
      });
    });
  }

	public render(): React.ReactElement<IPoWClaimDialogProps> {
    let now = this.props.powTime.getSyncedTime();
    let claimTimeout = (this.props.reward.startTime + this.props.faucetConfig.claimTimeout) - now;

    return (
      <Modal show centered size="lg" backdrop="static" className="pow-captcha-modal" onHide={() => {
        this.props.onClose(this.state.claimStatus !== PoWClaimStatus.PREPARE);
      }}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Claim Mining Rewards
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='container'>
            <div className='row'>
              <div className='col-3'>
                Target Address:
              </div>
              <div className='col'>
                {this.props.reward.target}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Claimable Reward:
              </div>
              <div className='col'>
                {Math.round(weiToEth(this.props.reward.balance) * 1000) / 1000} {this.props.faucetConfig.faucetCoinSymbol}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Claimable until:
              </div>
              <div className='col'>
                {renderDate(new Date((this.props.reward.startTime + this.props.faucetConfig.claimTimeout) * 1000), true)}  ({renderTimespan(claimTimeout)})
              </div>
            </div>
            {this.state.claimStatus == PoWClaimStatus.PREPARE && this.props.faucetConfig.hcapClaim ? 
            <div className='row'>
              <div className='col-3'>
                Captcha:
              </div>
              <div className='col'>
                <PoWFaucetCaptcha 
                  faucetConfig={this.props.faucetConfig} 
                  ref={(cap) => this.captchaControl = cap} 
                  variant='claim'
                  target={this.props.reward.target}
                />
              </div>
            </div>
             : null}
            {this.state.claimStatus == PoWClaimStatus.PENDING ?
              <div className='alert alert-primary spinner-alert'>
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <span className="spinner-text">The faucet is now processing your claim...</span>
                {this.state.pendingTime > 0 && (now - this.state.pendingTime) > 60 ? 
                  <span className="spinner-text"><br />This seems to take longer than usual... <br />You can close this page now. Your claim is queued and will be processed as soon as possible.</span> : 
                  null}
                {this.state.pendingTime > 0 && (now - this.state.pendingTime) > 60 ? 
                  <div className="queue-info container">
                    <div className='row'>
                      <div className='col-3'>
                        Status:
                      </div>
                      <div className='col'>
                        {this.state.queueIndex > this.state.lastProcessedIdx ? "Queued" : "Sending"}
                      </div>
                    </div>
                    <div className='row'>
                      <div className='col-3'>
                        Queue Position:
                      </div>
                      <div className='col'>
                        <OverlayTrigger
                          placement="auto"
                          overlay={
                            <Tooltip>
                              {(this.state.queueIndex - this.state.lastProcessedIdx - 1)} claims will be processed before yours.
                            </Tooltip>
                          }
                        >
                          <span>
                            #{this.state.queueIndex - this.state.lastProcessedIdx}
                          </span>
                        </OverlayTrigger>
                      </div>
                    </div>
                  </div> : 
                  null}
              </div>
             : null}
             {this.state.claimStatus == PoWClaimStatus.CONFIRMED ?
              <div className='alert alert-success'>
                Claim Transaction has been confirmed in block #{this.state.txBlock}!<br />
                TX: {this.props.faucetConfig.ethTxExplorerLink ? 
                <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.txHash)} target='_blank' rel='noopener noreferrer'>{this.state.txHash}</a> :
                <span>{this.state.txHash}</span>}
                {this.renderResultSharing()}
              </div>
             : null}
             {this.state.claimStatus == PoWClaimStatus.FAILED ?
              <div className='alert alert-danger'>
                Transaction failed: {this.state.txError}
              </div>
             : null}
          </div>
          {this.state.claimError ? 
          <div className='alert alert-danger'>
            {this.state.claimError}
          </div>
          : null}
        </Modal.Body>
        <Modal.Footer>
          {this.state.claimStatus == PoWClaimStatus.PREPARE ?
            <Button onClick={() => this.onClaimRewardClick()} disabled={this.state.claimProcessing}>Claim Rewards</Button> :
            <Button onClick={() => this.onCloseClick()}>Close</Button>}
        </Modal.Footer>
      </Modal>
    );
	}

  private renderResultSharing(): React.ReactElement<IPoWClaimDialogProps> {
    let shareEls: React.ReactElement[] = [];

    if(this.props.faucetConfig.resultSharing?.twitter) {
      let tweetMsg = this.replaceShareMessagePlaceholders(this.props.faucetConfig.resultSharing.twitter);
      let tweetUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweetMsg);
      shareEls.push(
        <span className='sh-link sh-tw'>
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
        <span className='sh-link sh-md'>
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
    message = message.replace(/{sessionid}/ig, this.props.reward.session);
    message = message.replace(/{target}/ig, this.props.reward.target);

    message = message.replace(/{amount}/ig, (Math.round(weiToEth(this.props.reward.balance) * 1000) / 1000).toString());
    let safeUrl = location.protocol + "//" + location.hostname + location.pathname;
    message = message.replace(/{url}/ig, safeUrl);

    let duration = (this.props.reward.tokenTime || (new Date()).getTime() / 1000) - this.props.reward.startTime;
    message = message.replace(/{duration}/ig, renderTimespan(duration));

    let hashrate = this.props.reward.nonce / duration;
    message = message.replace(/{hashrate}/ig, (Math.round(hashrate * 100) / 100).toString());

    return message;
  }

  private onClaimRewardClick() {
    this.setState({
      claimProcessing: true
    });
    if(this.claimConnKeeper)
      this.claimConnKeeper.close();
    this.claimConnKeeper = this.props.powClient.newConnectionKeeper();

    let capPromise: Promise<string>;
    if(this.props.faucetConfig.hcapClaim && this.captchaControl) {
      capPromise = this.captchaControl.getToken();
      capPromise.then(() => {
        this.captchaControl.resetToken();
      });
    }
    else
      capPromise = Promise.resolve(null);
    
    capPromise.then((capToken) => {
      return this.props.powClient.sendRequest("claimRewards", {
        captcha: capToken,
        token: this.props.reward.token
      });
    }).then((res) => {
      this.props.powSession.storeClaimInfo(null);
      this.setState({
        claimStatus: PoWClaimStatus.PENDING,
        queueIndex: res.queueIdx,
        pendingTime: this.props.powTime.getSyncedTime(),
      });
    }, (err) => {
      let stateChange: any = {
        claimProcessing: false
      };
      if(this.captchaControl) {
        this.captchaControl.resetToken();
      }
      if(err.code === "INVALID_CLAIM") {
        stateChange.claimStatus = PoWClaimStatus.FAILED;
        stateChange.txError = err.message;
      }
      this.setState(stateChange);

      if(this.claimConnKeeper) {
        this.claimConnKeeper.close();
        this.claimConnKeeper = null;
      }
      this.props.setDialog({
        title: "Could not claim Rewards.",
        body: (
          <div className='altert alert-danger'>
            {(err && err.message ? err.message : err)}
          </div>
        ),
        closeButton: {
          caption: "Close"
        }
      });
    });
  }

  private onCloseClick() {
    if(this.claimConnKeeper) {
      this.claimConnKeeper.close();
      this.claimConnKeeper = null;
    }
    this.props.onClose(true);
  }

}
