# Use a slim base image
FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY dist/ ./dist/

# Set environment variables
ENV NODE_ENV=production

# Command will be provided by ECS task definition
CMD ["node", "dist/index.js"] 
