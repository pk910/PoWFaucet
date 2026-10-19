import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import { SlotOutlet } from '../../sdk/SlotOutlet';
import React, { useContext } from 'react';
import { Collapse } from 'react-bootstrap'
import { useParams, useNavigate, NavigateFunction } from "react-router";
import { IFaucetContext } from '../../common/FaucetContext';
import { IFaucetSessionStatus } from '../../common/FaucetSession';
import { ISessionRewardFactor } from '../../types/FaucetStatus';
import { getOperatorKey, setOperatorKey } from '../../common/OperatorKey';
import { toReadableAmount } from '../../utils/ConvertHelpers';
import { renderDate, renderTimespan } from '../../utils/DateUtils';

import './DetailsPage.css'

export interface IDetailsPageProps {
  pageContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
  navigateFn: NavigateFunction;
  sessionId: string;
}

export interface IDetailsPageState {
  sessionStatus: IFaucetSessionStatus;
  sessionDetails: {data: {[key: string]: any}, claim: any, ip?: string};
  /** the details came with the operator's key */
  unmasked: boolean;
  loadingStatus: boolean;
  loadingError: string|boolean;
  showRawJson: boolean;
}

/**
 * A session's page.
 *
 * Anyone with the session id sees what the session did: wallet, timing, reward, claim, and the
 * technical figures the faucet is willing to share. The operator's key, kept by the status page,
 * adds the block with what the faucet knows about the visitor.
 */
export class DetailsPage extends React.PureComponent<IDetailsPageProps, IDetailsPageState> {
  private updateTimer: ReturnType<typeof setTimeout>;
  private loadingStatus: boolean;
  private lastStatusPoll: number;

  constructor(props: IDetailsPageProps) {
    super(props);

    this.state = {
      sessionStatus: null,
      sessionDetails: null,
      unmasked: false,
      loadingStatus: false,
      loadingError: null,
      showRawJson: false,
		};
  }

  public componentDidMount() {
    this.updateHeader();
    if(!this.state.sessionStatus)
      this.refreshSessionStatus();
  }

  public componentDidUpdate(prevProps: IDetailsPageProps, prevState: IDetailsPageState) {
    if(prevState.sessionStatus !== this.state.sessionStatus)
      this.updateHeader();
  }

  public componentWillUnmount() {
    this.props.pageContext.setPageHeader(null);
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

    let key = getOperatorKey();
    try {
      let sessionStatus: IFaucetSessionStatus;
      try {
        sessionStatus = await this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId, true, key || undefined);
      } catch(err) {
        // a refused key answers with a plain 403, which is no json: forget it and load the public page
        if(!key)
          throw err;
        setOperatorKey(null);
        key = null;
        sessionStatus = await this.props.pageContext.faucetApi.getSessionStatus(this.props.sessionId, true);
      }
      this.lastStatusPoll = (new Date()).getTime();
      let statusDetails = sessionStatus.details;
      if(statusDetails)
        delete sessionStatus.details;
      this.setState({
        loadingStatus: false,
        loadingError: false,
        sessionStatus: sessionStatus,
        sessionDetails: statusDetails,
        unmasked: !!key && !!statusDetails && statusDetails.ip !== undefined,
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
    return (
      <div className='page-details'>
        {this.renderSession()}
        <SlotOutlet slot="details.section" faucetConfig={this.props.faucetConfig}
          sessionId={this.props.sessionId} navigate={(path) => this.props.navigateFn(path)} />
      </div>
    )
	}

  private coin(amount: bigint | number | string): string {
    return toReadableAmount(typeof amount === "string" ? BigInt(amount) : amount, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol);
  }

  /** the card's header while this page is on */
  private updateHeader() {
    let status = this.state.sessionStatus;
    let pill: { text: string, kind: "live" | "info" | "warn" | "crit" | "" } = null;
    if(status) {
      switch(status.status) {
        case "running": pill = { text: "Running", kind: "info" }; break;
        case "claimable": pill = { text: "Claimable", kind: "warn" }; break;
        case "claiming": pill = { text: "Claiming", kind: "info" }; break;
        case "finished": pill = { text: "Finished", kind: "live" }; break;
        case "failed": pill = { text: "Failed", kind: "crit" }; break;
        default: pill = { text: status.status, kind: "" };
      }
    }
    this.props.pageContext.setPageHeader({
      title: "Session details",
      meta: this.props.sessionId,
      pill: pill,
    });
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
            <img src={(this.props.pageContext.faucetUrls.imagesUrl || "/images") + "/spinner.gif"} className="spinner" />
            <span className="spinner-text">Loading Session...</span>
          </div>
        </div>
      );
    }

    let status = this.state.sessionStatus;
    let data = (this.state.sessionDetails && this.state.sessionDetails.data) || {};
    let closeTime: number = data["close.time"];
    let duration = (closeTime || this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime()) - status.start;

    let actionButton: React.ReactElement = null;
    if(status.status === "claimable") {
      actionButton = (
        <button className="btn btn-primary action-btn" onClick={() => this.props.navigateFn("/claim/" + this.props.sessionId)}>
          Claim Rewards
        </button>
      );
    }
    else if(status.status === "running" && status.tasks.filter(task => task.module === "pow").length > 0) {
      actionButton = (
        <button className="btn btn-primary action-btn" onClick={() => this.props.navigateFn("/mine/" + this.props.sessionId)}>
          Continue Mining
        </button>
      );
    }

    return (
      <React.Fragment>
        <div className='pf-kv-list'>
          <div className='pf-kv'>
            <span>Wallet</span>
            <b className='pf-mono'>{status.target}</b>
          </div>
          <div className='pf-kv'>
            <span>Started</span>
            <b>{renderDate(new Date(status.start * 1000), true)}</b>
          </div>
          {duration > 0 ?
            <div className='pf-kv'>
              <span>{closeTime ? "Mined for" : "Running for"}</span>
              <b>{renderTimespan(duration)}</b>
            </div>
          : null}
          <div className='pf-kv'>
            <span>Reward</span>
            <b>{this.coin(status.balance)}</b>
          </div>
          {status.claimStatus ? this.renderClaimRows() : null}
          {status.status === "failed" ? this.renderFailedRows() : null}
        </div>

        {this.renderTechnicalDetails(data, duration)}
        {this.state.unmasked ? this.renderOperatorDetails() : null}

        <div className='faucet-actions'>
          {actionButton}
          <button className="btn btn-secondary action-btn" onClick={() => this.props.navigateFn("/")}>
            Return to startpage
          </button>
        </div>
      </React.Fragment>
    );
  }

  private renderClaimRows(): React.ReactElement {
    let status = this.state.sessionStatus;
    return (
      <React.Fragment>
        <div className='pf-kv'>
          <span>Claim</span>
          <span className='pf-kv-value'>
            {this.renderTxStatusBadge()}
            {status.claimBlock ? <span>block {status.claimBlock}</span> : null}
          </span>
        </div>
        {status.claimHash ?
          <div className='pf-kv'>
            <span>Transaction</span>
            <b className='txhash'>
              {this.props.faucetConfig.ethTxExplorerLink ?
                <a href={this.props.faucetConfig.ethTxExplorerLink.replace("{txid}", status.claimHash)} target='_blank' rel='noopener noreferrer'>{status.claimHash}</a> :
                <span>{status.claimHash}</span>}
            </b>
          </div>
        : null}
        {status.claimStatus === "failed" && status.claimMessage ?
          <div className='pf-kv'>
            <span>Claim error</span>
            <b>{status.claimMessage}</b>
          </div>
        : null}
      </React.Fragment>
    );
  }

  private renderFailedRows(): React.ReactElement {
    let status = this.state.sessionStatus;
    return (
      <React.Fragment>
        {status.failedCode ?
          <div className='pf-kv'>
            <span>Error code</span>
            <b className='pf-mono'>{status.failedCode}</b>
          </div>
        : null}
        <div className='pf-kv'>
          <span>Error reason</span>
          <b>{status.failedReason}</b>
        </div>
      </React.Fragment>
    );
  }

  private renderTxStatusBadge(): React.ReactElement {
    switch(this.state.sessionStatus.claimStatus) {
      case "queue":
        return (<span className="pf-pill">Queued</span>);
      case "processing":
      case "pending":
        return (<span className="pf-pill pf-pill-info">Pending</span>);
      case "confirmed":
        return (<span className="pf-pill pf-pill-live">Confirmed</span>);
      case "failed":
        return (<span className="pf-pill pf-pill-crit">Failed</span>);
      default:
        return (<span className="pf-pill">{this.state.sessionStatus.claimStatus}</span>);
    }
  }

  private renderFactorPills(factors: ISessionRewardFactor[]): React.ReactElement[] {
    return factors.map((factor, idx) => (
      <span key={idx} className={"pf-pill " + (factor.factor >= 1 ? "pf-pill-info" : "pf-pill-warn")}>
        {factor.module}{factor.name ? "/" + factor.name : ""} ×{Math.round(factor.factor * 100) / 100}
      </span>
    ));
  }

  /** the figures the faucet shares with whoever has the session id */
  private renderTechnicalDetails(data: {[key: string]: any}, duration: number): React.ReactElement {
    let rows: React.ReactElement[] = [];
    if(data["cliver"])
      rows.push(<div key="cliver" className='pf-kv'><span>Client</span><b>{data["cliver"]}</b></div>);
    if(typeof data["pow.shareCount"] === "number" || typeof data["pow.lastNonce"] === "number")
      rows.push(<div key="shares" className='pf-kv'><span>Shares / last nonce</span><b>{data["pow.shareCount"] ?? "-"} / {data["pow.lastNonce"] ?? "-"}</b></div>);
    if(typeof data["pow.lastNonce"] === "number" && duration > 0)
      rows.push(<div key="hashrate" className='pf-kv'><span>Average hashrate</span><b>{Math.round(data["pow.lastNonce"] / duration * 100) / 100} H/s</b></div>);
    if(data["passport.score"])
      rows.push(<div key="passport" className='pf-kv'><span>Passport score</span><b>{data["passport.score"].score || 0} (reward factor {data["passport.score"].factor || 1})</b></div>);
    // with the key the list is the complete one, and the operator block shows that
    if(!this.state.unmasked && Array.isArray(data["reward.factors"]) && data["reward.factors"].length > 0)
      rows.push(<div key="factors" className='pf-kv'><span>Reward factors</span><span className='pf-kv-value'>{this.renderFactorPills(data["reward.factors"])}</span></div>);
    if(data["github.user"])
      rows.push(<div key="github" className='pf-kv'><span>Login</span><b>GitHub · {data["github.user"]}</b></div>);
    if(data["ticketproof.data"])
      rows.push(<div key="ticket" className='pf-kv'><span>Login</span><b>Event ticket · {data["ticketproof.data"].tier} ({data["ticketproof.data"].event})</b></div>);
    if(rows.length === 0)
      return null;
    return (
      <div className='details-section'>
        <h3>Technical details</h3>
        <div className='pf-kv-list'>{rows}</div>
      </div>
    );
  }

  /** what the faucet knows about the visitor; only on a page loaded with the operator's key */
  private renderOperatorDetails(): React.ReactElement {
    let details = this.state.sessionDetails;
    let data = details.data || {};
    let ipInfo = data["ipinfo.data"];
    let restriction = data["ipinfo.restriction.data"];
    let rows: React.ReactElement[] = [];
    rows.push(<div key="ip" className='pf-kv'><span>IP</span><b className='pf-mono'>{details.ip || "-"}</b></div>);
    if(ipInfo) {
      let where = [ipInfo.city, ipInfo.countryCode].filter((part) => !!part).join(", ");
      let flags = [ipInfo.hosting ? "hosting" : null, ipInfo.proxy ? "proxy" : null].filter((part) => !!part);
      rows.push(<div key="ipinfo" className='pf-kv'><span>IP info</span><b>{[where, ipInfo.as, ipInfo.isp].filter((part) => !!part).join(" · ")}{flags.length > 0 ? " · " + flags.join(", ") : ""}</b></div>);
    }
    if(restriction) {
      rows.push(
        <div key="restr" className='pf-kv'>
          <span>Restriction</span>
          <span className='pf-kv-value'>
            <span className={"pf-pill " + (restriction.blocked ? "pf-pill-crit" : restriction.reward < 100 ? "pf-pill-warn" : "pf-pill-live")}>{restriction.reward} %{restriction.blocked ? " · " + restriction.blocked : ""}</span>
            {(restriction.messages || []).map((message, idx) => <span key={idx}>{message.text}</span>)}
          </span>
        </div>
      );
    }
    if(Array.isArray(data["reward.factors"]) && data["reward.factors"].length > 0)
      rows.push(<div key="factors" className='pf-kv'><span>All reward factors</span><span className='pf-kv-value'>{this.renderFactorPills(data["reward.factors"])}</span></div>);
    if(data["captcha.ident"])
      rows.push(<div key="captcha" className='pf-kv'><span>Captcha ident</span><b className='pf-mono'>{data["captcha.ident"]}</b></div>);
    if(data["passport.data"])
      rows.push(<div key="passport" className='pf-kv'><span>Passport</span><b>{(data["passport.data"].stamps || []).length} stamps{data["passport.score"] ? " · score " + data["passport.score"].score : ""}</b></div>);
    if(data["github.uid"])
      rows.push(<div key="github" className='pf-kv'><span>GitHub uid</span><b className='pf-mono'>{data["github.uid"]}</b></div>);
    if(data["ticketproof.data"] && data["ticketproof.data"].identifier)
      rows.push(<div key="ticket" className='pf-kv'><span>Ticket identifier</span><b className='pf-mono'>{data["ticketproof.data"].identifier}</b></div>);
    if(data["zupass.data"] && data["zupass.data"].attendeeId)
      rows.push(<div key="zupass" className='pf-kv'><span>Zupass attendee</span><b className='pf-mono'>{data["zupass.data"].attendeeId}</b></div>);
    if(data["pow.preimage"])
      rows.push(<div key="preimage" className='pf-kv'><span>PoW preimage</span><b className='pf-mono'>{data["pow.preimage"]}</b></div>);
    if(Array.isArray(data["skip.modules"]) && data["skip.modules"].length > 0)
      rows.push(<div key="skip" className='pf-kv'><span>Skipped modules</span><b>{data["skip.modules"].join(", ")}</b></div>);

    return (
      <div className='details-section details-operator'>
        <div className='details-operator-head'>
          <h3>Operator data</h3>
          <span className='pf-pill pf-pill-info'>visible with the operator key only</span>
        </div>
        <div className='pf-kv-list'>{rows}</div>
        <div className='details-raw'>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => this.setState({ showRawJson: !this.state.showRawJson })}>
            {this.state.showRawJson ? "Hide" : "Show"} raw session JSON
          </button>
          <Collapse in={this.state.showRawJson}>
            <div>
              <pre className='session-json'>
                {JSON.stringify(Object.assign({}, this.state.sessionStatus, { details: this.state.sessionDetails }), null, 2)}
              </pre>
            </div>
          </Collapse>
        </div>
      </div>
    );
  }

}

export default (props) => {
  let params = useParams();
  return (
    <DetailsPage
      key={params.session}
      {...props}
      pageContext={useContext(FaucetPageContext)}
      faucetConfig={useContext(FaucetConfigContext)}
      navigateFn={useNavigate()}
      sessionId={params.session}
    />
  );
};
