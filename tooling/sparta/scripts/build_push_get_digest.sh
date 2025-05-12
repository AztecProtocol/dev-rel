#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Input Variables (Passed from Terraform) ---
AWS_REGION="$1"
ECR_REPOSITORY_URL="$2"
DOCKERFILE_DIR="$3" # Directory containing the Dockerfile relative to where script runs
# The URL for the frontend, needed at build time by Vite
VITE_APP_API_URL="$4"
VITE_MINIMUM_SCORE="$6"

# --- Derived Variables ---
# Extract repository name from URL (e.g., 123456789012.dkr.ecr.eu-west-2.amazonaws.com/sparta-development-api -> sparta-development-api)
ECR_REPOSITORY_NAME=$(basename "$ECR_REPOSITORY_URL")

# --- Script Logic ---

# 1. Login to ECR (silence stdout)
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REPOSITORY_URL}" > /dev/null

# 2. Build Docker image (silence stdout)
# Pass the frontend URL as a build argument
(cd "${DOCKERFILE_DIR}" && docker build \
    --platform linux/amd64 \
    --build-arg VITE_APP_API_URL="${VITE_APP_API_URL}" \
    --build-arg VITE_REOWN_PROJECT_ID="${VITE_REOWN_PROJECT_ID}" \
    --build-arg VITE_MINIMUM_SCORE="${VITE_MINIMUM_SCORE}" \
    -t "${ECR_REPOSITORY_URL}:latest" \
    -f Dockerfile .) > /dev/null

# 3. Push Docker image (silence stdout)
docker push "${ECR_REPOSITORY_URL}:latest" > /dev/null

# 4. Retrieve image digest (output needed for variable assignment)
IMAGE_DIGEST=$(aws ecr describe-images --repository-name "${ECR_REPOSITORY_NAME}" --image-ids imageTag=latest --query 'imageDetails[0].imageDigest' --output text --region "${AWS_REGION}")

# 5. Check if digest was retrieved
if [ -z "$IMAGE_DIGEST" ]; then
  echo "Error: Could not retrieve image digest for ${ECR_REPOSITORY_URL}:latest" >&2
  exit 1
fi

# --- Output JSON for Terraform --- 
# THIS MUST BE THE ONLY THING ON STDOUT
echo "{\"image_digest\":\"${IMAGE_DIGEST}\"}" 
