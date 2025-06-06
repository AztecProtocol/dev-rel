# -----------------------------------------------------------------------------
# ECS Service Outputs
# -----------------------------------------------------------------------------
output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.sparta_api.name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.sparta_cluster.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.sparta_cluster.arn
}

output "ecs_service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.sparta_api.id
}

output "ecs_desired_count" {
  description = "Desired number of tasks running"
  value       = aws_ecs_service.sparta_api.desired_count
}

# -----------------------------------------------------------------------------
# Application Load Balancer Outputs
# -----------------------------------------------------------------------------
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.sparta_alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer (for Route53 Alias records)"
  value       = aws_lb.sparta_alb.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.sparta_alb.arn
}

output "alb_target_group_arn" {
  description = "ARN of the ALB target group"
  value       = aws_lb_target_group.api_tg.arn
}

output "api_url" {
  description = "Public API URL"
  value       = "http://${aws_lb.sparta_alb.dns_name}"
}

output "health_check_url" {
  description = "Health check endpoint URL"
  value       = "http://${aws_lb.sparta_alb.dns_name}/health"
}

# -----------------------------------------------------------------------------
# ECR Repository Outputs
# -----------------------------------------------------------------------------
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

output "task_definition_family" {
  description = "Family name of the task definition"
  value       = aws_ecs_task_definition.sparta_api.family
}

# -----------------------------------------------------------------------------
# VPC and Networking Outputs
# -----------------------------------------------------------------------------
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.sparta_vpc.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.sparta_vpc.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.sparta_public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.sparta_private_subnets[*].id
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = aws_nat_gateway.sparta_nat_gw.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.sparta_igw.id
}

# -----------------------------------------------------------------------------
# Security Groups Outputs
# -----------------------------------------------------------------------------
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb_sg.id
}

output "api_service_security_group_id" {
  description = "ID of the API service security group"
  value       = aws_security_group.api_service_sg.id
}

# -----------------------------------------------------------------------------
# DynamoDB Tables Outputs
# -----------------------------------------------------------------------------
output "dynamodb_node_operators_table_name" {
  description = "Name of the node operators DynamoDB table"
  value       = aws_dynamodb_table.sparta_node_operators.name
}

output "dynamodb_node_operators_table_arn" {
  description = "ARN of the node operators DynamoDB table"
  value       = aws_dynamodb_table.sparta_node_operators.arn
}

output "dynamodb_validators_table_name" {
  description = "Name of the validators DynamoDB table"
  value       = aws_dynamodb_table.sparta_validators.name
}

output "dynamodb_validators_table_arn" {
  description = "ARN of the validators DynamoDB table"
  value       = aws_dynamodb_table.sparta_validators.arn
}

output "dynamodb_validator_history_table_name" {
  description = "Name of the validator history DynamoDB table"
  value       = aws_dynamodb_table.sparta_validator_history.name
}

output "dynamodb_validator_history_table_arn" {
  description = "ARN of the validator history DynamoDB table"
  value       = aws_dynamodb_table.sparta_validator_history.arn
}

output "dynamodb_network_stats_table_name" {
  description = "Name of the network stats DynamoDB table"
  value       = aws_dynamodb_table.sparta_network_stats.name
}

output "dynamodb_network_stats_table_arn" {
  description = "ARN of the network stats DynamoDB table"
  value       = aws_dynamodb_table.sparta_network_stats.arn
}

# -----------------------------------------------------------------------------
# IAM Roles Outputs
# -----------------------------------------------------------------------------
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "api_task_role_arn" {
  description = "ARN of the API task role"
  value       = aws_iam_role.api_task_role.arn
}

# -----------------------------------------------------------------------------
# Auto Scaling Outputs
# -----------------------------------------------------------------------------
output "auto_scaling_target_arn" {
  description = "ARN of the auto scaling target"
  value       = aws_appautoscaling_target.api_scaling_target.id
}

output "cpu_scaling_policy_arn" {
  description = "ARN of the CPU scaling policy"
  value       = aws_appautoscaling_policy.api_scale_cpu.arn
}

output "memory_scaling_policy_arn" {
  description = "ARN of the memory scaling policy"
  value       = aws_appautoscaling_policy.api_scale_memory.arn
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Outputs
# -----------------------------------------------------------------------------
output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.sparta_api_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.sparta_api_logs.arn
}

# -----------------------------------------------------------------------------
# Validator Monitor Lambda Function Outputs
# -----------------------------------------------------------------------------
output "validator_monitor_function_name" {
  description = "Name of the validator monitor Lambda function"
  value       = aws_lambda_function.validator_monitor.function_name
}

output "validator_monitor_function_arn" {
  description = "ARN of the validator monitor Lambda function"
  value       = aws_lambda_function.validator_monitor.arn
}

output "validator_monitor_role_arn" {
  description = "ARN of the validator monitor Lambda execution role"
  value       = aws_iam_role.validator_monitor_role.arn
}

output "validator_monitor_log_group" {
  description = "Name of the CloudWatch log group for the validator monitor Lambda function"
  value       = aws_cloudwatch_log_group.validator_monitor_logs.name
}

output "hourly_rule_name" {
  description = "Name of the EventBridge rule that triggers the validator monitor Lambda function"
  value       = aws_cloudwatch_event_rule.hourly_validator_check.name
}

output "hourly_rule_arn" {
  description = "ARN of the EventBridge rule that triggers the validator monitor Lambda function"
  value       = aws_cloudwatch_event_rule.hourly_validator_check.arn
}

# -----------------------------------------------------------------------------
# Configuration Outputs
# -----------------------------------------------------------------------------
output "aztec_rpc_url" {
  description = "URL of the Aztec RPC"
  value       = var.aztec_rpc_url
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

# -----------------------------------------------------------------------------
# Useful Commands and URLs
# -----------------------------------------------------------------------------
output "useful_commands" {
  description = "Useful AWS CLI commands for managing this infrastructure"
  value = {
    # ECS Commands
    view_service_status = "aws ecs describe-services --cluster ${aws_ecs_cluster.sparta_cluster.name} --services ${aws_ecs_service.sparta_api.name} --region ${var.aws_region}"
    list_running_tasks = "aws ecs list-tasks --cluster ${aws_ecs_cluster.sparta_cluster.name} --service-name ${aws_ecs_service.sparta_api.name} --region ${var.aws_region}"
    view_service_events = "aws ecs describe-services --cluster ${aws_ecs_cluster.sparta_cluster.name} --services ${aws_ecs_service.sparta_api.name} --region ${var.aws_region} --query 'services[0].events[0:10]'"
    
    # CloudWatch Logs
    view_application_logs = "aws logs tail ${aws_cloudwatch_log_group.sparta_api_logs.name} --follow --region ${var.aws_region}"
    view_lambda_logs = "aws logs tail ${aws_cloudwatch_log_group.validator_monitor_logs.name} --follow --region ${var.aws_region}"
    
    # ECR Commands  
    ecr_login = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.sparta_api.repository_url}"
    build_and_push = "docker build -t ${aws_ecr_repository.sparta_api.name} . && docker tag ${aws_ecr_repository.sparta_api.name}:latest ${aws_ecr_repository.sparta_api.repository_url}:latest && docker push ${aws_ecr_repository.sparta_api.repository_url}:latest"
    
    # DynamoDB Commands
    list_validators = "aws dynamodb scan --table-name ${aws_dynamodb_table.sparta_validators.name} --region ${var.aws_region} --limit 10"
    list_node_operators = "aws dynamodb scan --table-name ${aws_dynamodb_table.sparta_node_operators.name} --region ${var.aws_region} --limit 10"
  }
}

output "monitoring_urls" {
  description = "Useful monitoring and management URLs"
  value = {
    cloudwatch_logs = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#logsV2:log-groups/log-group/${replace(aws_cloudwatch_log_group.sparta_api_logs.name, "/", "$252F")}"
    ecs_service = "https://${var.aws_region}.console.aws.amazon.com/ecs/home?region=${var.aws_region}#/clusters/${aws_ecs_cluster.sparta_cluster.name}/services/${aws_ecs_service.sparta_api.name}/details"
    load_balancer = "https://${var.aws_region}.console.aws.amazon.com/ec2/v2/home?region=${var.aws_region}#LoadBalancers:search=${aws_lb.sparta_alb.name}"
    dynamodb_validators = "https://${var.aws_region}.console.aws.amazon.com/dynamodbv2/home?region=${var.aws_region}#table?name=${aws_dynamodb_table.sparta_validators.name}"
    lambda_function = "https://${var.aws_region}.console.aws.amazon.com/lambda/home?region=${var.aws_region}#/functions/${aws_lambda_function.validator_monitor.function_name}"
  }
}

# -----------------------------------------------------------------------------
# Resource Summary
# -----------------------------------------------------------------------------
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    environment = var.environment
    region = var.aws_region
    vpc_cidr = aws_vpc.sparta_vpc.cidr_block
    availability_zones = length(aws_subnet.sparta_private_subnets)
    ecs_cluster = aws_ecs_cluster.sparta_cluster.name
    api_endpoint = "http://${aws_lb.sparta_alb.dns_name}"
    dynamodb_tables = [
      aws_dynamodb_table.sparta_validators.name,
      aws_dynamodb_table.sparta_node_operators.name,
      aws_dynamodb_table.sparta_validator_history.name,
      aws_dynamodb_table.sparta_network_stats.name
    ]
    auto_scaling_enabled = true
    lambda_functions = [aws_lambda_function.validator_monitor.function_name]
  }
}