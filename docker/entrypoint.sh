#!/bin/bash
set -e

# Enable nginx access log to stdout if requested
if [ "$FAUCET_NGINX_LOG" = "1" ]; then
  sed -i 's/access_log off/access_log \/dev\/stdout/' /etc/nginx/conf.d/default.conf
fi

# Start nginx in background
nginx -g 'daemon off;' &
NGINX_PID=$!

# Forward signals to child processes for graceful shutdown
trap 'kill $NODE_PID $NGINX_PID 2>/dev/null; wait; exit' SIGTERM SIGINT

# Start the Node.js backend in foreground
node --no-deprecation /app/bundle/powfaucet.cjs "$@" &
NODE_PID=$!
wait $NODE_PID
EXIT_CODE=$?

# Kill nginx when node exits
kill $NGINX_PID 2>/dev/null
wait 2>/dev/null
exit $EXIT_CODE
