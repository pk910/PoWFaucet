import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { Button, Collapse } from 'react-bootstrap'
import { useParams, useNavigate, NavigateFunction } from "react-router-dom";
import { IFaucetContext } from '../../common/FaucetContext';
import { IFaucetSessionStatus } from '../../common/FaucetSession';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { renderDate } from '../../utils/DateUtils';

import './DetailsPage.css'

export interface IDetailsPageProps {
  pageContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
  navigateFn: NavigateFunction;
  sessionId: string;
}

export interface IDetailsPageState {
  sessionStatus: IFaucetSessionStatus;
  sessionDetails: {data: any, claim: any};
  loadingStatus: boolean;
  loadingError: string|boolean;
  showAllDetails: boolean;
}

export class DetailsPage extends React.PureComponent<IDetailsPageProps, IDetailsPageState> {
  private updateTimer: NodeJS.Timeout;
  private loadingStatus: boolean;
  private lastStatusPoll: number;

  constructor(props: IDetailsPageProps, state: IDetailsPageState) {
    super(props);

    this.state = {
      sessionStatus: null,
      sessionDetails: null,
      loadingStatus: false,
      loadingError: null,
      showAllDetails: false,
		};
  }

  public componentDidMount() {
    if(!this.state.sessionStatus)
      this.refreshSessionStatus();
  }

  public componentWillUnmount() {
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private async refreshSessionStatus() {
    if(this.loadingStatus)
      return;
    
    this.loadingStatus = true;
    this.setState({
      loadingStatus: true,
    });

    try {
      let sessionStatus = await this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId, true);
      this.lastStatusPoll = (new Date()).getTime();
      let statusDetails = sessionStatus.details;
      if(statusDetails)
        delete sessionStatus.details;
      this.setState({
        loadingStatus: false,
        sessionStatus: sessionStatus,
        sessionDetails: statusDetails,
      }, () => {
        this.setUpdateTimer();
      });
    }
    catch(err) {
      this.setState({
        loadingStatus: false,
        loadingError: err.error?.toString() || err.toString() || true,
      });
    }
    this.loadingStatus = false;
  }

  private setUpdateTimer() {
    if(this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    let exactNow = (new Date()).getTime();
    let now = this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();

    if(this.state.sessionStatus.status !== "finished" && this.state.sessionStatus.status !== "failed") {
      if(exactNow - this.lastStatusPoll > 30 * 1000) {
        this.lastStatusPoll = exactNow;
        this.refreshSessionStatus();
      }
    }

    let timeLeft = (1000 - (exactNow % 1000)) + 2;
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      
      this.setUpdateTimer();
    }, timeLeft);
  }

	public render(): React.ReactElement<IDetailsPageProps> {
    console.log("render DetailsPage");
    
    return (
      <div className='page-claim'>
        <div className='container'>
          <div className='row'>
            <div className='col'>
              <h5>Session Details</h5>
            </div>
          </div>
          {this.renderSession()}
        </div>
      </div>
    )
	}

  private renderSession(): React.ReactElement {
    if(this.state.loadingError) {
      return (
        <div className='alert alert-danger'>
          Could not load session details: {typeof this.state.loadingError == "string" ? this.state.loadingError : ""}
        </div>
      );
    }
    else if(!this.state.sessionStatus) {
      return (
        <div className="faucet-loading">
          <div className="loading-spinner">
            <img src="/images/spinner.gif" className="spinner" />
            <span className="spinner-text">Loading Session...</span>
          </div>
        </div>
      );
    }
    
    let now = this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();
    let claimTimeout = (this.state.sessionStatus.start + this.props.faucetConfig.sessionTimeout) - now;

    let restoreButton: React.ReactElement = null;
    if(this.state.sessionStatus.status === "claimable") {
      restoreButton = (
        <button 
          className="btn btn-primary action-btn"
          onClick={() => {
            this.props.navigateFn("/claim/" + this.props.sessionId);
          }}>
            Claim Rewards
        </button>
      );
    }
    else if(this.state.sessionStatus.status === "running" && this.state.sessionStatus.tasks.filter(task => task.module === "pow").length > 0) {
      restoreButton = (
        <button 
          className="btn btn-primary action-btn"
          onClick={() => {
            this.props.navigateFn("/mine/" + this.props.sessionId);
          }}>
            Continue Mining
        </button>
      );
    }

    return (
      <div>
        <div className='row'>
          <div className='col-3'>
            Wallet:
          </div>
          <div className='col'>
            {this.state.sessionStatus.target}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Start Time:
          </div>
          <div className='col'>
            {renderDate(new Date(this.state.sessionStatus.start * 1000), true)}
          </div>
        </div>
        <div className='row'>
          <div className='col-3'>
            Amount:
          </div>
          <div className='col'>
            {toReadableAmount(BigInt(this.state.sessionStatus.balance), this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}
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
        {this.state.sessionStatus.claimStatus ? this.renderTxStatus() : null}
        {this.state.sessionStatus.status === "failed" ? this.renderFailedSession() : null}

        <div className='row details-advanced'>
          <div className='col'>
            <a href="#" onClick={(evt) => {
              evt.preventDefault();
              this.setState({
                showAllDetails: !this.state.showAllDetails,
              })
            }}>{this.state.showAllDetails ? "hide" : "show"} session details</a>
            <Collapse in={this.state.showAllDetails}>
              <div className='session-details'>
                <pre className='session-json'>
                  {JSON.stringify(Object.assign({}, this.state.sessionStatus, this.state.sessionDetails), null, 2)}
                </pre>
              </div>
            </Collapse>
          </div>
        </div>
        
        <div className='row'>
          <div className='col'>
            {restoreButton}
          </div>
          <div className='col-4'>
            <button 
              className="btn btn-secondary action-btn"
              onClick={() => {
                this.props.navigateFn("/");
              }}>
                Return to startpage
              </button>
          </div>
        </div>
      </div>
    );
  }

  private renderSessionStatus(): React.ReactElement {
    switch(this.state.sessionStatus.status) {
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
        return (<span className="badge bg-secondary">Unknown: {this.state.sessionStatus.status}</span>);
    }
  }

  private renderFailedSession(): React.ReactElement {
    return (
      <div className='status-details'>
        {this.state.sessionStatus.failedCode ?
          <div className='row'>
            <div className='col-3'>
              Error Code:
            </div>
            <div className='col'>
              {this.state.sessionStatus.failedCode}
            </div>
          </div>
        : null}
        <div className='row'>
          <div className='col-3'>
            Error Reason:
          </div>
          <div className='col'>
            {this.state.sessionStatus.failedReason}
          </div>
        </div>
      </div>
    );
  }

  private renderTxStatus(): React.ReactElement {
    return (
      <div className='status-details'>
        <div className='row'>
          <div className='col-3'>
            TX Status:
          </div>
          <div className='col'>
            {this.renderTxStatusBadge()}
          </div>
        </div>
        {this.state.sessionStatus.claimHash ?
          <div className='row'>
            <div className='col-3'>
              TX Hash:
            </div>
            <div className='col'>
              <span className='txhash'>
                {this.props.faucetConfig.ethTxExplorerLink ? 
                  <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", this.state.sessionStatus.claimHash)} target='_blank' rel='noopener noreferrer'>{this.state.sessionStatus.claimHash}</a> :
                  <span>{this.state.sessionStatus.claimHash}</span>}
              </span>
            </div>
          </div>
        : null}
      </div>
    );
  }

  private renderTxStatusBadge(): React.ReactElement {
    switch(this.state.sessionStatus.claimStatus) {
      case "queue":
        return (<span className="badge bg-info">Queued</span>);
      case "processing":
      case "pending":
        return (<span className="badge bg-primary">Pending</span>);
      case "confirmed":
        return (<span className="badge bg-success">Confirmed</span>);
      case "failed":
        return (<span className="badge bg-danger">Failed</span>);
      default:
        return (<span className="badge bg-secondary">Unknown: {this.state.sessionStatus.claimStatus}</span>);
    }
  }

}

export default (props) => {
  let params = useParams();
  return (
    <DetailsPage 
      {...props}
      pageContext={useContext(FaucetPageContext)}
      faucetConfig={useContext(FaucetConfigContext)}
      navigateFn={useNavigate()}
      sessionId={params.session}
    />
  );
};

