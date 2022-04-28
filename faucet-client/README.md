# faucet-client

This is the client side code for the PoWFaucet.

This builds:
- /static/js/powfaucet.js  (entry src/main.ts)
- /static/js/powfaucet-worker-sc.js  (entry src/worker/worker-scrypt.ts)
- /static/js/powfaucet-worker-cn.js  (entry src/worker/worker-cryptonight.ts)
- /static/css/powfaucet.css  (all css imports)

# How to build

`npm install`

`node ./build-client.js`