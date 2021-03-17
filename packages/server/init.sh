#!/usr/bin/env bash

/usr/local/bin/docker-entrypoint.sh postgres &

yarn start
