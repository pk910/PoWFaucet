import React from "react";
import {PoWClient} from "../../pow/PoWClient";
import {IPoWMinerStats, PoWMiner} from "../../pow/PoWMiner";
import {PoWSession} from "../../pow/PoWSession";
import {FaucetTime} from "../../common/FaucetTime";
import {IFaucetConfig} from "../../common/FaucetConfig";
import {renderTimespan} from "../../utils/DateUtils";


export interface IPoWMinerStatusProps {
  powClient: PoWClient;
  powMiner: PoWMiner;
  powSession: PoWSession;
  time: FaucetTime;
  faucetConfig: IFaucetConfig;
  powIsMining: boolean;
  balance: bigint;
  updateBalance: () => void;
  PowMinerStatusView: React.ComponentType<{
    miningSpeed: string;
    time: string;
    balance: "-" | bigint;
  }>;
}

export interface IPoWMinerStatusState {
  refreshIndex: number;
  hashRate: number;
  totalShares: number;
  startTime: number;
  lastShareTime: number;
}

export class PoWMinerStatusContainer extends React.PureComponent<
  IPoWMinerStatusProps,
  IPoWMinerStatusState
> {
  private powMinerStatsListener: ((stats: IPoWMinerStats) => void) | null =
    null;
  private powSessionUpdateListener: (() => void) | null = null;
  private updateTimer: NodeJS.Timer | null = null;
  private stoppedMiner: boolean = false;

  constructor(props: IPoWMinerStatusProps, _state: IPoWMinerStatusState) {
    super(props);

    this.state = {
      refreshIndex: 0,
      hashRate: 0,
      totalShares: this.props.powSession.getShareCount(),
      startTime: this.props.powSession.getStartTime(),
      lastShareTime: 0,
    };
  }

  public componentDidMount() {
    if (!this.powMinerStatsListener) {
      this.powMinerStatsListener = (stats: IPoWMinerStats) => {
        const stateChange: any = {
          hashRate: stats.hashRate,
          totalShares: this.props.powSession.getShareCount(),
          lastShareTime: stats.lastShareTime
            ? Math.floor(stats.lastShareTime.getTime() / 1000)
            : 0,
        };

        this.setState(stateChange);
      };
      this.props.powMiner.on("stats", this.powMinerStatsListener);
    }
    if (!this.powSessionUpdateListener) {
      this.powSessionUpdateListener = () => {
        this.props.updateBalance();
      };
      this.props.powSession.on("balanceUpdate", this.powSessionUpdateListener);
    }

    if (!this.updateTimer) {
      this.setUpdateTimer();
    }
    this.props.powSession.once("resume", () => {
      this.props.updateBalance();
    });
  }

  public componentWillUnmount() {
    if (this.powMinerStatsListener) {
      this.props.powMiner.off("stats", this.powMinerStatsListener);
      this.powMinerStatsListener = null;
    }
    if (this.powSessionUpdateListener) {
      this.props.powSession.off("balanceUpdate", this.powSessionUpdateListener);
      this.powSessionUpdateListener = null;
    }
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  public render(): React.ReactElement<IPoWMinerStatusProps> {
    const now = this.props.time.getSyncedTime();
    let sessionLifetime = 0;
    if (this.state.startTime) {
      const sessionTimeout =
        this.props.faucetConfig?.modules?.pow?.powTimeout ?? 0;
      sessionLifetime = this.state.startTime + sessionTimeout - now;
      if (sessionLifetime < 5 && !this.stoppedMiner) {
        this.stoppedMiner = true;
        void this.props.powSession.closeSession();
      }
    }

    if (
      this.props.balance >= this.props.faucetConfig.maxClaim &&
      !this.stoppedMiner
    ) {
      this.stoppedMiner = true;
      setTimeout(() => {
        this.stoppedMiner = true;
        void this.props.powSession.closeSession();
      }, 100);
    }

    const PowMinerStatusView = this.props.PowMinerStatusView;

    if (!this.props.powIsMining) {
      return (
        <PowMinerStatusView
          miningSpeed={"-"}
          time={"-"}
          balance={this.props.balance}
        />
      );
    }

    return (
      <PowMinerStatusView
        miningSpeed={`${Math.round(this.state.hashRate * 100) / 100} H/s`}
        time={renderTimespan(sessionLifetime)}
        balance={this.props.balance}
      />
    );
  }

  private setUpdateTimer() {
    const now = new Date().getTime();
    const timeLeft = 1000 - (now % 1000) + 2;
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      this.setState({
        refreshIndex: this.state.refreshIndex + 1,
      });
      this.setUpdateTimer();
    }, timeLeft);
  }
}
