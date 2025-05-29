#! /bin/bash

docker compose -f docker-compose.staging.yml up -d
sleep 10
bun run scheduler:test
docker compose -f docker-compose.staging.yml down