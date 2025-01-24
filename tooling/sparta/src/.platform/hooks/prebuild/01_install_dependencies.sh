#!/bin/bash
echo "export ENVIRONMENT=${ENVIRONMENT}" >> /etc/profile.d/eb_env.sh
echo "export AWS_REGION=${AWS_REGION}" >> /etc/profile.d/eb_env.sh

# Update system packages
sudo yum update -y
sudo yum install -y docker

# Install and configure Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -a -G docker webapp
sudo usermod -a -G docker ec2-user

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source /root/.bashrc
foundryup

# Verify installations
echo "Verifying installations..."
docker --version || echo "Docker not installed"
source /etc/profile.d/foundry.sh && cast --version || echo "Foundry not installed"
