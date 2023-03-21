# PoWFaucet

Proof of Work Faucet for EVM chains

# Why

Faucets for ETH Testnets are spammed by bots. This faucet tries to reduce the efficiency of these automated requests by requiring some mining work to be done in exchange for ETH.

For clarification: This faucet does NOT generate new coins with the "mining" process.
It's just a protection method to prevent anyone from requesting big amount of funds and draining the faucet wallet.
If you want to run your own instance you need to transfer the mineable funds to the faucet wallet yourself!

# Instances

Goerli Testnet: [https://goerli-faucet.pk910.de](https://goerli-faucet.pk910.de)

Sepolia Testnet: [https://sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de)

Zhejiang Testnet: [https://zhejiang-faucet.pk910.de](https://zhejiang-faucet.pk910.de)

# Run Yourself

`npm install`

`cp faucet-config.example.yaml faucet-config.yaml`

edit faucet-config.yaml

`npm run start`

access the faucet via http://localhost:8080

# Configure

see [faucet-config.example.yaml](https://github.com/pk910/PoWFaucet/blob/master/faucet-config.example.yaml)

# Productive Setups

For productive setups I'd suggest using a more complex webserver that supports SSL, caching and other stuff.

See [docs/apache-config.md](https://github.com/pk910/PoWFaucet/blob/master/docs/apache-config.md) for more.

# Run with docker

create a data directory

create a copy of [faucet-config.example.yaml](https://github.com/pk910/PoWFaucet/blob/master/faucet-config.example.yaml) and save as `faucet-config.yaml`

edit `faucet-config.yaml` and prepend /config/ to faucetStore & faucetLogFile (ensure they're not lost on updates)
```
faucetStore: "/config/faucet-store.json"
faucetLogFile: "/config/faucet-events.log"
```

start the container: (change `/home/powfaucet` to your datadir)

`docker run -d --restart unless-stopped --name=powfaucet -v /home/powfaucet:/config -p 8080:8080 -it pk910/powfaucet:latest --config=/config/faucet-config.yaml`

You should now be able to access the faucet via http://localhost:8080

read logs:

`docker logs powfaucet --follow`

stop container:

`docker rm -f powfaucet`

# Bugs & Features

Please feel free to report bugs and add new features via PRs if you like.

# Thanks To

This faucet contains parts of code from the following projects:

[pow-captcha](https://git.sequentialread.com/forest/pow-captcha) - faucet-wasm build script

[FaucETH](https://github.com/komputing/FaucETH) - faucet page design

# License

AGPLv3
