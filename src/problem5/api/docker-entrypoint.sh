#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy
node dist/prisma/seed.js

exec node dist/index.js
