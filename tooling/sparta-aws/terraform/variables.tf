variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "environment" {
  description = "Environment (development/production)"
  type        = string
  default     = "development"
}

variable "lambda_memory" {
  description = "Lambda function memory size"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda function timeout"
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
} 
