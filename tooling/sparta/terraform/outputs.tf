# -----------------------------------------------------------------------------
# ECS Service Outputs
# -----------------------------------------------------------------------------
output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.sparta_discord_bot.name
}

output "ecs_desired_count" {
  description = "Desired number of tasks running"
  value       = aws_ecs_service.sparta_discord_bot.desired_count
}

# -----------------------------------------------------------------------------
# Task Definition Outputs
# -----------------------------------------------------------------------------
output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.sparta_discord_bot.arn
}

output "task_definition_revision" {
  description = "Latest revision of the task definition"
  value       = aws_ecs_task_definition.sparta_discord_bot.revision
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Outputs
# -----------------------------------------------------------------------------
output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.sparta_discord_bot_logs.name
}
