import { IPoWCaptchaProps, PoWCaptcha } from './components/PoWCaptcha';
import React from 'react';
import ReactDOM from 'react-dom';

export function initPoWCaptcha(container: Element, options: IPoWCaptchaProps) {
  let captcha = React.createElement<IPoWCaptchaProps>(PoWCaptcha, options, []);
  ReactDOM.render(captcha, container);
};

(window as any).initPoWCaptcha = initPoWCaptcha;
