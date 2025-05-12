terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0" # Specify minimum Terraform version

  backend "s3" {
    bucket = "sparta-terraf-state" # Ensure this bucket exists
    region = "eu-west-2"
    key    = "production/terraform.tfstate"
  }
}


provider "aws" {
  region = var.aws_region
  # Assuming credentials are configured via environment variables, IAM instance profile, or AWS config/credentials file
}

locals {
  resource_prefix = "sparta-${var.environment}"
  common_tags = {
    Environment = var.environment
    Project     = "sparta"
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# Networking
# =============================================================================

# Create a VPC
resource "aws_vpc" "sparta_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-vpc"
  })
}

# Create public subnets across multiple AZs
resource "aws_subnet" "sparta_public_subnets" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.sparta_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true # Needed for NAT Gateway and potential bastion hosts

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-public-subnet-${var.availability_zones[count.index]}"
    Tier = "public"
  })
}

# Create private subnets across multiple AZs
resource "aws_subnet" "sparta_private_subnets" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.sparta_vpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-private-subnet-${var.availability_zones[count.index]}"
    Tier = "private"
  })
}

# Create an Internet Gateway (IGW)
resource "aws_internet_gateway" "sparta_igw" {
  vpc_id = aws_vpc.sparta_vpc.id
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-igw"
  })
}

# Allocate an Elastic IP for the NAT Gateway
resource "aws_eip" "nat_eip" {
  domain = "vpc" # Changed from `vpc = true` for newer provider versions
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-nat-eip"
  })
}

# Create a NAT Gateway in the first public subnet
resource "aws_nat_gateway" "sparta_nat_gw" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.sparta_public_subnets[0].id # Place NAT GW in the first public subnet

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-nat-gw"
  })

  depends_on = [aws_internet_gateway.sparta_igw]
}

# Create a public route table
resource "aws_route_table" "sparta_public_rt" {
  vpc_id = aws_vpc.sparta_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sparta_igw.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-public-rt"
  })
}

# Associate public subnets with the public route table
resource "aws_route_table_association" "sparta_public_rta" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.sparta_public_subnets[count.index].id
  route_table_id = aws_route_table.sparta_public_rt.id
}

# Create a private route table
resource "aws_route_table" "sparta_private_rt" {
  vpc_id = aws_vpc.sparta_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.sparta_nat_gw.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-private-rt"
  })
}

# Associate private subnets with the private route table
resource "aws_route_table_association" "sparta_private_rta" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.sparta_private_subnets[count.index].id
  route_table_id = aws_route_table.sparta_private_rt.id
}


# =============================================================================
# Security Groups
# =============================================================================

# Security Group for the Application Load Balancer (ALB)
resource "aws_security_group" "alb_sg" {
  name        = "${local.resource_prefix}-alb-sg"
  description = "Allow HTTP/HTTPS inbound traffic to ALB"
  vpc_id      = aws_vpc.sparta_vpc.id

  ingress {
    description = "Allow HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-alb-sg"
  })
}

# Security Group for the API ECS Service (Fargate)
resource "aws_security_group" "api_service_sg" {
  name        = "${local.resource_prefix}-api-service-sg"
  description = "Allow inbound traffic from ALB to API service"
  vpc_id      = aws_vpc.sparta_vpc.id

  ingress {
    description     = "Allow traffic from ALB"
    from_port       = var.api_port # Port the container listens on (e.g., 3000)
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id] # Only allow traffic from the ALB SG
  }

  egress {
    description = "Allow all outbound traffic (for NAT GW)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-service-sg"
  })
}

# =============================================================================
# IAM Roles & Policies
# =============================================================================

# IAM Role for ECS Task Execution (used by ECS Agent to pull images, write logs)
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.resource_prefix}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  # Standard AWS managed policy for basic ECS task execution needs
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for API ECS Task (used by the application container)
resource "aws_iam_role" "api_task_role" {
  name = "${local.resource_prefix}-api-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
    }]
  })
  tags = local.common_tags
}

# IAM Policy allowing API Task Role to access DynamoDB
resource "aws_iam_policy" "dynamodb_access_policy" {
  name        = "${local.resource_prefix}-dynamodb-access-policy"
  description = "Policy for accessing DynamoDB users tables"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem"
        ],
        # Grant access to both tables and their indexes
        Resource = [
          # Users table (referenced via Terraform resource)
          aws_dynamodb_table.sparta_users.arn,
          "${aws_dynamodb_table.sparta_users.arn}/index/*",
          # Node Operators table
          aws_dynamodb_table.sparta_node_operators.arn,
          "${aws_dynamodb_table.sparta_node_operators.arn}/index/*"
        ]
      }
      # Add statements here if the API needs access to other AWS resources
    ]
  })
  tags = local.common_tags
}

# Attach DynamoDB policy to the API Task Role
resource "aws_iam_role_policy_attachment" "api_dynamodb_policy_attachment" {
  role       = aws_iam_role.api_task_role.name
  policy_arn = aws_iam_policy.dynamodb_access_policy.arn
}

# =============================================================================
# Database (DynamoDB)
# =============================================================================

# Add the 'users' table definition
resource "aws_dynamodb_table" "sparta_users" {
  name           = "${local.resource_prefix}-users" # Use prefix for consistency
  billing_mode   = "PAY_PER_REQUEST"          # Use pay-per-request like sessions table

  # Define attributes used in keys/indexes
  attribute {
    name = "discordUserId"
    type = "S"
  }
  attribute {
    name = "walletAddress"
    type = "S"
  }
  attribute {
    name = "verificationId"
    type = "S"
  }

  # Define the primary hash key
  hash_key = "discordUserId"

  # Define Global Secondary Indexes
  global_secondary_index {
    name            = "walletAddress-index"
    hash_key        = "walletAddress"
    projection_type = "INCLUDE"
    non_key_attributes = ["discordUserId", "discordUsername"] # Attributes to include
    # PAY_PER_REQUEST billing mode applies to GSIs as well
  }

  global_secondary_index {
    name            = "verificationId-index"
    hash_key        = "verificationId"
    projection_type = "ALL" # Project all attributes
    # PAY_PER_REQUEST billing mode applies to GSIs as well
  }

  # Enable Point-in-Time Recovery for backups (Recommended)
  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-users-table"
  })
}

# Add the 'node operators' table definition
resource "aws_dynamodb_table" "sparta_node_operators" {
  name           = "${local.resource_prefix}-node-operators" # Use prefix for consistency
  billing_mode   = "PAY_PER_REQUEST"                        # Use pay-per-request 

  # Define attributes used in keys/indexes
  attribute {
    name = "discordId"
    type = "S"
  }
  attribute {
    name = "walletAddress"
    type = "S"
  }

  # Define the primary hash key
  hash_key = "discordId"

  # Define Global Secondary Indexes
  global_secondary_index {
    name            = "WalletAddressIndex"
    hash_key        = "walletAddress"
    projection_type = "ALL" # Project all attributes
    # PAY_PER_REQUEST billing mode applies to GSIs as well
  }

  # Enable Point-in-Time Recovery for backups (Recommended)
  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-node-operators-table"
  })
}

# =============================================================================
# Backend Service (API - Express App)
# =============================================================================

# ECR Repository for the API Docker image
resource "aws_ecr_repository" "sparta_api" {
  name                 = "${local.resource_prefix}-api"
  image_tag_mutability = "MUTABLE" # Or IMMUTABLE for better versioning control
  force_delete         = true      # Use with caution in production

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-ecr"
  })
}

# --- Use external data source to build, push, and get image digest ---
data "external" "api_docker_build_push_digest" {
  program = ["bash", "${path.module}/../scripts/build_push_get_digest.sh", 
    var.aws_region, 
    aws_ecr_repository.sparta_api.repository_url, 
    "${path.module}/../", 
    "http://${aws_lb.sparta_alb.dns_name}"
  ] # Pass region, repo url, Dockerfile dir, frontend URL, and VITE variables

  # Ensure ECR repository exists before running the script
  depends_on = [aws_ecr_repository.sparta_api]
}
# --- End external data source ---

# CloudWatch Log Group for the API Service
resource "aws_cloudwatch_log_group" "sparta_api_logs" {
  name              = "/ecs/${local.resource_prefix}-api"
  retention_in_days = 30 # Adjust retention as needed

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-logs"
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "sparta_cluster" {
  name = "${local.resource_prefix}-cluster"

  # Enable Container Insights for monitoring
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-cluster"
  })
}

# ECS Task Definition for the API
resource "aws_ecs_task_definition" "sparta_api" {
  family                   = "${local.resource_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu       # From variables
  memory                   = var.api_memory    # From variables
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn # Role for ECS agent
  task_role_arn            = aws_iam_role.api_task_role.arn           # Role for the application container

  container_definitions = jsonencode([
    {
      name      = "${local.resource_prefix}-api-container"
      # Reference the image using the digest from the external data source
      image     = "${aws_ecr_repository.sparta_api.repository_url}@${data.external.api_docker_build_push_digest.result.image_digest}"
      essential = true
      # Map the container port
      portMappings = [
        {
          containerPort = var.api_port # e.g., 3000
          hostPort      = var.api_port # Required for awsvpc mode with ALB
          protocol      = "tcp"
        }
      ]
      # Configure logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.sparta_api_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api" # Prefix for log streams
        }
      }
      # Pass environment variables needed by the API application
      environment = [
        { name = "NODE_ENV", value = var.environment }, # Pass environment context
        { name = "PORT", value = tostring(var.api_port) },
        { name = "API_PORT", value = tostring(var.api_port) },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "BACKEND_API_KEY", value = var.backend_api_key },
        { name = "LOCAL_DYNAMO_DB", value = "false" },
        { name = "DYNAMODB_LOCAL_ENDPOINT", value = var.dynamodb_local_endpoint },
        { name = "API_HOST", value = "0.0.0.0" }, # Make sure Express listens on 0.0.0.0 inside container
        { name = "BOT_TOKEN", value = var.bot_token },
        { name = "BOT_CLIENT_ID", value = var.bot_client_id },
        { name = "GUILD_ID", value = var.guild_id },
        { name = "ETHEREUM_HOST", value = var.ethereum_host },
        { name = "STAKING_ASSET_HANDLER_ADDRESS", value = var.staking_asset_handler_address },
        { name = "L1_CHAIN_ID", value = var.l1_chain_id },
        { name = "LOG_LEVEL", value = var.log_level },
        { name = "LOG_PRETTY_PRINT", value = var.log_pretty_print ? "true" : "false" },
        { name = "VITE_APP_API_URL", value = "http://${aws_lb.sparta_alb.dns_name}" },
        { name = "CORS_ALLOWED_ORIGINS", value = "http://${aws_lb.sparta_alb.dns_name}" },
        { name = "USERS_TABLE_NAME", value = aws_dynamodb_table.sparta_users.name },
        { name = "NODE_OPERATORS_TABLE_NAME", value = aws_dynamodb_table.sparta_node_operators.name }
      ]
      # secrets = [ # Example using Secrets Manager
      #   { name = "BOT_TOKEN", valueFrom = "<ARN of Secrets Manager secret for BOT_TOKEN>" }
      # ]
    }
  ])

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-task-def"
  })

  # Task definition implicitly depends on the external data source now because it uses its result.
  # depends_on = [data.external.api_docker_build_push_digest] # Optional explicit dependency
}

# Application Load Balancer (ALB) for the API
resource "aws_lb" "sparta_alb" {
  name               = "${local.resource_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.sparta_public_subnets[*].id # Place ALB in public subnets

  enable_deletion_protection = false # Set to true for production

  # access_logs {
  #   bucket  = aws_s3_bucket.lb_logs.id # Store ALB access logs in S3
  #   prefix  = "${local.resource_prefix}-alb-logs"
  #   enabled = true
  # }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-alb"
  })
}

# ALB Target Group for the API ECS Service
resource "aws_lb_target_group" "api_tg" {
  name        = "${local.resource_prefix}-api-tg"
  port        = var.api_port # Port the container listens on
  protocol    = "HTTP"       # Traffic from ALB to container is HTTP
  vpc_id      = aws_vpc.sparta_vpc.id
  target_type = "ip" # Required for Fargate

  health_check {
    enabled             = true
    # **IMPORTANT**: Ensure your API has a /health endpoint returning 200 OK
    # If not, change this path or disable the health check (not recommended)
    path                = "/health"
    protocol            = "HTTP"
    port                = "traffic-port" # Check the container port
    matcher             = "200"          # Expect HTTP 200 status code
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  # Stickiness (optional)
  # stickiness {
  #   type            = "lb_cookie"
  #   cookie_duration = 86400 # 1 day
  #   enabled         = true
  # }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-tg"
  })
}

# ALB Listener for HTTP (Port 80) - Forwards to API Target Group
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.sparta_alb.arn
  port              = 80
  protocol          = "HTTP"

  # Default action: Forward HTTP traffic directly to the API target group
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
}

# ECS Service for the API
resource "aws_ecs_service" "sparta_api" {
  name                               = "${local.resource_prefix}-api-service"
  cluster                            = aws_ecs_cluster.sparta_cluster.id
  task_definition                    = aws_ecs_task_definition.sparta_api.arn
  desired_count                      = var.api_desired_count # From variables (e.g., 2 for HA)
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST" # Use the latest Fargate platform version

  network_configuration {
    subnets          = aws_subnet.sparta_private_subnets[*].id # Run tasks in PRIVATE subnets
    security_groups  = [aws_security_group.api_service_sg.id] # Attach the service security group
    assign_public_ip = false # Tasks do not need public IPs
  }

  # Register service with the ALB Target Group
  load_balancer {
    target_group_arn = aws_lb_target_group.api_tg.arn
    container_name   = "${local.resource_prefix}-api-container" # Must match container name in task def
    container_port   = var.api_port # Must match container port in task def
  }

  # depends_on = [aws_lb_listener.https] # REMOVED dependency on HTTPS listener
  depends_on = [aws_lb_listener.http] # Depend on the HTTP listener

  # Grace period for tasks to start serving traffic before old tasks are stopped
  health_check_grace_period_seconds = 60

  # Deployment settings
  deployment_maximum_percent         = 200 # Allow double the desired count during deployments
  deployment_minimum_healthy_percent = 50  # Keep at least 50% running during deployments

  # Enable ECS Service Connect or Service Discovery if needed for internal communication

  # Enable deployment circuit breaker with rollback
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-api-service"
  })
}

# Auto Scaling for the API ECS Service (Optional but Recommended)
resource "aws_appautoscaling_target" "api_scaling_target" {
  max_capacity       = 4 # Maximum number of tasks
  min_capacity       = var.api_desired_count # Minimum number of tasks (matches desired_count initially)
  resource_id        = "service/${aws_ecs_cluster.sparta_cluster.name}/${aws_ecs_service.sparta_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on CPU Utilization
resource "aws_appautoscaling_policy" "api_scale_cpu" {
  name               = "${local.resource_prefix}-scale-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_scaling_target.resource_id
  scalable_dimension = aws_appautoscaling_target.api_scaling_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_scaling_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 75.0 # Target average CPU utilization (scale out if higher)
    scale_in_cooldown  = 300  # Cooldown period (seconds) before scaling in
    scale_out_cooldown = 60   # Cooldown period (seconds) before scaling out again
  }
}

# Scale based on Memory Utilization (Optional)
resource "aws_appautoscaling_policy" "api_scale_memory" {
  name               = "${local.resource_prefix}-scale-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_scaling_target.resource_id
  scalable_dimension = aws_appautoscaling_target.api_scaling_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_scaling_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 75.0 # Target average Memory utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# =============================================================================
# DNS (Optional - Requires Route 53 Hosted Zone)
# =============================================================================

# data "aws_route53_zone" "primary" {
#   count = var.api_domain_name != "" || var.frontend_domain_name != "" ? 1 : 0
#   # Assumes you have a hosted zone configured in Route 53
#   # Example: name = "yourdomain.com." # Your domain name with trailing dot
#   name         = "<YOUR_HOSTED_ZONE_NAME>." # Replace with your hosted zone name
#   private_zone = false
# }

# # Route 53 Alias record for the API (ALB)
# resource "aws_route53_record" "api" {
#   count = var.api_domain_name != "" ? 1 : 0

#   zone_id = data.aws_route53_zone.primary[0].zone_id
#   name    = var.api_domain_name
#   type    = "A"

#   alias {
#     name                   = aws_lb.sparta_alb.dns_name
#     zone_id                = aws_lb.sparta_alb.zone_id
#     evaluate_target_health = true # Route traffic based on ALB health checks
#   }
# }

# # Route 53 Alias record for the Frontend (CloudFront)
# resource "aws_route53_record" "frontend" {
#   count = var.frontend_domain_name != "" ? 1 : 0

#   zone_id = data.aws_route53_zone.primary[0].zone_id
#   name    = var.frontend_domain_name
#   type    = "A"

#   alias {
#     name                   = aws_cloudfront_distribution.frontend_distribution.domain_name
#     zone_id                = aws_cloudfront_distribution.frontend_distribution.hosted_zone_id
#     evaluate_target_health = false # Cannot evaluate health for CloudFront aliases
#   }
# }

# =============================================================================
# Outputs
# =============================================================================

output "api_ecr_repository_url" {
  description = "The URL of the ECR repository for the API image"
  value       = aws_ecr_repository.sparta_api.repository_url
}

output "api_load_balancer_dns" {
  description = "The DNS name of the Application Load Balancer for the API"
  value       = aws_lb.sparta_alb.dns_name
}

output "api_service_name" {
  description = "The name of the ECS service for the API"
  value       = aws_ecs_service.sparta_api.name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.sparta_cluster.name
}

output "users_table_name" {
  description = "The name of the DynamoDB table for users"
  value       = aws_dynamodb_table.sparta_users.name
} 

output "node_operators_table_name" {
  description = "The name of the DynamoDB table for node operators"
  value       = aws_dynamodb_table.sparta_node_operators.name
}
