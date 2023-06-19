import React from 'react';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { renderTimespan } from '../../utils/DateUtils';
import { FaucetTime } from '../../common/FaucetTime';

export interface IConnectionAlertProps {
  faucetConfig: IFaucetConfig;
  disconnectTime: number;
  initialConnection: boolean;
  timeoutCb?: () => void;
}

export interface IConnectionAlertState {
  refreshIndex: number;
}

export class ConnectionAlert extends React.PureComponent<IConnectionAlertProps, IConnectionAlertState> {
  private updateTimer: NodeJS.Timer;
  private timeoutCbCalled: boolean;

  constructor(props: IConnectionAlertProps, state: IConnectionAlertState) {
    super(props);

    this.state = {
      refreshIndex: 0,
		};
  }

  public componentDidMount() {
    if(!this.updateTimer) {
      this.setUpdateTimer();
    }
  }

  public componentWillUnmount() {
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

	public render(): React.ReactElement<IConnectionAlertProps> {
    let now = Math.floor((new Date()).getTime() / 1000);
    let timeout = this.props.faucetConfig.modules.pow.powIdleTimeout ? this.props.disconnectTime + this.props.faucetConfig.modules.pow.powIdleTimeout - now : 0;
    if(timeout < 0 && !this.timeoutCbCalled) {
      this.timeoutCbCalled = true;
      if(this.props.timeoutCb)
        this.props.timeoutCb();
    }

    let errorCaption: string;
    if(this.props.initialConnection)
      errorCaption = "Connecting to the faucet server...";
    else
      errorCaption = "Connection to faucet server has been lost. Reconnecting...";

    return (
      <div className='connection-status'>
        <div className='error-caption'>{errorCaption}</div>
        {now - this.props.disconnectTime > 10 && timeout > 0 ? (
          <div className='reconnect-info'>
            Please check your internet connection. The connection needs to be restored within the next {renderTimespan(timeout, 2)} or your session will be closed.
          </div>
        ) : null}
        {timeout < 0 ? (
          <div className='reconnect-info'>
            Connection couln't be restored in time. Session timed out.
          </div>
        ) : null}
      </div>
    );
	}


}
