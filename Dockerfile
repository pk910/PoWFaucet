# build-server env
FROM --platform=$BUILDPLATFORM node:22-slim AS build-server-env
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY ./libs libs
COPY ./tsconfig.json .
COPY ./webpack.config.js .
COPY ./src src
RUN npm run bundle

# build-client env
FROM --platform=$BUILDPLATFORM node:22-slim AS build-client-env
WORKDIR /build
COPY faucet-client/package*.json ./faucet-client/
COPY ./libs libs
COPY ./static static
RUN cd faucet-client && npm install
COPY ./faucet-client faucet-client
RUN cd faucet-client && node ./build-client.js

# final stage
FROM nginxinc/nginx-unprivileged:1.27

USER root

# Copy node binary from official image and install ca-certificates
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

WORKDIR /app
COPY --from=build-server-env /build/bundle ./bundle
COPY --from=build-client-env /build/static ./static
COPY ./faucet-config.example.yaml .
RUN cp ./static/index.html ./static/index.seo.html && chmod 777 ./static/index.seo.html

# nginx config: serves static files directly, proxies /api/ and /ws/ to node backend
COPY ./docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 ./docker/entrypoint.sh /entrypoint.sh

USER nginx

# Node backend listens on 8082 internally, nginx on 8080 externally
# httpProxyCount is incremented by 1 to account for the internal nginx proxy
ENV FAUCET_SERVER_PORT=8082
ENV FAUCET_HTTP_PROXY_OFFSET=1

EXPOSE 8080
ENTRYPOINT [ "/entrypoint.sh" ]
