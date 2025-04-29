# Sparta API & Frontend Dockerfile
# This Dockerfile builds the Sparta API (Express) and Frontend (Vite) for deployment

# Start with the official Bun image
FROM oven/bun:latest

# Add Foundry to PATH for Ethereum development tools
ENV PATH="/root/.foundry/bin:${PATH}"

# Install required dependencies
# - curl: For downloading tools
# - apt-utils: For better apt functionality
RUN apt update && apt install -y curl apt-utils git

# Install Docker within the container (If needed for runtime operations, otherwise remove)
# RUN curl -fsSL https://get.docker.com | bash

# Install Foundry toolkit for Ethereum development (If needed for runtime operations, otherwise remove)
RUN curl -L https://foundry.paradigm.xyz | bash
RUN foundryup

# Verify Foundry installation by checking cast version
# RUN cast --version # Optional: remove if not needed for runtime verification

# Set the working directory
WORKDIR /app

# Copy the root package.json and lockfile
COPY package.json bun.lock ./

# Copy package.json files from workspaces to ensure dependencies are captured
# Create the packages directory first
RUN mkdir packages
COPY packages/express/package.json ./packages/express/
COPY packages/vite/package.json ./packages/vite/
COPY packages/utils/package.json ./packages/utils/
# Add other packages if they exist and are needed

# Install all dependencies for the monorepo using the lockfile
RUN bun install --frozen-lockfile

# Copy the entire monorepo source code
# This includes Express, Vite, Utils, etc.
COPY . .

# Declare the build argument for the Vite frontend URL
ARG VITE_APP_API_URL
ARG VITE_REOWN_PROJECT_ID
ARG VITE_MINIMUM_SCORE

ENV VITE_APP_API_URL=$VITE_APP_API_URL
ENV VITE_REOWN_PROJECT_ID=$VITE_REOWN_PROJECT_ID
ENV VITE_MINIMUM_SCORE=$VITE_MINIMUM_SCORE

# Generate Swagger docs during build
RUN bun run swagger

# Build the Vite frontend application
# Assumes the build script exists in packages/vite/package.json
# The ARG variables will be available as environment variables here
RUN cd packages/vite && \
    VITE_APP_API_URL=$VITE_APP_API_URL \
    VITE_REOWN_PROJECT_ID=$VITE_REOWN_PROJECT_ID \
    VITE_MINIMUM_SCORE=$VITE_MINIMUM_SCORE \
    bun run build

# Expose the port the Express server will listen on
# Make sure this matches the PORT environment variable passed in Terraform (var.api_port)
EXPOSE 3000

# Start ONLY the Express API server using its own start script
# Assumes a "start" script exists in packages/express/package.json (or the relevant API package)
# This avoids running the root build/swagger scripts at runtime.
CMD ["bun", "--filter=@sparta/api", "run", "start"]
