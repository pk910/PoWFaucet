cbowREADME.md

# PoWFaucet

Proof of Work Faucet for EVM chains

<b>Warning: The master branch of this repository is now pointing to the new v2 version of the faucet.</b>

The v2 version is not compatible with the v1 configuration or database schema! When upgrading a v1 instance, you need to delete the old database file and recreate the configuration.

Please note, that the v2 version is not fully stable yet. My own productive instances of the faucet for goerli/sepolia still run on v1. 

The latest version of the v1 faucet can be fetched via the v1 branch. I'll keep it updated in case any issues come up on v1, but don't expect any new features :)

# Why

Faucets for ETH Testnets are spammed by bots. This faucet tries to reduce the efficiency of these automated requests by requiring some mining work to be done in exchange for ETH.

For clarification: This faucet does NOT generate new coins with the "mining" process.
It's just a protection method to prevent anyone from requesting big amount of funds and draining the faucet wallet.
If you want to run your own instance you need to transfer the mineable funds to the faucet wallet yourself!

For a more detailed description, take a look into the [Project Wiki](https://github.com/pk910/PoWFaucet/wiki)

# Instances

Goerli Testnet: [https://goerli-faucet.pk910.de](https://goerli-faucet.pk910.de)

Sepolia Testnet: [https://sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de)

[Ephemery](https://github.com/ephemery-testnet/ephemery-resources) Testnet: [https://ephemery-faucet.pk910.de](https://ephemery-faucet.pk910.de)

# Run Yourself

Read the [Faucet Operator Wiki](https://github.com/pk910/PoWFaucet/wiki/Operator-Wiki) to see the installation and configuration instructions.

# Bugs & Features

Please feel free to report bugs and add new features via PRs if you like.

# Thanks To

This faucet contains parts of code from the following projects:

[pow-captcha](https://git.sequentialread.com/forest/pow-captcha) - faucet-wasm build script

[FaucETH](https://github.com/komputing/FaucETH) - faucet page design

# License

AGPLv3
