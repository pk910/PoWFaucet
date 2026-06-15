import 'mocha';
import { expect } from 'chai';
import { faucetConfig, loadFaucetConfig } from '../src/config/FaucetConfig.js';
import { ICaptchaConfig } from '../src/modules/captcha/CaptchaConfig.js';

describe('FaucetConfig environment overrides', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('applies sensitive config overrides from environment variables', () => {
    process.env.POWFAUCET_SECRET = 'env-secret';
    process.env.POWFAUCET_RPC_HOST = 'https://rpc.example.org';
    process.env.POWFAUCET_WALLET_KEY = 'abc123';
    process.env.POWFAUCET_CORS_ALLOW_ORIGIN = 'https://a.example, https://b.example';
    process.env.POWFAUCET_CAPTCHA_SECRET = 'captcha-secret';

    loadFaucetConfig(true);

    expect(faucetConfig.faucetSecret).to.equal('env-secret');
    expect(faucetConfig.ethRpcHost).to.equal('https://rpc.example.org');
    expect(faucetConfig.ethWalletKey).to.equal('abc123');
    expect(faucetConfig.corsAllowOrigin).to.deep.equal(['https://a.example', 'https://b.example']);
    expect((faucetConfig.modules.captcha as ICaptchaConfig).secret).to.equal('captcha-secret');
  });
});