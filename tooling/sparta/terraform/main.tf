terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Using AWS Provider version 5.x for latest features
    }
  }

  backend "s3" {
    bucket = "sparta-tf-state"
    key    = "sparta/terraform"
    region = "eu-west-2"
  }
}

provider "aws" {
  profile = "default"
  region  = var.aws_region
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecs_task_execution_role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Principal = {
        Service = "ecs-tasks.amazonaws.com",
      },
      Effect = "Allow",
      Sid    = "",
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add CloudWatch logs permissions
resource "aws_iam_role_policy" "cloudwatch_logs_policy" {
  name = "cloudwatch-logs-policy-${var.environment}"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/fargate/service/${var.environment}/sparta-discord-bot:*",
          "arn:aws:logs:${var.aws_region}:*:log-group:/fargate/service/${var.environment}/sparta-discord-bot:*:*"
        ]
      }
    ]
  })
}

# Add ECR pull permissions
resource "aws_iam_role_policy" "ecr_pull_policy" {
  name = "ecr_pull_policy-${var.environment}"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Create ECR Repository
resource "aws_ecr_repository" "sparta_bot" {
  name                 = "sparta-bot-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Build and push Docker image
resource "null_resource" "docker_build" {
  triggers = {
    always_run = "${timestamp()}"  # This ensures it runs on every apply
  }

  provisioner "local-exec" {
    command = <<EOT
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.sparta_bot.repository_url}
      cd ../
      docker build -t ${aws_ecr_repository.sparta_bot.repository_url}:latest .
      docker push ${aws_ecr_repository.sparta_bot.repository_url}:latest
    EOT
  }
}

# Define task definition and service.
resource "aws_ecs_task_definition" "sparta_discord_bot" {
  family                   = "sparta-discord-bot-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  container_definitions = jsonencode([
    {
      name              = "sparta-discord-bot"
      image             = "${aws_ecr_repository.sparta_bot.repository_url}:latest"
      essential         = true
      memoryReservation = 256
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/fargate/service/${var.environment}/sparta-discord-bot"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
      environment = [
        {
          name  = "BOT_TOKEN"
          value = var.bot_token
        },
        {
          name  = "BOT_CLIENT_ID"
          value = var.bot_client_id
        },
        {
          name  = "GUILD_ID"
          value = var.guild_id
        },
        {
          name  = "ETHEREUM_HOST"
          value = var.ethereum_host
        },
        {
          name  = "ETHEREUM_PRIVATE_KEY"
          value = var.ethereum_private_key
        },
        {
          name  = "ETHEREUM_ROLLUP_ADDRESS"
          value = var.ethereum_rollup_address
        },
        {
          name  = "ETHEREUM_CHAIN_ID"
          value = var.ethereum_chain_id
        },
        {
          name  = "ETHEREUM_VALUE"
          value = var.ethereum_value
        },
        {
          name  = "ETHEREUM_ADMIN_ADDRESS"
          value = var.ethereum_admin_address
        },
        {
          name  = "MINIMUM_STAKE"
          value = var.minimum_stake
        },
      ]
    }
  ])

  depends_on = [null_resource.docker_build]
}

resource "aws_ecs_service" "sparta_discord_bot" {
  name                               = "sparta-discord-bot-${var.environment}"
  cluster                            = aws_ecs_cluster.sparta_cluster.id
  launch_type                        = "FARGATE"
  desired_count                      = 1  # Run one task per AZ
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  platform_version                   = "1.4.0"
  
  task_definition = aws_ecs_task_definition.sparta_discord_bot.arn

  network_configuration {
    subnets          = aws_subnet.sparta_public_subnets[*].id
    security_groups  = [aws_security_group.sparta_sg.id]
    assign_public_ip = true
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_policy
  ]
}

# Logs
resource "aws_cloudwatch_log_group" "sparta_discord_bot_logs" {
  name              = "/fargate/service/${var.environment}/sparta-discord-bot"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "sparta_cluster" {
  name = "sparta-cluster-${var.environment}"
}

# Create a VPC
resource "aws_vpc" "sparta_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "sparta-vpc"
  }
}

# Create public subnets across multiple AZs
resource "aws_subnet" "sparta_public_subnets" {
  count             = 1
  vpc_id            = aws_vpc.sparta_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "eu-west-2a"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "sparta-public-subnet-1"
  }
}

# Create an internet gateway
resource "aws_internet_gateway" "sparta_igw" {
  vpc_id = aws_vpc.sparta_vpc.id
  tags = {
    Name = "sparta-igw"
  }
}

# Create a route table
resource "aws_route_table" "sparta_public_rt" {
  vpc_id = aws_vpc.sparta_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sparta_igw.id
  }
  tags = {
    Name = "sparta-public-rt"
  }
}

# Create route table associations for all subnets
resource "aws_route_table_association" "sparta_public_rta" {
  count          = 1
  subnet_id      = aws_subnet.sparta_public_subnets[0].id
  route_table_id = aws_route_table.sparta_public_rt.id
}

# Create a security group
resource "aws_security_group" "sparta_sg" {
  name        = "sparta-sg"
  description = "Security group for Sparta Discord bot"
  vpc_id      = aws_vpc.sparta_vpc.id

  # Allow inbound HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sparta-sg"
  }
}
