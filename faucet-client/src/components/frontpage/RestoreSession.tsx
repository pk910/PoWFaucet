import React from 'react';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { IFaucetSessionStatus } from '../../common/FaucetSession';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { renderDate } from '../../utils/DateUtils';

export interface IRestoreSessionProps {
  faucetConfig: IFaucetConfig;
  sessionStatus: IFaucetSessionStatus;
}

export interface IRestoreSessionState {
}

export class RestoreSession extends React.PureComponent<IRestoreSessionProps, IRestoreSessionState> {

  constructor(props: IRestoreSessionProps, state: IRestoreSessionState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IRestoreSessionProps> {
    return (
      <div className='container'>
        <div className='row'>
          <div className='col'>
            Do you want to continue with your previous session?
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Address:
          </div>
          <div className='col'>
            {this.props.sessionStatus.target}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Start Time:
          </div>
          <div className='col'>
            {renderDate(new Date(this.props.sessionStatus.start * 1000), true)}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Balance:
          </div>
          <div className='col'>
            {toReadableAmount(BigInt(this.props.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Status:
          </div>
          <div className='col'>
            {this.renderSessionStatus()}
          </div>
        </div>
      </div>
    );
	}

  private renderSessionStatus(): React.ReactElement {
    switch(this.props.sessionStatus.status) {
      case "running":
        return (<span className="badge bg-primary">Running</span>);
      case "claimable":
        return (<span className="badge bg-warning">Claimable</span>);
      case "claiming":
        return (<span className="badge bg-info">Claiming</span>);
      case "finished":
        return (<span className="badge bg-success">Finished</span>);
      case "failed":
        return (<span className="badge bg-danger">Failed</span>);
      default:
        return (<span className="badge bg-secondary">Unknown: {this.props.sessionStatus.status}</span>);
    }
  }

}
