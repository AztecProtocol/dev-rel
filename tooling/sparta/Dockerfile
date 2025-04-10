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

# Copy package files first to leverage Docker layer caching
# This way, dependencies are only re-installed when package files change
COPY src/package.json src/bun.lockb ./
RUN bun install

# Then copy the rest of the source code
# This step is separate to avoid reinstalling dependencies when only code changes
COPY src ./

# Start the bot
# Uses the production start command from package.json
CMD ["bun", "run", "start"]
