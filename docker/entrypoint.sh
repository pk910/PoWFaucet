#!/bin/bash
set -e

# Enable nginx access log to stdout if requested
if [ "$FAUCET_NGINX_LOG" = "1" ]; then
  ln -sf /dev/stdout /var/log/nginx/access.log
fi

# Forward signals to child processes for graceful shutdown
trap 'kill $NODE_PID $NGINX_PID 2>/dev/null; wait; exit' SIGTERM SIGINT

# Start the Node.js backend
node --no-deprecation bundle/powfaucet.cjs &
NODE_PID=$!

# Start nginx in foreground mode
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for either process to exit
wait -n $NODE_PID $NGINX_PID
EXIT_CODE=$?

# Kill remaining processes
kill $NODE_PID $NGINX_PID 2>/dev/null
wait 2>/dev/null
exit $EXIT_CODE
