# build-server env
FROM node:18-slim AS build-server-env
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY ./libs libs
COPY ./tsconfig.json .
COPY ./webpack.config.js .
COPY ./src src
RUN npm run bundle

# build-client env
FROM node:18-slim AS build-client-env
WORKDIR /build
COPY faucet-client/package*.json ./faucet-client/
COPY ./libs libs
COPY ./static static
RUN cd faucet-client && npm install
COPY ./faucet-client faucet-client
RUN cd faucet-client && node ./build-client.js

# final stage
FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
COPY --from=build-server-env /build/dist ./dist
COPY --from=build-client-env /build/static ./static
COPY ./faucet-config.example.yaml .
RUN cp ./static/index.html ./static/index.seo.html && chmod 777 ./static/index.seo.html

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "dist/powfaucet.js" ]
