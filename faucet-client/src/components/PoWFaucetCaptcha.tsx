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

interface IPoWFaucetCustomCaptchaLoader {
  createCaptcha(options?: {
    onChange?: (token: string) => void;
    customData?: any;
  }): IPoWFaucetCustomCaptcha;
}

interface IPoWFaucetCustomCaptcha {
  render(container: Element): void;
  getToken(): string;
  reset(): void;
  unmount(): void;
}

export class PoWFaucetCaptcha extends React.PureComponent<IPoWFaucetCaptchaProps, IPoWFaucetCaptchaState> {
  private lastToken: string;
  private hcapControl: HCaptcha;
  private recapControl: ReCAPTCHA;
  private customControl: IPoWFaucetCustomCaptcha;

  constructor(props: IPoWFaucetCaptchaProps, state: IPoWFaucetCaptchaState) {
    super(props);

    this.state = {};
  }

  public getToken(): Promise<string> {
    if(this.customControl) {
      return Promise.resolve().then(() => {
        return this.customControl.getToken();
      });
    }
    return Promise.resolve(this.lastToken);
  }

  public resetToken() {
    this.lastToken = null;
    if(this.hcapControl)
      this.hcapControl.resetCaptcha();
    if(this.recapControl)
      this.recapControl.reset();
    if(this.customControl)
      this.customControl.reset();
  }

  private onTokenChange(token: string) {
    this.lastToken = token;
    if(this.props.onChange)
      this.props.onChange(token);
  }

  public componentWillUnmount() {
    if(this.hcapControl) {
      this.hcapControl.removeCaptcha();
      this.hcapControl = null;
    }
    if(this.customControl) {
      this.customControl.unmount();
      this.customControl = null;
    }
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
      case "custom":
        captchaEl = this.renderCustomCaptcha();
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

  private injectCustomCaptchaLoader(): Promise<IPoWFaucetCustomCaptchaLoader> {
    let customScriptEl = document.querySelector('script[ref="custom-captcha"]');
    let customScriptPromise: Promise<IPoWFaucetCustomCaptchaLoader>;
    if(!customScriptEl) {
      customScriptPromise = new Promise((resolve, reject) => {
        let callbackFnName = (() => {
          while(true) {
            let name = "powFaucetCustomCaptcha" + Math.floor(Math.random() * 10000);
            if(window.hasOwnProperty(name))
              continue;
            return name;
          }
        })();
        let customCaptchaLoader: IPoWFaucetCustomCaptchaLoader;
        Object.defineProperty(window, callbackFnName, {
          configurable: false,
          enumerable: false,
          writable: false,
          value: function(loader: IPoWFaucetCustomCaptchaLoader) {
            if(customCaptchaLoader)
              return;
              customCaptchaLoader = loader;
          }
        });
  
        customScriptEl = document.createElement("script");
        customScriptEl.setAttribute("src", this.props.faucetConfig.hcapSiteKey.replace(/{callback}/, callbackFnName));
        customScriptEl.setAttribute("ref", "custom-captcha");
        customScriptEl.addEventListener("load", () => {
          if(customCaptchaLoader)
            resolve(customCaptchaLoader);
          else
            reject("captcha loader callback not called");
        });
        customScriptEl.addEventListener("error", (err) => {
          reject("custom captcha could not be initialized: " + (err ? err.toString() : ""));
        });

        document.head.appendChild(customScriptEl);
      });
      (customScriptEl as any)._powFaucetCaptchaPromise = customScriptPromise;

      customScriptPromise.catch(() => {
        if(customScriptEl.parentElement) {
          customScriptEl.parentElement.removeChild(customScriptEl);
        }
      });
    }
    else {
      customScriptPromise = (customScriptEl as any)._powFaucetCaptchaPromise;
    }
    return customScriptPromise;
  }

  private renderCustomCaptcha(): React.ReactElement {
    let controlPromise: Promise<IPoWFaucetCustomCaptcha>;
    if(this.customControl) {
      controlPromise = Promise.resolve(this.customControl);
    }
    else {
      let captchaLoader = this.injectCustomCaptchaLoader();
      controlPromise = captchaLoader.then((loader) => {
        return this.customControl = loader.createCaptcha({
          onChange: (token) => this.onTokenChange(token),
        });
      });
    }

    return (
      <div ref={(div) => {
        if(div) {
          controlPromise.then((control) => {
            control.render(div);
          }, (err) => {
            div.innerHTML = '<div class="alert alert-danger" role="alert">Error: Captcha could not be loaded</div>';
            console.error(err);
          });
        }
      }}>Loading captcha...</div>
    )
  }

}
