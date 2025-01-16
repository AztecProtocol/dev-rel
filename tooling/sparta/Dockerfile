FROM oven/bun:latest

RUN apt update && apt install -y curl
RUN curl -fsSL https://get.docker.com | bash

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
COPY src ./src
COPY .env ./

RUN bun install
CMD ["bun", "run", "start"]
