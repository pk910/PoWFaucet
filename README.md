# PoWFaucet

Proof of Work Faucet for EVM chains

# Why

Faucets for ETH Testnets are spammed by bots. This faucet tries to reduce the efficiency of these automated requests by requiring some mining work to be done in exchange for ETH.

# Instances

Goerli Testnet: [https://goerli-faucet.pk910.de](https://goerli-faucet.pk910.de)

Sepolia Testnet: [https://sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de)

# Run Yourself

`npm install`

`cp faucet-config.example.yaml faucet-config.yaml`

edit faucet-config.yaml

`npm run start`

# Configure

see [faucet-config.example.yaml](https://github.com/pk910/PoWFaucet/blob/master/faucet-config.example.yaml)

# Productive Setups

For productive setups I'd suggest using a more complex webserver that supports SSL, caching and other stuff.

See [docs/apache-config.md](https://github.com/pk910/PoWFaucet/blob/master/docs/apache-config.md) for more.

# Bugs & Features

Please feel free to report bugs and add new features via PRs if you like.

# Thanks To

This faucet contains parts of code from the following projects:

[pow-captcha](https://git.sequentialread.com/forest/pow-captcha) - faucet-wasm build script

[FaucETH](https://github.com/komputing/FaucETH) - faucet page design

# License

AGPLv3