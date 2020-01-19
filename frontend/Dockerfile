FROM arm32v6/node:13-alpine
WORKDIR /app

COPY package.json .
RUN npm install
RUN npm run build

FROM arm32v6/nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
