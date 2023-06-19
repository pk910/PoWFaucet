import React from 'react';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetCaptcha } from '../shared/FaucetCaptcha';

export interface IClaimInputProps {
  faucetConfig: IFaucetConfig
  submitInputs(inputs: any): Promise<void>;
}

export interface IClaimInputState {
  submitting: boolean;
}

export class ClaimInput extends React.PureComponent<IClaimInputProps, IClaimInputState> {
  private faucetCaptcha = React.createRef<FaucetCaptcha>();

  constructor(props: IClaimInputProps, state: IClaimInputState) {
    super(props);

    this.state = {
      submitting: false,
		};
  }

	public render(): React.ReactElement<IClaimInputProps> {
    console.log("render ClaimInput");
    
    let requestCaptcha = !!this.props.faucetConfig.modules.captcha?.requiredForClaim;

    return (
      <div>
        {requestCaptcha ? 
        <div className="row">
          <div className='col-3'>
            Captcha:
          </div>
          <div className="col">
            <div className='faucet-captcha'>
              <FaucetCaptcha 
                faucetConfig={this.props.faucetConfig} 
                ref={this.faucetCaptcha} 
                variant='claim'
              />
            </div>
          </div>
        </div>
        : null}
        <div className="row">
          <div className="col-12 faucet-actions center">
            <button 
              className="btn btn-success start-action" 
              onClick={(evt) => this.onSubmitBtnClick()} 
              disabled={this.state.submitting}>
                Claim Rewards
            </button>
          </div>
        </div>
      </div>
    );
	}

  private async onSubmitBtnClick() {
    this.setState({
      submitting: true
    });

    try {
      let inputData: any = {};

      if(this.props.faucetConfig.modules.captcha?.requiredForClaim) {
        inputData.captchaToken = await this.faucetCaptcha.current?.getToken();
      }

      await this.props.submitInputs(inputData);
    } finally {
      this.setState({
        submitting: false
      });
    }
  }

}
