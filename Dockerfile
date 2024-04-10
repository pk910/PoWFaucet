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
COPY ./static static

# final stage
FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
COPY --from=build-server-env /build/bundle ./bundle
COPY --from=build-client-env /build/static ./static
COPY ./faucet-config.example.yaml .

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "bundle/powfaucet.cjs" ]
