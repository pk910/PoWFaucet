## Demo Instances

All demo instances will drop a useless ERC20 token (["PoWC"](https://holesky.etherscan.io/token/0xaC7BE2aeF3b59079F76fE333e131A76FB44497C3)) instead of native funds.

The demo instances are there to show different configuration scenarios with different modules enabled.\
If your're looking for native testnet funds, use one of my [productive instances](https://github.com/pk910/PoWFaucet#instances).

### Demo 1

Low protection configuration, mainly based on captchas only.\
Some additional restrictions for hosting/proxy IP-Ranges & target wallet balance + contract restriction.

URL: [https://demo1.faucets.pk910.de/](https://demo1.faucets.pk910.de/)\
Status Page: [https://demo1.faucets.pk910.de/#/status](https://demo1.faucets.pk910.de/#/status)\
Configuration: [demo1-config.yaml](https://github.com/pk910/PoWFaucet/blob/master/docs/demo/demo1-config.yaml)

Modules:
* captcha:
  - for session start: true
  - for reward claim: false
* ensname:
  - required: false
* ipinfo:
  - required: true
  - hosting: 0.1 (10% reward)
  - proxy: 0.1 (10% reward)
* ethinfo:
  - max balance: 50 PoWC
  - deny contracts: true

### Demo 2

Low protection configuration, mainly based on ensname requirement.\
Additional recurring limit, that prevents requesting more than a specific amount of funds per period.

URL: [https://demo2.faucets.pk910.de/](https://demo2.faucets.pk910.de/)\
Status Page: [https://demo2.faucets.pk910.de/#/status](https://demo2.faucets.pk910.de/#/status)\
Configuration: [demo2-config.yaml](https://github.com/pk910/PoWFaucet/blob/master/docs/demo/demo2-config.yaml)

Modules:
* captcha:
  - for session start: false
  - for reward claim: true
* ensname:
  - required: true
* recurring-limits:
  - max 50 PoWC per day by IP & ETH Addr
  - max 200 PoWC per 2 days by ETH Addr

### Demo 3

Medium protection configuration, mainly based on mainnet wallet requirements (>0.001 ETH & 5 sent TX).\
Additional recurring limit, that prevents requesting more than a specific amount of funds per period & target wallet balance restriction.

URL: [https://demo3.faucets.pk910.de/](https://demo3.faucets.pk910.de/)\
Status Page: [https://demo3.faucets.pk910.de/#/status](https://demo3.faucets.pk910.de/#/status)\
Configuration: [demo3-config.yaml](https://github.com/pk910/PoWFaucet/blob/master/docs/demo/demo3-config.yaml)

Modules:
* ensname:
  - required: false
* ethinfo:
  - max balance: 50 PoWC
  - deny contracts: false
* mainnet-wallet:
  - min balance: 0.001 ETH
  - min TX count: 5
* recurring-limits:
  - max 50 PoWC per day by IP & ETH Addr
  - max 200 PoWC per 7 days by ETH Addr


### Demo 4

High protection configuration, mainly based on mining (pow) protection.\
\+ Concurrency limit to limit number of simultaneous sessions per IP / ETH Addr.\
\+ Passport module, that applies a reward factor based on gitcoin passport score.\
\+ Faucet Outflow module, that introduces a global fund outflow limit (session rewards are automatically lowered to meet that limit globally)

URL: [https://demo4.faucets.pk910.de/](https://demo4.faucets.pk910.de/)\
Status Page: [https://demo4.faucets.pk910.de/#/status](https://demo4.faucets.pk910.de/#/status)\
Configuration: [demo4-config.yaml](https://github.com/pk910/PoWFaucet/blob/master/docs/demo/demo4-config.yaml)

Modules:
* faucet-outflow:
  - limit: 100 PoWC / 2h
  - lowerLimit: -200 PoWC
  - upperLimit: 100 PoWC
* concurrency-limit:
  - max 2 running sessions per address / IP
* pow:
  - reward per hash: 0.1 PoWC
  - difficulty:  10
  - mining timeout: 2h
* passport:
  - x2 with score > 10
  - x4 with score > 15


### Demo 5

Medium protection configuration, mainly based on github login protection.\
\+ Concurrency limit to limit number of simultaneous sessions per IP / ETH Addr.\
\+ Passport module, that applies a reward factor based on gitcoin passport score.\
\+ Faucet Outflow module, that introduces a global fund outflow limit (session rewards are automatically lowered to meet that limit globally)

URL: [https://demo5.faucets.pk910.de/](https://demo5.faucets.pk910.de/)\
Status Page: [https://demo5.faucets.pk910.de/#/status](https://demo5.faucets.pk910.de/#/status)\
Configuration: [demo5-config.yaml](https://github.com/pk910/PoWFaucet/blob/master/docs/demo/demo5-config.yaml)

Modules:
* captcha:
  - for session start: true
  - for reward claim: false
* ensname:
  - required: false
* github:
  - checks:
    - required: true\
      minAccountAge: 5184000 # 60 days\
      minRepoCount: 2
  - restrictions:
    - 5 sessions / max 50 PoWC per day
* ethinfo:
  - max balance: 50 PoWC
  - deny contracts: true

### Productive Instances

To be clear: The examples above are just examples to demonstrate different scenarios with different protection methods.\
All faucet modules can be used independently, so you can configure the faucet for your protection needs. \
For best protection, I recommend using a combination of several modules. I recommend to use the `recurring-limits`, `ethinfo` & `captcha` modules as a "minimum protection".

