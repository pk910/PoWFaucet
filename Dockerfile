FROM node:18-slim
WORKDIR /app
COPY dist ./dist
COPY static ./static
COPY faucet-config.example.yaml .

EXPOSE 8080
ENTRYPOINT [ "node", "--no-deprecation", "dist/powfaucet.js" ]
