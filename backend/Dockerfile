FROM arm32v6/node:13-alpine

WORKDIR /app

RUN apk add python

COPY package.json .
RUN npm install

COPY . /app/

ENTRYPOINT npm run start
