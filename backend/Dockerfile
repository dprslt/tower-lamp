FROM balenalib/raspberry-pi-debian-node:12-build

WORKDIR /app

RUN apt update
RUN apt-get install -qq python build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY package.json .
RUN npm install

COPY . /app/
RUN npm run build

ENTRYPOINT npm run start
