import { IPoWMinerStats, PoWMiner } from '../common/PoWMiner';
import { PoWSession } from '../common/PoWSession';
import React from 'react';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate, renderTime, renderTimespan } from '../utils/DateUtils';
import { PoWClient } from 'common/PoWClient';

export interface IPoWFaucetStatusProps {
  powClient: PoWClient;
  faucetConfig: IFaucetConfig;
}

export interface IPoWFaucetStatusState {
  refreshing: boolean;
  activeSessions: IPoWFaucetStatusSession[];
  activeClaims: IPoWFaucetStatusClaim[];
}

interface IPoWFaucetStatus {
  sessions: IPoWFaucetStatusSession[];
  claims: IPoWFaucetStatusClaim[];
}

interface IPoWFaucetStatusSession {
  id: string;
  start: number;
  idle: number | null;
  target: string;
  balance: number;
  nonce: number;
  hashrate: number;
}

interface IPoWFaucetStatusClaim {

}

export class PoWFaucetStatus extends React.PureComponent<IPoWFaucetStatusProps, IPoWFaucetStatusState> {

  constructor(props: IPoWFaucetStatusProps, state: IPoWFaucetStatusState) {
    super(props);

    this.state = {
      refreshing: false,
      activeSessions: [],
      activeClaims: [],
		};
  }

  public componentDidMount() {
    if(!this.state.refreshing) {
      this.refreshFaucetStatus();
    }
  }

  public componentWillUnmount() {
  }

  private refreshFaucetStatus() {
    this.setState({
      refreshing: true
    });
    this.props.powClient.sendRequest<IPoWFaucetStatus>("getFaucetStatus").then((faucetStatus) => {
      this.setState({
        refreshing: false,
        activeSessions: faucetStatus.sessions || [],
        activeClaims: faucetStatus.claims || [],
      });
    });
  }

	public render(): React.ReactElement<IPoWFaucetStatusProps> {
    let now = Math.floor((new Date()).getTime() / 1000);

    return (
      <div className='container grid faucet-status'>
        <div className='row'>
          <div className='col-md-auto'>
            <h1>PoW Faucet Status</h1>
          </div>
          <div className='col'>
            <button type="button" className="btn btn-primary status-refresh" onClick={() => this.refreshFaucetStatus()} disabled={this.state.refreshing}>Refresh</button>
          </div>
        </div>
        <div className='row'>
          <div className='col-12 card status-panel'>
            <div className="card-body">
              <h5 className="card-title">Active mining sessions</h5>

              {this.renderActiveSessions()}
            </div>
          </div>
          <div className='col-12 card status-panel'>
            <div className="card-body">
              <h5 className="card-title">Reward claim transactions</h5>

              <p className="card-text">TODO</p>
            </div>
          </div>
        </div>
      </div>
    );
	}

  private renderActiveSessions(): React.ReactElement {
    return (
      <table className="table table-striped status-sessions">
        <thead>
          <tr>
            <th scope="col">Session</th>
            <th scope="col">Target Address</th>
            <th scope="col">Start Time</th>
            <th scope="col">Timeout</th>
            <th scope="col">Balance</th>
            <th scope="col">Nonce</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {this.state.activeSessions.length > 0 ?
            this.state.activeSessions.map((session) => this.renderActiveSessionRow(session)) :
            <tr key="none">
              <th scope="row" colSpan={7}>No active Sessions</th>
            </tr>
          }
        </tbody>
      </table>
    );
  }

  private renderActiveSessionRow(session: IPoWFaucetStatusSession): React.ReactElement {
    return (
      <tr key={session.id}>
        <th scope="row">{session.id}</th>
        <td>{session.target}</td>
        <td>{renderDate(new Date(session.start * 1000), true)}</td>
        <td>{renderDate(new Date((session.start + this.props.faucetConfig.powTimeout) * 1000), true)}</td>
        <td>{Math.round(weiToEth(session.balance) * 1000) / 1000} ETH</td>
        <td>{session.nonce}</td>
        <td>
          {session.idle ?
            <span className="badge bg-secondary">Idle ({renderTime(new Date(session.idle * 1000))})</span> :
            <span className="badge bg-success">Mining ({Math.round(session.hashrate * 100) / 100} H/s)</span>
          }
        </td>
      </tr>
    );
  }

}
