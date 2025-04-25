# -----------------------------------------------------------------------------
# ECS Service Outputs
# -----------------------------------------------------------------------------
output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.sparta_api.name
}

output "ecs_desired_count" {
  description = "Desired number of tasks running"
  value       = aws_ecs_service.sparta_api.desired_count
}
# ECR Repository
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.sparta_api.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.sparta_api.name
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository" 
  value       = aws_ecr_repository.sparta_api.arn
}

output "ecr_repository_registry_id" {
  description = "Registry ID where the repository was created"
  value       = aws_ecr_repository.sparta_api.registry_id
}

output "ecr_image_latest_tag" {
  description = "Latest image tag in the ECR repository"
  value       = "${aws_ecr_repository.sparta_api.repository_url}:latest"
}

# -----------------------------------------------------------------------------
# Task Definition Outputs
# -----------------------------------------------------------------------------
output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.sparta_api.arn
}

output "task_definition_revision" {
  description = "Latest revision of the task definition"
  value       = aws_ecs_task_definition.sparta_api.revision
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Outputs
# -----------------------------------------------------------------------------
output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.sparta_api_logs.name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer (for Route53 Alias records)"
  value       = aws_lb.sparta_alb.zone_id
}

# output "alb_listener_arn" { ... } # REMOVED - No HTTPS listener

# --- Frontend Outputs Removed ---
