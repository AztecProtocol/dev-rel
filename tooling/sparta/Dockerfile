# Sparta Discord Bot Dockerfile
# This Dockerfile builds the Sparta Discord bot for deployment

# Start with the official Bun image
FROM oven/bun:latest

# Add Foundry to PATH for Ethereum development tools
ENV PATH="/root/.foundry/bin:${PATH}"

# Install required dependencies
# - curl: For downloading tools
# - apt-utils: For better apt functionality
RUN apt update && apt install -y curl apt-utils

# Install Docker within the container for potential nested container operations
RUN curl -fsSL https://get.docker.com | bash

# Install Foundry toolkit for Ethereum development (cast, anvil, forge)
RUN curl -L https://foundry.paradigm.xyz | bash
RUN foundryup

# Verify Foundry installation by checking cast version
RUN cast --version

# Set the working directory
WORKDIR /app

# Copy the root package.json and lockfile
COPY package.json bun.lockb ./

# Copy package.json files from workspaces to ensure dependencies are captured
COPY packages/*/package.json ./packages/

# Install all dependencies for the monorepo
RUN bun install --frozen-lockfile

# Copy the entire monorepo source code
COPY . .

# Start the bot (Assuming the main entry point remains or is adjusted)
# Update this if your main start script moves to a specific package
CMD ["bun", "run", "start"] # Adjust if needed, e.g., bun run packages/bot/start
