FROM balenalib/raspberry-pi-debian-node:12-build
#FROM arm32v7/node:13
#FROM arm32v6/node:13-alpine

WORKDIR /app

RUN apt update
RUN apt install python
RUN apt install build-essential
RUN apt-get install -qq libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY package.json .
RUN npm install

COPY . /app/
RUN npm build

FROM balenalib/raspberry-pi-debian-node:12-build
WORKDIR /app
COPY --from=0 /app/build .

ENTRYPOINT npm run start
