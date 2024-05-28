import { IPoWMinerStats, PoWMiner } from '../../pow/PoWMiner';
import { PoWSession } from '../../pow/PoWSession';
import React from 'react';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { renderTimespan } from '../../utils/DateUtils';
import { FaucetTime } from '../../common/FaucetTime';
import { PoWClient } from '../../pow/PoWClient';
import { IPassportScoreInfo } from '../../types/PassportInfo';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IFaucetContext } from '../../common/FaucetContext';

export interface IPoWMinerStatusProps {
  pageContext: IFaucetContext;
  powClient: PoWClient;
  powMiner: PoWMiner;
  powSession: PoWSession;
  time: FaucetTime;
  faucetConfig: IFaucetConfig;
  passportScoreInfo: IPassportScoreInfo;
  openPassportInfo: () => void;
}

export interface IPoWMinerStatusState {
  workerCountInput: number;
  refreshIndex: number;
  workerCount: number;
  hashRate: number;
  totalShares: number;
  balance: bigint;
  startTime: number;
  lastShareTime: number;
  showBoostInfoDialog: boolean;
  disableProgressGif: boolean;
}

export class PoWMinerStatus extends React.PureComponent<IPoWMinerStatusProps, IPoWMinerStatusState> {
  private powMinerStatsListener: ((stats: IPoWMinerStats) => void);
  private powSessionUpdateListener: (() => void);
  private updateTimer: NodeJS.Timer;
  private stoppedMiner: boolean = false;

  constructor(props: IPoWMinerStatusProps, state: IPoWMinerStatusState) {
    super(props);

    this.state = {
      workerCountInput: this.props.powMiner.getTargetWorkerCount(),
      refreshIndex: 0,
      workerCount: 0,
      hashRate: 0,
      totalShares: this.props.powSession.getShareCount(),
      balance: this.props.powSession.getBalance(),
      startTime: this.props.powSession.getStartTime(),
      lastShareTime: 0,
      showBoostInfoDialog: false,
      disableProgressGif: false,
		};
  }

  public componentDidMount() {
    if(!this.powMinerStatsListener) {
      this.powMinerStatsListener = (stats: IPoWMinerStats) => {
        let stateChange: any = {
          hashRate: stats.hashRate,
          totalShares: this.props.powSession.getShareCount(),
          lastShareTime: stats.lastShareTime ? Math.floor(stats.lastShareTime.getTime() / 1000) : 0
        };
        if(this.state.workerCountInput === 0)
          stateChange.workerCountInput = stats.workerCount;
        if(this.state.workerCount !== stats.workerCount)
          stateChange.workerCount = stats.workerCount;
        
        this.setState(stateChange);
      };
      this.props.powMiner.on("stats", this.powMinerStatsListener);
    }
    if(!this.powSessionUpdateListener) {
      this.powSessionUpdateListener = () => {
        this.setState({
          balance: this.props.powSession.getBalance(),
        });
      };
      this.props.powSession.on("balanceUpdate", this.powSessionUpdateListener);
    }

    if(!this.updateTimer) {
      this.setUpdateTimer();
    }
    this.props.powSession.once("resume", () => {
      this.setState({
        balance: this.props.powSession.getBalance(),
      });
    });

    if(localStorage.getItem("powMinerDisableGif")) {
      this.setState({
        disableProgressGif: true,
      });
    }
  }

  public componentWillUnmount() {
    if(this.powMinerStatsListener) {
      this.props.powMiner.off("stats", this.powMinerStatsListener);
      this.powMinerStatsListener = null;
    }
    if(this.powSessionUpdateListener) {
      this.props.powSession.off("balanceUpdate", this.powSessionUpdateListener);
      this.powSessionUpdateListener = null;
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

	public render(): React.ReactElement<IPoWMinerStatusProps> {
    let now = this.props.time.getSyncedTime();
    let sessionLifetime = 0;
    if(this.state.startTime) {
      let sessionTimeout = this.props.faucetConfig.modules.pow.powTimeout;
      sessionLifetime = (this.state.startTime + sessionTimeout) - now;
      if(sessionLifetime < 5 && !this.stoppedMiner) {
        this.stoppedMiner = true;
        this.props.powSession.closeSession();
      }
    }

    if(this.state.balance >= this.props.faucetConfig.maxClaim && !this.stoppedMiner) {
      this.stoppedMiner = true;
      setTimeout(() => {
        this.stoppedMiner = true;
        this.props.powSession.closeSession();
      }, 100);
    }

    let lastShareTime = this.state.lastShareTime || now;
    let miningTime = lastShareTime - this.state.startTime;

    return (
      <div className='grid pow-status'>
        <div className='row'>
          <div className='col pow-status-image'>
            <div className='pow-progress-actions'>
              <OverlayTrigger
                placement="bottom"
                container={this.props.pageContext.getContainer()}
                overlay={
                  <Tooltip>
                    Stop animation for better performance
                  </Tooltip>
                }
              >
                <a href='#' onClick={(evt) => { this.onProgressGifToggle(); evt.preventDefault(); }}>
                {this.state.disableProgressGif ?
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-play-fill" viewBox="0 0 16 16">
                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-square" viewBox="0 0 16 16">
                    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                  </svg>
                }
                </a>
              </OverlayTrigger>
            </div>

            <img src={(this.props.pageContext.faucetUrls.imagesUrl || "/images") + (this.state.disableProgressGif ? "/progress.png" : "/progress.gif")} />
          </div>
        </div>

        <div className='row pow-status-addr'>
          <div className='col-6'>
            <div className='status-title'>Target Address:</div>
          </div>
          <div className='col-12'>
            <div className='status-value'>{this.props.powSession.getTargetAddr()}</div>
          </div>
        </div>
        <div className='row pow-status-top'>
          <div className='col-6'>
            <div className='status-title'>Your Mining Reward:</div>
            <div className='status-value'>{toReadableAmount(this.state.balance, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}</div>
          </div>
          <div className='col-6'>
            <div className='status-title'>Current Hashrate:</div>
            <div className='status-value'>{Math.round(this.state.hashRate * 100) / 100} H/s</div>
          </div>
        </div>
        <div className='row pow-status-spacer'></div>
        
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Number of Workers:</div>
          </div>
          <div className='col-3'>
            <div className='status-value'>{this.state.workerCount} / {this.state.workerCountInput}</div>
          </div>
          <div className='col-3 pow-worker-controls'>
            <button type="button" className="btn btn-primary btn-sm" disabled={this.state.workerCountInput >= 32} onClick={() => this.onChangeWorkerCountButtonClick(1)}>+</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={this.state.workerCountInput <= 1} onClick={() => this.onChangeWorkerCountButtonClick(-1)}>-</button>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Minimum Claim Reward:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{toReadableAmount(this.props.faucetConfig.minClaim, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}</div>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Maximum Claim Reward:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{toReadableAmount(this.props.faucetConfig.maxClaim, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}</div>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Remaining Session Time:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{renderTimespan(sessionLifetime)}</div>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Total Shares:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{this.state.totalShares}</div>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Avg. Reward per Hour:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{toReadableAmount(BigInt(this.state.balance||0) * 3600n / BigInt(miningTime||1), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}/h</div>
          </div>
        </div>
        {this.props.faucetConfig.modules.passport ?
          <div className='row pow-status-other'>
            <div className='col-6'>
              <div className='status-title'>Reward Boost:</div>
            </div>
            <div className='col-3'>
              <div className='status-value'>
                {this.props.passportScoreInfo ? 
                  <span className='boost-value'>+ {Math.round((this.props.passportScoreInfo.factor - 1) * 100)}%</span>
                : <span className='boost-none'>+ 0%</span>}
              </div>
            </div>
            <div className='col-3 pow-passport-controls'>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => this.props.openPassportInfo()}>Boost</button>
            </div>
          </div>
        : null}
      </div>
    );
	}

  private onChangeWorkerCountButtonClick(change: number) {
    let value = this.state.workerCountInput + change;
    this.setState({
      workerCountInput: value,
    });
    this.props.powMiner.setWorkerCount(value);
  }

  private onProgressGifToggle() {
    if(this.state.disableProgressGif) {
      localStorage.removeItem("powMinerDisableGif")
      this.setState({
        disableProgressGif: false,
      });
    } else {
      localStorage.setItem("powMinerDisableGif", "true")
      this.setState({
        disableProgressGif: true,
      });
    }
  }

}
