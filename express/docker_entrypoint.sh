#! /bin/sh

# cd to the directory of this script
cd "$( dirname -- "$0"; )"

# install packages
npm install
npm install -g nodemon

# do shit
exec "$@"