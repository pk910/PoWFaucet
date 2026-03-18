# zedanazad43 Fork Quickstart

This fork can now be operated with sensitive values supplied through environment variables instead of storing them in `faucet-config.yaml`.

## Recommended operator flow

1. Copy the example config:
   - `cp faucet-config.example.yaml faucet-config.yaml`
2. Keep non-secret faucet behavior in YAML.
3. Inject secrets and deployment-specific values through environment variables.

## Supported environment overrides

- `POWFAUCET_SECRET`
- `POWFAUCET_RPC_HOST`
- `POWFAUCET_WALLET_KEY`
- `POWFAUCET_CHAIN_ID`
- `POWFAUCET_TITLE`
- `POWFAUCET_IMAGE`
- `POWFAUCET_COIN_SYMBOL`
- `POWFAUCET_COIN_TYPE`
- `POWFAUCET_COIN_CONTRACT`
- `POWFAUCET_TX_EXPLORER`
- `POWFAUCET_CAPTCHA_SITE_KEY`
- `POWFAUCET_CAPTCHA_SECRET`
- `POWFAUCET_GITHUB_CLIENT_ID`
- `POWFAUCET_GITHUB_CLIENT_SECRET`
- `POWFAUCET_CORS_ALLOW_ORIGIN`

Docker-specific runtime overrides remain supported:

- `FAUCET_SERVER_PORT`
- `FAUCET_HTTP_PROXY_OFFSET`

## Example

```powershell
$env:POWFAUCET_SECRET = "replace-with-random-secret"
$env:POWFAUCET_RPC_HOST = "https://sepolia.infura.io/v3/YOUR_KEY"
$env:POWFAUCET_WALLET_KEY = "hex-private-key-without-0x"
$env:POWFAUCET_CORS_ALLOW_ORIGIN = "https://your-faucet-domain.example"
npm start
```

## Container healthcheck

The Docker image now exposes a built-in healthcheck against:

- `GET /api/getVersion`

This makes it easier to run the faucet behind Fly.io, Docker Compose, Kubernetes, or other orchestrators.