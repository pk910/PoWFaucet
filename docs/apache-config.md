# Apache2 webserver config

For productive setups I'd suggest using a more complex webserver than the built in lowlevel static server as it does not support ssl, caching and stuff.

I prefer apache2 for the instances hosted by myself, but nginx and others should work fine, too.
Just point the document root to the /static folder of the faucet and forward websocket (Endpoint: `/pow`) and api (Endpoint: `/api`) calls to the faucet process.

Keep in mind the connection limits of the webserver. Apache has a limit of 150 connections in its default mpm_prefork configuration.
I'd suggest mpm_event with high limits instead. There is not much traffic going through the client websockets, but it can be a high number of concurrent and long running connections.

See [apache2-faucet.conf](https://github.com/pk910/PoWFaucet/blob/master/docs/apache2-faucet.conf) for example apache2 site config (used for kiln-faucet.pk910.de)

required apache2 modules:
- proxy
- proxy_wstunnel
- rewrite

