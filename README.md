# PoWFaucet

Proof of Work Faucet for EVM chains

# Why

Faucets for ETH Testnets are spammed by bots. This faucet tries to reduce the efficiency of these automated request by requiring some mining work to be done in exchange for ETH.

# Run

`npm install`

`mv faucet-config.example.json faucet-config.json`

edit faucet-config.json

`npm run start`

# Configure

see [src/common/FaucetConfig.ts](https://github.com/pk910/PoWFaucet/blob/master/src/common/FaucetConfig.ts)

# Thanks To

This faucet contains parts of code from the following projects:

[pow-captcha](https://git.sequentialread.com/forest/pow-captcha) - faucet-wasm build script
[FaucETH](https://github.com/komputing/FaucETH) - faucet page design
