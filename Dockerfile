FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
COPY dist ./dist
COPY static ./static
COPY faucet-config.example.yaml .

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "dist/powfaucet.js" ]
