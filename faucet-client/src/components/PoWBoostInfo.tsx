import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IFaucetConfig } from '../common/IFaucetConfig';
import { IPoWSessionBoostInfo } from '../common/PoWSession';
import { PoWTime } from '../common/PoWTime';

export interface IPoWBoostInfoProps {
  targetAddr: string;
  boostInfo: IPoWSessionBoostInfo;
  faucetConfig: IFaucetConfig;
  powTime: PoWTime;
  refreshFn: () => Promise<any>;
}

export interface IPoWBoostInfoState {
  refreshCooldown: number;
  refreshCooldownSec: number;
  refreshProcessing: boolean;
  refreshError: boolean;
  refreshStatus: string;
}

export class PoWBoostInfo extends React.PureComponent<IPoWBoostInfoProps, IPoWBoostInfoState> {

  constructor(props: IPoWBoostInfoProps, state: IPoWBoostInfoState) {
    super(props);

    this.state = {
      refreshCooldown: 0,
      refreshCooldownSec: 0,
      refreshProcessing: false,
      refreshError: false,
      refreshStatus: null,
    };
  }

	public render(): React.ReactElement<IPoWBoostInfoProps> {
    let stamps = this.props.boostInfo?.stamps || [];
    return (
      <div className="pow-boost-info">
        <div className="boost-descr">Reward too low? Boost your rewards by fulfilling your <a href="https://passport.gitcoin.co/#/dashboard" target="_blank">Gitcoin Passport</a>.</div>
        <div className="boost-passport">
          <div className="passport-summary container">
            <div className="row">
              <div className="col-4">
                Passport Address:
              </div>
              <div className="col-8">
                {this.props.targetAddr}
              </div>
            </div>
            <div className="row">
              <div className="col-4">
                Passport Score:
              </div>
              <div className="col-8">
                <span className="passport-score">{this.props.boostInfo?.score || 0}</span>
                <span className="passport-factor">
                  (Reward Factor: {this.props.boostInfo?.factor || 1} 
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
              </div>
            </div>
          </div>
          <div className="passport-refresh">
            <button 
              className="btn btn-primary conn-wallet-btn" 
              onClick={(evt) => this.onRefreshPassportClick()} 
              disabled={this.state.refreshCooldownSec > 0 || this.state.refreshProcessing}
              >
                Refresh Passport{this.state.refreshCooldownSec > 0 ? " (" + this.state.refreshCooldownSec + ")" : ""}
            </button>
            {this.state.refreshStatus ?
              <div className={["alert", this.state.refreshError ? "alert-danger" : "alert-success"].join(" ")} role="alert">
                {this.state.refreshStatus}
              </div>
            : null}
          </div>
          <div className="passport-details container">
            <div className="row details-header">
              <div className="col">
                Passport Score Details:
              </div>
            </div>
            {stamps.map((stamp) => {
              return (
                <div key={"stamp-" + stamp} className="row passport-stamp">
                  <div className="col-8">
                    {stamp}
                  </div>
                  <div className="col-4">
                    + {this.props.faucetConfig.passportBoost.stampScoring[stamp]}
                  </div>
                </div>
              )
            })}
          </div>
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
        {Object.keys(this.props.faucetConfig.passportBoost.boostFactor).map((score) => {
          let factor = this.props.faucetConfig.passportBoost.boostFactor[score];
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

  private setPassportRefreshCooldown(cooldownTime?: number) {
    if(typeof cooldownTime !== "number") {
      cooldownTime = this.state.refreshCooldown;
    }

    let cooldownSec = cooldownTime - this.props.powTime.getSyncedTime();
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
    });
    this.props.refreshFn().then((res) => {
      this.setState({
        refreshProcessing: false,
        refreshError: false,
        refreshStatus: "Gitcoin Passport Refreshed",
      });
      if(res.cooldown) {
        this.setPassportRefreshCooldown(res.cooldown);
      }
    }, (err) => {
      console.log(err);
      this.setState({
        refreshProcessing: false,
        refreshError: true,
        refreshStatus: err.message ? err.message : err.toString(),
      });
      if(err.data && err.data.cooldown) {
        this.setPassportRefreshCooldown(err.data.cooldown);
      }
    })
  }

}
