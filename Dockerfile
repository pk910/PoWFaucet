# build env
FROM node:18-slim AS build-env
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run bundle
RUN cd faucet-client && node ./build-client.js

# final stage
FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
COPY --from=build-env /build/dist ./dist
COPY --from=build-env /build/static ./static
COPY --from=build-env /build/faucet-config.example.yaml .
RUN cp ./static/index.html ./static/index.seo.html && chmod 777 ./static/index.seo.html

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "dist/powfaucet.js" ]
