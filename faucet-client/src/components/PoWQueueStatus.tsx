import React from 'react';
import { weiToEth } from '../utils/ConvertHelpers';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { renderDate } from '../utils/DateUtils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PoWApi } from 'common/PoWApi';

export interface IPoWQueueStatusProps {
  powApi: PoWApi;
  faucetConfig: IFaucetConfig;
}

export interface IPoWQueueStatusState {
  refreshing: boolean;
  claims: IPoWQueueStatusClaim[];
}

export interface IPoWQueueStatus {
  claims: IPoWQueueStatusClaim[];
}

export interface IPoWQueueStatusClaim {
  time: number;
  session: string;
  target: string;
  amount: number;
  status: string;
  error: string;
  nonce: number | null;
  hash: string | null;
  txhex: string | null;
}

export class PoWQueueStatus extends React.PureComponent<IPoWQueueStatusProps, IPoWQueueStatusState> {

  constructor(props: IPoWQueueStatusProps, state: IPoWQueueStatusState) {
    super(props);

    this.state = {
      refreshing: false,
      claims: [],
		};
  }

  public componentDidMount() {
    if(!this.state.refreshing) {
      this.refreshQueueStatus();
    }
  }

  public componentWillUnmount() {
  }

  private refreshQueueStatus() {
    this.setState({
      refreshing: true
    });
    this.props.powApi.getQueueStatus().then((queueStatus) => {
      let activeClaims = (queueStatus.claims || []).sort((a, b) => a.time - b.time);

      this.setState({
        refreshing: false,
        claims: activeClaims,
      });
    });
  }

	public render(): React.ReactElement<IPoWQueueStatusProps> {
    let now = Math.floor((new Date()).getTime() / 1000);

    return (
      <div className='container grid faucet-status'>
        <div className='row'>
          <div className='col-md-auto'>
            <h1>PoW Faucet Queue Status</h1>
          </div>
          <div className='col'>
            <button type="button" className="btn btn-primary status-refresh" onClick={() => this.refreshQueueStatus()} disabled={this.state.refreshing}>Refresh</button>
          </div>
        </div>
        <div className='row'>
          <div className='col-12 card status-panel'>
            <div className="card-body">
              <h5 className="card-title">Claim Transaction Queue</h5>
              {this.renderActiveClaims()}
            </div>
          </div>
        </div>
      </div>
    );
	}

  private renderActiveClaims(): React.ReactElement {
    return (
      <table className="table table-striped status-sessions">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Session Hash</th>
            <th scope="col">To Address</th>
            <th scope="col">Amount</th>
            <th scope="col">Nonce</th>
            <th scope="col">TX Hash</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {this.state.claims.length > 0 ?
            this.state.claims.map((claim) => this.renderActiveClaimRow(claim)) :
            <tr key="none">
              <th scope="row" colSpan={7}>No active claims</th>
            </tr>
          }
        </tbody>
      </table>
    );
  }

  private renderActiveClaimRow(claim: IPoWQueueStatusClaim): React.ReactElement {
    let claimStatus: React.ReactElement = null;
    switch(claim.status) {
      case "queue":
        claimStatus = <span className="badge bg-secondary">Queued</span>;
        break;
      case "pending":
        claimStatus = <span className="badge bg-primary">Pending</span>;
        break;
      case "confirmed":
        claimStatus = <span className="badge bg-success">Confirmed</span>;
        break;
      case "failed":
        claimStatus = <OverlayTrigger
          placement="left"
          delay={{ show: 250, hide: 400 }}
          overlay={(props) => this.renderClaimFailInfo(claim, props)}
        >
          <span className="badge bg-danger">Failed</span>
        </OverlayTrigger>;
        break;
      default:
        claimStatus = <span className="badge bg-light text-dark">{claim.status}</span>;
    }

    return (
      <tr key={(claim.time + "-" + claim.target)}>
        <th scope="row">{renderDate(new Date(claim.time * 1000), true, true)}</th>
        <td>{claim.session}</td>
        <td>{claim.target}</td>
        <td>{Math.round(weiToEth(claim.amount) * 1000) / 1000} {this.props.faucetConfig.faucetCoinSymbol}</td>
        <td>{claim.nonce || ""}</td>
        <td>
          {this.props.faucetConfig.ethTxExplorerLink && claim.hash ? 
            <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", claim.hash)} target='_blank' rel='noopener noreferrer'>{claim.hash}</a> :
            <span>{claim.hash || ""}</span>}
          </td>
        <td>{claimStatus}</td>
      </tr>
    );
  }

  private renderClaimFailInfo(claim: IPoWQueueStatusClaim, props: any): React.ReactElement {
    if(!claim.error)
      return null;
    
    return (
      <Tooltip id="ipinfo-tooltip" {...props}>
        <div className='ipaddr-info claim-error'>
          {claim.error}
        </div>
      </Tooltip>
    );
  }

}
