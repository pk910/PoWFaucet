import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { IFaucetContext } from '../../common/FaucetContext';
import { IPassportInfo, IPassportScoreInfo } from '../../types/PassportInfo';

import "./PassportInfo.css";

export interface IPassportInfoProps {
  targetAddr: string;
  sessionId: string;
  faucetConfig: IFaucetConfig;
  pageContext: IFaucetContext;
  refreshFn: (score: IPassportScoreInfo) => void;
}

export interface IPassportInfoState {
  loadingPassport: boolean;
  loadingError: string;
  passportInfo: IPassportInfo;
  refreshCooldown: number;
  refreshCooldownSec: number;
  refreshProcessing: boolean;
  refreshError: boolean;
  refreshStatus: string;
  showRefreshForm: boolean;
  passportJson: string;
  manualRefreshRunning: boolean;
}

export class PassportInfo extends React.PureComponent<IPassportInfoProps, IPassportInfoState> {
  private loadingPassport: boolean;

  constructor(props: IPassportInfoProps, state: IPassportInfoState) {
    super(props);

    this.state = {
      loadingPassport: false,
      loadingError: null,
      passportInfo: null,
      refreshCooldown: 0,
      refreshCooldownSec: 0,
      refreshProcessing: false,
      refreshError: false,
      refreshStatus: null,
      showRefreshForm: false,
      passportJson: "",
      manualRefreshRunning: false,
    };
  }

  public componentDidMount() {
    if(!this.state.passportInfo)
      this.refreshPassportInfo();
  }

  private async refreshPassportInfo() {
    if(this.loadingPassport)
      return;
    
    this.loadingPassport = true;
    this.setState({
      loadingPassport: true,
    });

    try {
      let passportInfo = await this.props.pageContext.faucetApi.getPassportInfo(this.props.sessionId);
      this.setState({
        loadingPassport: false,
        passportInfo: passportInfo,
      });
    }
    catch(err) {
      this.setState({
        loadingPassport: false,
        loadingError: err.error?.toString() || err.toString() || true,
      });
    }
    this.loadingPassport = false;
  }

	public render(): React.ReactElement<IPassportInfoProps> {
    if(!this.props.faucetConfig.modules['passport']) {
      return (
        <div className='alert alert-danger'>
          Passport verification is not enabled.
        </div>
      );
    }
    else if(this.state.loadingError) {
      return (
        <div className='alert alert-danger'>
          Could not load session details: {typeof this.state.loadingError == "string" ? this.state.loadingError : ""}
        </div>
      );
    }
    else if(!this.state.passportInfo) {
      return (
        <div className="faucet-loading">
          <div className="loading-spinner">
            <img src="/images/spinner.gif" className="spinner" />
            <span className="spinner-text">Loading passport details...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="pow-boost-info">
        <div className="boost-descr">Increase your passport score by verifying stamps on your <a href="https://passport.gitcoin.co/#/dashboard" target="_blank">Gitcoin Passport</a>.</div>
        <div className="boost-passport">
          <div className="passport-summary container">
            <div className="row">
              <div className="col-12 col-lg-4">
                Passport Address:
              </div>
              <div className="col-12 col-lg-8 summary-val">
                {this.props.targetAddr}
              </div>
            </div>
            <div className="row">
              <div className="col-12 col-lg-4">
                Passport Score:
              </div>
              <div className="col-12 col-lg-8 summary-val">
                <span className="passport-score">{this.state.passportInfo.score.score || 0}</span>
                {this.props.faucetConfig.modules["passport"].boostFactor ?
                  <span className="passport-factor">
                    (Reward Factor: {this.state.passportInfo.score.factor || 1} 
                    <OverlayTrigger
                      placement="bottom"
                      overlay={
                        <Tooltip>
                          {this.renderFactorInfo()}
                        </Tooltip>
                      }
                    >
                      <div className="passport-factor-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle" viewBox="0 0 16 16">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                          <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                        </svg>
                      </div>
                    </OverlayTrigger>
                    )
                  </span>
                : null}
              </div>
            </div>
            <div className="row passport-refresh">
              <div className={[
                "refresh-auto",
                "col-12",
                this.props.faucetConfig.modules['passport']?.manualVerification ? "col-lg-8" : "col-lg-12"
                ].join(" ")}>
                <button 
                  className="btn btn-primary" 
                  onClick={(evt) => this.onRefreshPassportClick()} 
                  disabled={this.state.refreshCooldownSec > 0 || this.state.refreshProcessing || this.state.manualRefreshRunning}
                  >
                    Refresh Passport Automatically{this.state.refreshCooldownSec > 0 ? " (" + this.state.refreshCooldownSec + ")" : ""}
                </button>
              </div>
              {this.props.faucetConfig.modules["passport"].manualVerification ?
                <div className="col-12 col-lg-4 refresh-manual">
                  <span className="refresh-btndv">or</span>
                  <button 
                    className="btn btn-secondary" 
                    onClick={(evt) => this.onManualRefreshPassportClick()} 
                    disabled={this.state.showRefreshForm}
                    >
                      Verify Manually
                  </button>
                </div>
              : null}
            </div>
            {this.state.refreshStatus ?
              <div className="row passport-refresh-status">
                <div className="col-12">
                  <div className={["alert", this.state.refreshError ? "alert-danger" : "alert-success"].join(" ")} role="alert">
                    {this.state.refreshStatus}
                  </div>
                </div>
              </div>
            : null}

          </div>
          
          {this.state.showRefreshForm ?
            this.renderPassportRefreshForm() :
            this.renderPassportDetails()
          }
        </div>
      </div>
    );
	}

  private renderFactorInfo(): React.ReactElement {
    return (
      <div className="passport-factor-info container">
        <div className="row header-row">
          <div className="col-6">
            Min Score
          </div>
          <div className="col-6">
            Reward Factor
          </div>
        </div>
        {Object.keys(this.props.faucetConfig.modules["passport"].boostFactor).map((score) => {
          let factor = this.props.faucetConfig.modules["passport"].boostFactor[score];
          return (
            <div key={"score-" + score} className="row score-row">
              <div className="col-6">
                {score}
              </div>
              <div className="col-6">
                {factor}
              </div>
            </div>
          );
        })}
      </div>
    )
  }

  private renderPassportDetails(): React.ReactElement {
    let now = this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();
    let stamps = this.state.passportInfo.passport.stamps || [];
    return (
      <div className="passport-details container">
        <div className="row details-header">
          <div className="col">
            Passport Score Details:
          </div>
        </div>
        {stamps.map((stamp) => {
          return (
            <div key={"stamp-" + stamp.provider} className="row passport-stamp">
              <div className="col-8">
                {stamp.provider}
              </div>
              <div className="col-4">
                {stamp.expiration > now && !stamp.duplicate ?
                  <span>+ {this.props.faucetConfig.modules["passport"].stampScoring[stamp.provider]}</span>
                  : null}
                {stamp.expiration <= now ?
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip>
                        This stamp has been expired. Please refresh it on passport.gitcoin.co
                      </Tooltip>
                    }
                  >
                    <span key="status" className="badge bg-danger">Expired</span>
                  </OverlayTrigger>
                  : null}
                {stamp.duplicate ?
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip>
                        This stamp has already been used in the passport for {stamp.duplicate}
                      </Tooltip>
                    }
                  >
                    <span key="status" className="badge bg-danger">Reused</span>
                  </OverlayTrigger>
                  : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  private renderPassportRefreshForm(): React.ReactElement {
    return (
      <div className="passport-manual-refresh container">
        <div className="row form-header">
          <div className="col">
            Upload Gitcoin Passport JSON for verification:
          </div>
        </div>
        <div className="row">
          <div className="col">
            <textarea 
              className="passport-json"
              value={this.state.passportJson} 
              placeholder="Please paste your Gitcoin Passport JSON here"
              onChange={(evt) => this.setState({ passportJson: evt.target.value })} 
              disabled={this.state.manualRefreshRunning}
            >
            </textarea>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <button 
              className="btn btn-primary passport-json-submit" 
              onClick={(evt) => this.onUploadPassportJsonClick()} 
              disabled={this.state.manualRefreshRunning || this.state.passportJson.length < 100}
              >
                Upload &amp; Verify passport JSON
            </button>
          </div>
        </div>
      </div>
    )
  }

  private setPassportRefreshCooldown(cooldownTime?: number) {
    if(typeof cooldownTime !== "number") {
      cooldownTime = this.state.refreshCooldown;
    }

    let cooldownSec = cooldownTime - this.props.pageContext.faucetApi.getFaucetTime().getSyncedTime();
    if(cooldownSec < 0)
      cooldownSec = 0;
    
    this.setState({
      refreshCooldown: cooldownTime,
      refreshCooldownSec: cooldownSec,
    });
    if(cooldownSec > 0) {
      setTimeout(() => this.setPassportRefreshCooldown(), 1000);
    }
  }

  private onRefreshPassportClick() {
    this.setState({
      refreshProcessing: true,
      refreshStatus: null,
      showRefreshForm: false,
    });
    
    this.props.pageContext.faucetApi.refreshPassport(this.props.sessionId).then((res: any) => {
      if(res.error)
        throw res;
      
      this.setState({
        refreshProcessing: false,
        refreshError: false,
        refreshStatus: "Gitcoin Passport Refreshed",
        passportInfo: {
          passport: res.passport,
          score: res.score,
        }
      });
      if(res.cooldown) {
        this.setPassportRefreshCooldown(res.cooldown);
      }
      if(this.props.refreshFn) {
        this.props.refreshFn(res.score);
      }
    }).catch((err) => {
      console.log(err);
      this.setState({
        refreshProcessing: false,
        refreshError: true,
        refreshStatus: (err.error ? err.error : err.toString()) + (err.errors ? "\n"+err.errors.join("\n") : ""),
      });
      if(err.cooldown) {
        this.setPassportRefreshCooldown(err.cooldown);
      }
    })
  }

  private onManualRefreshPassportClick() {
    this.setState({
      showRefreshForm: true,
    });
  }

  private onUploadPassportJsonClick() {
    this.setState({
      manualRefreshRunning: true,
    });

    this.props.pageContext.faucetApi.refreshPassportJson(this.props.sessionId, this.state.passportJson).then((res: any) => {
      if(res.error)
        throw res;
      
      this.setState({
        manualRefreshRunning: false,
        showRefreshForm: false,
        refreshError: false,
        refreshStatus: "Gitcoin Passport verified successfully",
        passportInfo: {
          passport: res.passport,
          score: res.score,
        }
      });
      if(res.cooldown) {
        this.setPassportRefreshCooldown(res.cooldown);
      }
      if(this.props.refreshFn) {
        this.props.refreshFn(res.score);
      }
    }).catch((err) => {
      console.log(err);
      this.setState({
        manualRefreshRunning: false,
        refreshError: true,
        refreshStatus: (err.error ? err.error : err.toString()) + (err.errors ? "\n"+err.errors.join("\n") : ""),
      });
      if(err.cooldown) {
        this.setPassportRefreshCooldown(err.cooldown);
      }
    })
    
  }

}
