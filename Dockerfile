FROM node:17-slim
WORKDIR /app
COPY . /app
RUN npm install
RUN npm run build

COPY . .

EXPOSE 8080
ENTRYPOINT [ "node", "dist/app.js" ]
