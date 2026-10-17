import { IPoWMinerStats, PoWMiner } from '../../pow/PoWMiner';
import { PoWSession } from '../../pow/PoWSession';
import React from 'react';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { renderTimespan } from '../../utils/DateUtils';
import { FaucetTime } from '../../common/FaucetTime';
import { PoWClient } from '../../pow/PoWClient';
import { IPassportScoreInfo } from '../../types/PassportInfo';
import { Tooltip } from 'react-bootstrap';
import { IFaucetContext } from '../../common/FaucetContext';
import { ProgressAnimation } from './ProgressAnimation';
import { FaucetOverlay } from '../shared/FaucetOverlay';

/** the user's standing choice: "true" keeps the still picture */
const STILL_PICTURE_KEY = "powMinerDisableGif";

export interface IPoWMinerStatusProps {
  pageContext: IFaucetContext;
  sessionId: string;
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
  /** the user chose the still picture */
  disableProgressGif: boolean;
}

export class PoWMinerStatus extends React.PureComponent<IPoWMinerStatusProps, IPoWMinerStatusState> {
  private powMinerStatsListener: ((stats: IPoWMinerStats) => void);
  private powSessionUpdateListener: (() => void);
  private updateTimer: ReturnType<typeof setInterval>;
  private stoppedMiner: boolean = false;

  constructor(props: IPoWMinerStatusProps) {
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

    if(localStorage.getItem(STILL_PICTURE_KEY))
      this.setState({ disableProgressGif: true });
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

    let coin = (amount: bigint | number) => toReadableAmount(amount, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol);
    let imagesUrl = this.props.pageContext.faucetUrls.imagesUrl || "/images";

    return (
      <div className='pow-status'>
        <div className='pow-status-image'>
          <ProgressAnimation imagesUrl={imagesUrl} animated={!this.state.disableProgressGif} />
          <FaucetOverlay
            placement="bottom"
            overlay={
              <Tooltip>
                {this.state.disableProgressGif ? "Play the animation" : "Stop the animation for better performance"}
              </Tooltip>
            }
          >
            <button
              type="button"
              className="pow-progress-toggle"
              aria-label={this.state.disableProgressGif ? "Play the animation" : "Stop the animation for better performance"}
              onClick={() => this.onProgressGifToggle()}
            >
              {this.state.disableProgressGif ?
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <path d="M3 1.5v9l7-4.5z"/>
                </svg> :
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <rect x="2" y="2" width="3" height="8" rx="0.8"/><rect x="7" y="2" width="3" height="8" rx="0.8"/>
                </svg>
              }
            </button>
          </FaucetOverlay>
        </div>

        <div className='pf-stats'>
          <div className='pf-stat'>
            <span>Your mining reward</span>
            <b>{coin(this.state.balance)}</b>
          </div>
          <div className='pf-stat'>
            <span>Current hashrate</span>
            <b>{Math.round(this.state.hashRate * 100) / 100} H/s</b>
          </div>
        </div>

        <div className='pf-kv-list'>
          <div className='pf-kv'>
            <span>Target address</span>
            <b className='pf-mono'>{this.props.powSession.getTargetAddr()}</b>
          </div>
          <div className='pf-kv'>
            <span>Workers</span>
            <span className='pf-kv-value pow-worker-controls'>
              <button type="button" aria-label="Fewer workers" disabled={this.state.workerCountInput <= 1} onClick={() => this.onChangeWorkerCountButtonClick(-1)}>&minus;</button>
              <b>{this.state.workerCount} / {this.state.workerCountInput}</b>
              <button type="button" aria-label="More workers" disabled={this.state.workerCountInput >= 32} onClick={() => this.onChangeWorkerCountButtonClick(1)}>+</button>
            </span>
          </div>
          <div className='pf-kv'>
            <span>Minimum claim</span>
            <b>{coin(this.props.faucetConfig.minClaim)}</b>
          </div>
          <div className='pf-kv'>
            <span>Maximum claim</span>
            <b>{coin(this.props.faucetConfig.maxClaim)}</b>
          </div>
          <div className='pf-kv'>
            <span>Remaining session time</span>
            <b>{renderTimespan(sessionLifetime)}</b>
          </div>
          <div className='pf-kv'>
            <span>Total shares</span>
            <b>{this.state.totalShares}</b>
          </div>
          <div className='pf-kv'>
            <span>Avg. reward per hour</span>
            <b>{coin(BigInt(this.state.balance||0) * 3600n / BigInt(miningTime||1))}/h</b>
          </div>
          {this.props.faucetConfig.modules.passport ?
            <div className='pf-kv'>
              <span>Reward boost</span>
              <span className='pf-kv-value'>
                {this.props.passportScoreInfo ?
                  <b className='pow-boost-value'>+ {Math.round((this.props.passportScoreInfo.factor - 1) * 100)}%</b>
                : <b className='pow-boost-none'>+ 0%</b>}
                <button type="button" className="pow-boost-button" onClick={() => this.props.openPassportInfo()}>Boost with Passport</button>
              </span>
            </div>
          : null}
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

  /** the user's choice, remembered across sessions */
  private onProgressGifToggle() {
    if(this.state.disableProgressGif) {
      localStorage.removeItem(STILL_PICTURE_KEY);
      this.setState({ disableProgressGif: false });
    } else {
      localStorage.setItem(STILL_PICTURE_KEY, "true");
      this.setState({ disableProgressGif: true });
    }
  }

}
