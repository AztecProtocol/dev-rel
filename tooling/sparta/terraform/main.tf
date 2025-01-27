terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Using AWS Provider version 5.x for latest features
    }
  }

  backend "s3" {
    bucket         = "sparta-tf-state"
    key            = "sparta/terraform"
    region         = "eu-west-2"
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecs_task_execution_role"

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

# Add ECR pull permissions
resource "aws_iam_role_policy" "ecr_pull_policy" {
  name = "ecr_pull_policy"
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
  name                 = "sparta-bot"
  image_tag_mutability = "MUTABLE"
  force_delete = true

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
      aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin ${aws_ecr_repository.sparta_bot.repository_url}
      cd ../
      docker build -t ${aws_ecr_repository.sparta_bot.repository_url}:latest .
      docker push ${aws_ecr_repository.sparta_bot.repository_url}:latest
    EOT
  }
}

# Define task definition and service.
resource "aws_ecs_task_definition" "sparta_discord_bot" {
  family                   = "sparta-discord-bot"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  container_definitions = jsonencode([
    {
      name               = "sparta-discord-bot"
      image              = "${aws_ecr_repository.sparta_bot.repository_url}:latest"
      essential          = true
      memoryReservation  = 256
      logConfiguration   = {
        logDriver = "awslogs"
        options   = {
          "awslogs-group"         = "/fargate/service/sparta-discord-bot"
          "awslogs-region"        = "eu-west-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  depends_on = [null_resource.docker_build]
}

resource "aws_ecs_service" "sparta_discord_bot" {
  name                               = "sparta-discord-bot"
  cluster                            = aws_ecs_cluster.sparta_cluster.id
  launch_type                        = "FARGATE"
  desired_count                      = 3  # Run one task per AZ
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
  name              = "/fargate/service/sparta-discord-bot"
  retention_in_days = "14"
}

resource "aws_ecs_cluster" "sparta_cluster" {
  name = "sparta-cluster"
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
  count             = 3
  vpc_id            = aws_vpc.sparta_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = "eu-west-2${["a", "b", "c"][count.index]}"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "sparta-public-subnet-${count.index + 1}"
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
  count          = 3
  subnet_id      = aws_subnet.sparta_public_subnets[count.index].id
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
