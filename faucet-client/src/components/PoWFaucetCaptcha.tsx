import { IFaucetConfig } from '../common/IFaucetConfig';
import React, { ReactElement } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import ReCAPTCHA from "react-google-recaptcha";

export interface IPoWFaucetCaptchaProps {
  faucetConfig: IFaucetConfig;
  onChange?: (token: string) => void;
}

export interface IPoWFaucetCaptchaState {
}

export class PoWFaucetCaptcha extends React.PureComponent<IPoWFaucetCaptchaProps, IPoWFaucetCaptchaState> {
  private lastToken: string;
  private hcapControl: HCaptcha;
  private recapControl: ReCAPTCHA;

  constructor(props: IPoWFaucetCaptchaProps, state: IPoWFaucetCaptchaState) {
    super(props);

    this.state = {};
  }

  public getToken(): string {
    return this.lastToken;
  }

  public resetToken() {
    this.lastToken = null;
    if(this.hcapControl)
      this.hcapControl.resetCaptcha();
    if(this.recapControl)
      this.recapControl.reset();
  }

  private onTokenChange(token: string) {
    this.lastToken = token;
    if(this.props.onChange)
      this.props.onChange(token);
  }

	public render(): React.ReactElement<IPoWFaucetCaptchaProps> {
    let captchaEl: React.ReactElement;
    switch(this.props.faucetConfig.hcapProvider) {
      case "hcaptcha":
        captchaEl = this.renderHCaptcha();
        break;
      case "recaptcha":
        captchaEl = this.renderReCaptcha();
        break;
    }

    return (
      <div className='faucet-captcha'>
        {captchaEl}
      </div>
    );
	}

  private renderHCaptcha(): React.ReactElement {
    return (
      <HCaptcha 
        sitekey={this.props.faucetConfig.hcapSiteKey} 
        onVerify={(token) => this.onTokenChange(token)}
        ref={(cap) => this.hcapControl = cap} 
      />
    );
  }

  private renderReCaptcha(): React.ReactElement {
    return (
      <ReCAPTCHA
        sitekey={this.props.faucetConfig.hcapSiteKey}
        onChange={(token) => this.onTokenChange(token)}
        ref={(cap) => this.recapControl = cap}
      />
    );
  }

}
