FROM nikolaik/python-nodejs:python3.10-nodejs18-slim
WORKDIR /app
COPY . /app
RUN npm install
RUN npm run build

COPY . .

EXPOSE 8080
ENTRYPOINT [ "node", "dist/app.js" ]
