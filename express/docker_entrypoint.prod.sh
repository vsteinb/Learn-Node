#! /bin/sh

npm install
npm install -g nodemon

npm run build

node dist/index.js