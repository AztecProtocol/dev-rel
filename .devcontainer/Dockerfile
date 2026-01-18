FROM --platform=linux/amd64 node:lts-bookworm-slim

# 🛡️ SHELL: Setting strict flags for better error handling in pipes
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# 🚀 OPTIMIZATION:
# 1. Combine update + install + cleanup in ONE layer.
# 2. Use --no-install-recommends to avoid bloat.
# 3. Explicitly remove apt cache files to reduce image size.
# 4. Removed 'bash', 'tar', 'gzip' as they are built-in to Bookworm.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    git \
    libc++-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
