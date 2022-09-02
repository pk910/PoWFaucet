import { IPoWMinerStats, PoWMiner } from '../common/PoWMiner';
import { IPoWClaimInfo, PoWSession } from '../common/PoWSession';
import React from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate, renderTimespan } from '../utils/DateUtils';
import { PoWClient } from '../common/PoWClient';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { IPoWStatusDialogProps } from './PoWStatusDialog';
import { PoWFaucetCaptcha } from './PoWFaucetCaptcha';

export interface IPoWClaimDialogProps {
  powClient: PoWClient;
  powSession: PoWSession;
  faucetConfig: IFaucetConfig;
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
  claimProcessing: boolean;
  claimError: string;
  txHash: string;
  txBlock: number;
  txError: string;
}

export class PoWClaimDialog extends React.PureComponent<IPoWClaimDialogProps, IPoWClaimDialogState> {
  private powClientClaimTxListener: ((res: any) => void);
  private updateTimer: NodeJS.Timeout;
  private captchaControl: PoWFaucetCaptcha;
  private isTimedOut: boolean;

  constructor(props: IPoWClaimDialogProps, state: IPoWClaimDialogState) {
    super(props);
    this.isTimedOut = false;
    this.state = {
      refreshIndex: 0,
      claimStatus: PoWClaimStatus.PREPARE,
      claimProcessing: false,
      claimError: null,
      txHash: null,
      txBlock: 0,
      txError: null,
		};
  }

  public componentDidMount() {
    if(!this.powClientClaimTxListener) {
      this.powClientClaimTxListener = (res: any) => {
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
      };
      this.props.powClient.on("claimTx", this.powClientClaimTxListener);
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
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private setUpdateTimer() {
    let exactNow = (new Date()).getTime();
    let now = Math.floor(exactNow / 1000);

    let claimTimeout = (this.props.reward.startTime + this.props.faucetConfig.claimTimeout) - now;
    if(claimTimeout < 0) {
      if(!this.isTimedOut) {
        this.isTimedOut = true;
        this.props.onClose(true);
        this.props.setDialog({
          title: "Claim expired",
          body: (
            <div className='altert alert-danger'>
              Sorry, your reward ({Math.round(weiToEth(this.props.reward.balance) * 100) / 100} {this.props.faucetConfig.faucetCoinSymbol}) has not been claimed in time.
            </div>
          ),
          closeButton: {
            caption: "Close"
          }
        });
      }
      return;
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

	public render(): React.ReactElement<IPoWClaimDialogProps> {
    let now = Math.floor((new Date()).getTime() / 1000);
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
                {Math.round(weiToEth(this.props.reward.balance) * 100) / 100} {this.props.faucetConfig.faucetCoinSymbol}
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
              </div>
             : null}
             {this.state.claimStatus == PoWClaimStatus.CONFIRMED ?
              <div className='alert alert-success'>
                Claim Transaction has been confirmed in block #{this.state.txBlock}!<br />
                TX: {this.props.faucetConfig.ethTxExplorerLink ? 
                <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.txHash)} target='_blank'>{this.state.txHash}</a> :
                <span>{this.state.txHash}</span>}
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

  private onClaimRewardClick() {
    this.setState({
      claimProcessing: true
    });

    this.props.powClient.sendRequest("claimRewards", {
      captcha: this.props.faucetConfig.hcapClaim ? this.captchaControl.getToken() : null,
      token: this.props.reward.token
    }).then(() => {
      this.props.powSession.storeClaimInfo(null);
      this.setState({
        claimStatus: PoWClaimStatus.PENDING,
      });
    }, (err) => {
      let stateChange: any = {
        claimProcessing: false
      };
      if(this.captchaControl) {
        this.captchaControl.resetToken();
      }
      this.setState(stateChange);
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
    this.props.onClose(true);
  }

}
