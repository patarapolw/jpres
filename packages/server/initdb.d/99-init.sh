#!/usr/bin/env bash

pg_ctl -o "-c listen_addresses='localhost'" -w restart

cd /app
node ./lib/db/init.js
