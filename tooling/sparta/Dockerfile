FROM oven/bun:latest

ENV PATH="/root/.foundry/bin:${PATH}"

RUN apt update && apt install -y curl apt-utils
RUN curl -fsSL https://get.docker.com | bash
RUN curl -L https://foundry.paradigm.xyz | bash

RUN foundryup
RUN cast --version

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
COPY src ./src
COPY .env ./

RUN bun install
CMD ["bun", "run", "start"]
