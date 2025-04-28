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
  description = "Deployment environment (development/production)"
  type        = string
  validation {
    condition     = contains(["development", "production"], var.environment)
    error_message = "Environment must be either 'development' or 'production'"
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

variable "passport_verified_role_id" {
  description = "Discord role ID for users verified with Passport"
  type        = string
}

variable "passport_high_scorer_role_id" {
  description = "Discord role ID for users with high Passport scores"
  type        = string
}

variable "minimum_score" {
  description = "Minimum Passport score required for verification"
  type        = number
  default     = 10
}

variable "high_score_threshold" {
  description = "Score threshold for high scorer role"
  type        = number
  default     = 1000
}

# -----------------------------------------------------------------------------
# Gitcoin Passport Configuration
# -----------------------------------------------------------------------------
variable "passport_api_key" {
  description = "API Key for Gitcoin Passport API v2"
  type        = string
  sensitive   = true
}

variable "passport_scorer_id" {
  description = "Scorer ID from Gitcoin Passport"
  type        = string
}

# -----------------------------------------------------------------------------
# Ethereum Configuration
# -----------------------------------------------------------------------------
variable "ethereum_host" {
  description = "Ethereum node URL for blockchain interactions"
  type        = string
}

variable "staking_asset_handler_address" {
  description = "Ethereum staking asset handler contract address for L2 interactions"
  type        = string
}

variable "l1_chain_id" {
  description = "Ethereum network chain ID"
  type        = string
}

variable "funder_amount" {
  description = "Default ETH value for transactions"
  type        = string
  default     = "0.1"
}

variable "funder_address_private_key" {
  description = "Ethereum wallet private key for funding"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Web App Configuration
# -----------------------------------------------------------------------------
variable "vite_reown_project_id" {
  description = "Project ID for Reown integration"
  type        = string
}

# -----------------------------------------------------------------------------
# DynamoDB Configuration
# -----------------------------------------------------------------------------

variable "local_dynamo_db" {
  description = "Whether to use a local DynamoDB instance"
  type        = bool
  default     = false
}

variable "dynamodb_local_endpoint" {
  description = "Endpoint URL for local DynamoDB"
  type        = string
  default     = "http://localhost:8000"
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
variable "log_level" {
  description = "Log level for the application (trace, debug, info, warn, error, fatal)"
  type        = string
  default     = "info"
}

variable "log_pretty_print" {
  description = "Enable pretty printing for logs (recommended false for production)"
  type        = bool
  default     = false
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets (must match number of AZs)"
  type        = list(string)
  default     = ["10.10.101.0/24", "10.10.102.0/24"]
}

# variable "acm_certificate_arn" { ... } # REMOVED - Not needed for HTTP-only setup

# variable "api_domain_name" {
#   description = "Domain name for the API"
#   type        = string
# }

# -----------------------------------------------------------------------------
# Networking Configuration
# -----------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.10.0.0/16"
}

variable "availability_zones" {
  description = "List of Availability Zones to use for subnets"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b"] # Example for eu-west-2, adjust as needed
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets (must match number of AZs)"
  type        = list(string)
  default     = ["10.10.1.0/24", "10.10.2.0/24"]
}

# -----------------------------------------------------------------------------
# API Service Configuration
# -----------------------------------------------------------------------------
variable "api_port" {
  description = "Port the API container listens on"
  type        = number
  default     = 3000
}

variable "api_desired_count" {
  description = "Desired number of tasks for the API service"
  type        = number
  default     = 1 # Start with 1, can be overridden
}

variable "api_cpu" {
  description = "CPU units to allocate for the API task (e.g., 256 = 0.25 vCPU)"
  type        = string # Fargate uses string values for CPU/Memory
  default     = "256"
}

variable "api_memory" {
  description = "Memory to allocate for the API task in MiB (e.g., 512)"
  type        = string
  default     = "512"
}

# =============================================================================
# Outputs (Consider adding outputs for easy access to created resources)
# =============================================================================
# output "vpc_id" { value = aws_vpc.sparta_vpc.id }
# output "alb_dns_name" { value = aws_lb.sparta_alb.dns_name }
# ... etc.
