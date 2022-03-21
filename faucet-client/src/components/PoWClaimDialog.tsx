import { IPoWMinerStats, PoWMiner } from '../common/PoWMiner';
import { PoWSession } from '../common/PoWSession';
import React from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate, renderTimespan } from '../utils/DateUtils';
import { PoWClient } from '../common/PoWClient';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { IStatusDialog } from './PoWCaptcha';

export interface IPoWClaimDialogProps {
  powClient: PoWClient;
  powSession: PoWSession;
  faucetConfig: IFaucetConfig;
  reward: IPoWClaimDialogReward;
  onClose: () => void;
  setDialog: (dialog: IStatusDialog) => void;
}

export interface IPoWClaimDialogReward {
  session: string;
  startTime: number;
  target: string;
  balance: number;
  token: string;
  claiming?: boolean;
  error?: string;
}

enum PoWClaimStatus {
  PREPARE,
  PENDING,
  CONFIRMED
}

export interface IPoWClaimDialogState {
  refreshIndex: number;
  captchaToken: string;
  claimStatus: PoWClaimStatus;
  claimProcessing: boolean;
  claimError: string;
  txHash: string;
  txBlock: number;
}

export class PoWClaimDialog extends React.PureComponent<IPoWClaimDialogProps, IPoWClaimDialogState> {
  private powSessionClaimTxListener: ((res: any) => void);
  private updateTimer: NodeJS.Timeout;

  constructor(props: IPoWClaimDialogProps, state: IPoWClaimDialogState) {
    super(props);
    this.state = {
      refreshIndex: 0,
      captchaToken: null,
      claimStatus: PoWClaimStatus.PREPARE,
      claimProcessing: false,
      claimError: null,
      txHash: null,
      txBlock: 0,
		};
  }

  public componentDidMount() {
    if(!this.powSessionClaimTxListener) {
      this.powSessionClaimTxListener = (res: any) => {
        if(res.session !== this.props.reward.session)
          return;
        this.setState({
          claimStatus: PoWClaimStatus.CONFIRMED,
          txHash: res.txHash,
          txBlock: res.txBlock,
        });
      };
      this.props.powSession.on("claimTx", this.powSessionClaimTxListener);
    }
    if(!this.updateTimer) {
      this.setUpdateTimer();
    }
  }

  public componentWillUnmount() {
    if(this.powSessionClaimTxListener) {
      this.props.powSession.off("claimTx", this.powSessionClaimTxListener);
      this.powSessionClaimTxListener = null;
    }
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private setUpdateTimer() {
    let now = (new Date()).getTime();
    let timeLeft = (1000 - (now % 1000)) + 2;
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
      <Modal show centered size="lg" backdrop="static" onHide={() => {
        this.props.onClose();
      }}>
        <Modal.Header>
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
                {Math.round(weiToEth(this.props.reward.balance) * 100) / 100} ETH
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
                <HCaptcha 
                  sitekey={this.props.faucetConfig.hcapSiteKey} 
                  onVerify={(token) => this.setState({ captchaToken: token })}
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
                TX: {this.state.txHash}
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
      captcha: this.props.faucetConfig.hcapClaim ? this.state.captchaToken : null,
      token: this.props.reward.token
    }).then(() => {
      this.setState({
        claimStatus: PoWClaimStatus.PENDING,
      });
    }, (err) => {
      this.setState({
        claimProcessing: false
      });
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
    this.props.onClose();
  }

}
