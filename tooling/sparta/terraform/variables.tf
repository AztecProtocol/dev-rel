# =============================================================================
# Variables Configuration
# =============================================================================
# This file defines all variables used in the Terraform configuration.
# Values for these variables should be provided in terraform.tfvars
# Sensitive values should never be committed to version control.
# =============================================================================

# -----------------------------------------------------------------------------
# AWS Configuration
# -----------------------------------------------------------------------------
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Deployment environment (staging/production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'"
  }
}

# -----------------------------------------------------------------------------
# Discord Bot Configuration
# -----------------------------------------------------------------------------
variable "bot_token" {
  description = "Discord bot token from Discord Developer Portal"
  type        = string
  sensitive   = true
}

variable "bot_client_id" {
  description = "Discord application client ID from Developer Portal"
  type        = string
  sensitive   = true
}

variable "guild_id" {
  description = "Discord server (guild) ID where the bot will operate"
  type        = string
}

# -----------------------------------------------------------------------------
# Ethereum Configuration
# -----------------------------------------------------------------------------
variable "ethereum_host" {
  description = "Ethereum node URL for blockchain interactions"
  type        = string
}

variable "minter_private_key" {
  description = "Ethereum wallet private key for minting tokens"
  type        = string
  sensitive   = true
}

variable "withdrawer_address" {
  description = "Ethereum wallet address for withdrawing funds"
  type        = string
}

variable "ethereum_registry_address" {
  description = "Ethereum rollup contract address for L2 interactions"
  type        = string
}

variable "l1_chain_id" {
  description = "Ethereum network chain ID"
  type        = string
}

variable "funder_amount" {
  description = "Default ETH value for transactions"
  type        = string
  default     = "20ether"
}

variable "funder_address_private_key" {
  description = "Ethereum wallet private key for funding"
  type        = string
  sensitive   = true
}

variable "minimum_stake" {
  description = "Minimum stake amount for staking"
  type        = string
}

variable "approval_amount" {
  description = "Approval amount for staking"
  type        = string
}

# -----------------------------------------------------------------------------
# SSH Configuration
# -----------------------------------------------------------------------------
variable "ssh_public_key" {
  description = "Public SSH key for accessing EC2 instances"
  type        = string
}
