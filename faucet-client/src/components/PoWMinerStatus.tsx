import { IPoWMinerStats, PoWMiner } from '../common/PoWMiner';
import { PoWSession } from '../common/PoWSession';
import React from 'react';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderTimespan } from '../utils/DateUtils';

export interface IPoWMinerStatusProps {
  powMiner: PoWMiner;
  powSession: PoWSession;
  faucetConfig: IFaucetConfig;
  stopMinerFn: (force: boolean) => void;
}

export interface IPoWMinerStatusState {
  workerCountInput: number;
  refreshIndex: number;
  workerCount: number;
  hashRate: number;
  totalShares: number;
  balance: number;
  startTime: number;
  lastShareTime: number;
}

export class PoWMinerStatus extends React.PureComponent<IPoWMinerStatusProps, IPoWMinerStatusState> {
  private powMinerStatsListener: ((stats: IPoWMinerStats) => void);
  private powSessionUpdateListener: (() => void);
  private updateTimer: NodeJS.Timer;
  private stoppedMiner: boolean = false;

  constructor(props: IPoWMinerStatusProps, state: IPoWMinerStatusState) {
    super(props);

    let sessionInfo = this.props.powSession.getSessionInfo();
    this.state = {
      workerCountInput: this.props.powMiner.getTargetWorkerCount(),
      refreshIndex: 0,
      workerCount: 0,
      hashRate: 0,
      totalShares: 0,
      balance: sessionInfo ? sessionInfo.balance : 0,
      startTime: sessionInfo ? sessionInfo.startTime : 0,
      lastShareTime: 0,
		};
  }

  public componentDidMount() {
    if(!this.powMinerStatsListener) {
      this.powMinerStatsListener = (stats: IPoWMinerStats) => {
        let stateChange: any = {
          hashRate: stats.hashRate,
          totalShares: stats.totalShares,
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
        let sessionInfo = this.props.powSession.getSessionInfo();
        if(!sessionInfo)
          return;
        this.setState({
          balance: sessionInfo.balance,
          startTime: sessionInfo.startTime,
        });
      };
      this.props.powSession.on("update", this.powSessionUpdateListener);
    }

    if(!this.updateTimer) {
      this.setUpdateTimer();
    }
  }

  public componentWillUnmount() {
    if(this.powMinerStatsListener) {
      this.props.powMiner.off("stats", this.powMinerStatsListener);
      this.powMinerStatsListener = null;
    }
    if(this.powSessionUpdateListener) {
      this.props.powSession.off("update", this.powSessionUpdateListener);
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
    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionLifetime = 0;
    if(this.state.startTime) {
      sessionLifetime = (this.state.startTime + this.props.faucetConfig.powTimeout) - now;
      if(sessionLifetime < 5 && !this.stoppedMiner) {
        this.stoppedMiner = true;
        setTimeout(() => {
          this.props.stopMinerFn(true);
        }, 100);
      }
    }

    if(this.state.balance >= this.props.faucetConfig.maxClaim && !this.stoppedMiner) {
      this.stoppedMiner = true;
      setTimeout(() => {
        this.props.stopMinerFn(true);
      }, 100);
    }

    let lastShareTime = this.state.lastShareTime || now;
    let miningTime = lastShareTime - this.state.startTime;

    return (
      <div className='grid pow-status'>
        <div className='row'>
          <div className='col pow-status-image'>
            <img src="/images/progress.gif" />
          </div>
        </div>

        <div className='row pow-status-top'>
          <div className='col-6'>
            <div className='status-title'>Your Mining Reward:</div>
            <div className='status-value'>{Math.round(weiToEth(this.state.balance) * 1000) / 1000} {this.props.faucetConfig.faucetCoinSymbol}</div>
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
            <div className='status-value'>{Math.round(weiToEth(this.props.faucetConfig.minClaim) * 100) / 100} {this.props.faucetConfig.faucetCoinSymbol}</div>
          </div>
        </div>
        <div className='row pow-status-other'>
          <div className='col-6'>
            <div className='status-title'>Maximum Claim Reward:</div>
          </div>
          <div className='col-6'>
            <div className='status-value'>{Math.round(weiToEth(this.props.faucetConfig.maxClaim) * 100) / 100} {this.props.faucetConfig.faucetCoinSymbol}</div>
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
            <div className='status-value'>{Math.round(weiToEth(this.state.balance / (miningTime / 3600)) * 1000) / 1000} {this.props.faucetConfig.faucetCoinSymbol}/h</div>
          </div>
        </div>

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

}
