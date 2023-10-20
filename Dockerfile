# build env
FROM node:18-slim AS build-env
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN cd faucet-client && node ./build-client.js

# final stage
FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
COPY --from=build-env /build/dist ./dist
COPY --from=build-env /build/static ./static
COPY --from=build-env /build/faucet-config.example.yaml .

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "dist/app.js" ]
