# Productive webserver setup

For productive setups I'd suggest using a more complex webserver than the built in low-level static server as it does not support ssl, caching and stuff.
I preferred `apache2` for a long time, which works fine till there are more than ~4000 concurrent sessions (websocket connections) at the same time.
Beyond that point I had to switch to `nginx`, which works just fine with a incredible high number of connections :)

To setup the faucet with a proper webserver, you just need to point the document root to the /static folder of the faucet and forward websocket (Endpoint: `/pow`) and api (Endpoint: `/api`) calls to the faucet process.

## Apache2 webserver config

Apache has a limit of 150 concurrent connections in its default mpm_prefork configuration.
I'd suggest mpm_event with high limits instead. There is not much traffic going through the client websockets, but it can be a high number of concurrent and long running connections.

See [sitecfg-apache2.conf](https://github.com/pk910/PoWFaucet/blob/master/docs/sitecfg-apache2.conf) for example apache2 site config (used for kiln-faucet.pk910.de)

required apache2 modules:
- proxy
- proxy_wstunnel
- rewrite

Note: Even with mpm_event, I ran into really bad connection issues when serving more than 4000 connections at the same time.
If you expect such a high activity, switch over to nginx.
Nginx seems to work much more reliable with its websocket handling.

## Nginx webserver config

See [sitecfg-nginx.conf](https://github.com/pk910/PoWFaucet/blob/master/docs/sitecfg-nginx.conf) for example nginx site config (used for goerli-faucet.pk910.de)

## Common issue: Connection limits too low

Keep in mind the connection limits of the webserver. 

Per default there is a OS-enforced limit of `1024` concurrent file descriptors in most linux distributions.

You can check the limit via `ulimit -n`

To avoid issues with many sessions, increase this limit for the webserver user (`www-data`) & faucet process user.
