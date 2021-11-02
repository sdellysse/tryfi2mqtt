FROM node:latest

WORKDIR /app
COPY . /app

RUN npm install

ENTRYPOINT [ "npm", "run", "--silent", "start" ]