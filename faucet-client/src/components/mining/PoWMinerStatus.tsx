import { IPoWMinerStats, PoWMiner } from '../../pow/PoWMiner';
import { PoWSession } from '../../pow/PoWSession';
import React from 'react';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { renderTimespan } from '../../utils/DateUtils';
import { FaucetTime } from '../../common/FaucetTime';
import { PoWClient } from '../../pow/PoWClient';
import { IPassportScoreInfo } from '../../types/PassportInfo';

export interface IPoWMinerStatusProps {
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
            <img src="/images/progress.gif" />
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

}
