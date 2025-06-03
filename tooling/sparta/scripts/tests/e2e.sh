#! /bin/bash

docker compose -f docker-compose.prod-db.yml up -d
bun run setup:db
sleep 10 # wait for db to be ready
bun run e2e:test