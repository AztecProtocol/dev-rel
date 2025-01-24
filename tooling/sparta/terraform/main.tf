# =============================================================================
# Sparta Discord Bot - Infrastructure as Code
# =============================================================================
# This Terraform configuration sets up a production-ready infrastructure for the 
# Sparta Discord bot on AWS Elastic Beanstalk. The infrastructure includes:
# - VPC with public subnet for internet access
# - Elastic Beanstalk environment running Docker
# - Auto-scaling configuration
# - Security groups and IAM roles
# =============================================================================

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Using AWS Provider version 5.x for latest features
    }
  }

  backend "s3" {
    bucket         = "sparta-terraform-state"
    key            = "sparta/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "sparta-terraform-locks"
  }
}

# Configure the AWS Provider with the specified region
provider "aws" {
  region = var.aws_region
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  app_name = "sparta"  # Application identifier used in resource naming
  env      = var.environment  # Environment name (development/production)
  timestamp = formatdate("YYYYMMDDhhmmss", timestamp())
}

# -----------------------------------------------------------------------------
# Networking Configuration - VPC and Subnet
# -----------------------------------------------------------------------------
# Virtual Private Cloud (VPC) - Isolated network for our application
resource "aws_vpc" "sparta_vpc" {
  cidr_block           = "10.0.0.0/16"  # Provides 65,536 IP addresses
  enable_dns_hostnames = true  # Enables DNS hostnames for EC2 instances
  enable_dns_support   = true  # Enables DNS resolution in the VPC

  tags = {
    Name = "${local.app_name}-vpc-${local.env}"
  }
}

# Public Subnet - Where our Elastic Beanstalk instances will run
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.sparta_vpc.id
  cidr_block              = "10.0.1.0/24"  # Provides 256 IP addresses
  map_public_ip_on_launch = true  # Automatically assign public IPs to instances
  availability_zone       = "${var.aws_region}a"  # Use first AZ in the region

  tags = {
    Name = "${local.app_name}-public-subnet-${local.env}"
  }
}

# -----------------------------------------------------------------------------
# Internet Connectivity
# -----------------------------------------------------------------------------
# Internet Gateway - Allows communication between VPC and internet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.sparta_vpc.id

  tags = {
    Name = "${local.app_name}-igw-${local.env}"
  }
}

# Route Table - Defines routing rules for the public subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.sparta_vpc.id

  route {
    cidr_block = "0.0.0.0/0"  # Route all external traffic
    gateway_id = aws_internet_gateway.main.id  # through the internet gateway
  }

  tags = {
    Name = "${local.app_name}-public-rt-${local.env}"
  }
}

# Associate the public subnet with the route table
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------
# Security Group - Controls inbound/outbound traffic for EB instances
resource "aws_security_group" "eb_sg" {
  name        = "${local.app_name}-eb-sg-${local.env}"
  description = "Security group for Sparta Discord bot"
  vpc_id      = aws_vpc.sparta_vpc.id

  # Allow inbound SSH traffic
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Access controlled via SSH key pair
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.app_name}-eb-sg-${local.env}"
  }
}

# -----------------------------------------------------------------------------
# S3 Storage Configuration
# -----------------------------------------------------------------------------
# S3 Bucket - Stores Elastic Beanstalk deployment artifacts
resource "aws_s3_bucket" "eb_bucket" {
  bucket = "${local.app_name}-eb-bucket-${local.env}"
}

# Create deployment package
resource "null_resource" "deployment_package" {
  # Always rebuild
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<EOT
      cd ${path.root}/../src && \
      rm -rf node_modules dist *.zip && \
      npm ci && \
      npm run build && \
      zip -r deployment-${local.timestamp}.zip platform dist package.json
    EOT
  }
}

resource "aws_s3_object" "default" {
  bucket = aws_s3_bucket.eb_bucket.id
  key    = "deployment-${local.timestamp}.zip"
  source = "${path.root}/../src/deployment-${local.timestamp}.zip"

  depends_on = [null_resource.deployment_package]
}

# Create Elastic Beanstalk application version
resource "aws_elastic_beanstalk_application_version" "latest" {
  name        = "${local.app_name}-${local.env}-${local.timestamp}"
  application = aws_elastic_beanstalk_application.sparta_bot.name
  description = "Latest deployment package for ${local.app_name}"
  bucket      = aws_s3_bucket.eb_bucket.id
  key         = "deployment-${local.timestamp}.zip"

  depends_on = [aws_s3_object.default]
}

# -----------------------------------------------------------------------------
# IAM Roles and Policies
# -----------------------------------------------------------------------------
# Elastic Beanstalk Service Role - Allows EB to manage AWS resources
resource "aws_iam_role" "eb_service_role" {
  name = "${local.app_name}-eb-service-role-${local.env}"

  # Trust policy - Allows EB service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "elasticbeanstalk.amazonaws.com"
        }
      }
    ]
  })
}

# Attach AWS-managed policy for EB service
resource "aws_iam_role_policy_attachment" "eb_service" {
  role       = aws_iam_role.eb_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService"
}

# Attach enhanced health monitoring policy
resource "aws_iam_role_policy_attachment" "eb_enhanced_health" {
  role       = aws_iam_role.eb_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
}

# EC2 Instance Role - Allows EC2 instances to access AWS services
resource "aws_iam_role" "eb_instance_role" {
  name = "${local.app_name}-eb-instance-role-${local.env}"

  # Trust policy - Allows EC2 service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Instance Profile - Allows EC2 instances to use the instance role
resource "aws_iam_instance_profile" "eb_instance_profile" {
  name = "${local.app_name}-eb-instance-profile-${local.env}"
  role = aws_iam_role.eb_instance_role.name
}

# Custom policy for EC2 instances - Defines permissions for accessing AWS services
resource "aws_iam_role_policy" "eb_instance_policy" {
  name = "${local.app_name}-eb-instance-policy-${local.env}"
  role = aws_iam_role.eb_instance_role.id

  # Policy document defining allowed actions
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow CloudWatch Logs access
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:*:*:*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# AWS Secrets Manager Configuration
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "bot_token" {
  name = "sparta-bot/BOT_TOKEN"
}

resource "aws_secretsmanager_secret_version" "bot_token" {
  secret_id     = aws_secretsmanager_secret.bot_token.id
  secret_string = var.bot_token
}

resource "aws_secretsmanager_secret" "bot_client_id" {
  name = "sparta-bot/BOT_CLIENT_ID"
}

resource "aws_secretsmanager_secret_version" "bot_client_id" {
  secret_id     = aws_secretsmanager_secret.bot_client_id.id
  secret_string = var.bot_client_id
}

resource "aws_secretsmanager_secret" "guild_id" {
  name = "sparta-bot/GUILD_ID"
}

resource "aws_secretsmanager_secret_version" "guild_id" {
  secret_id     = aws_secretsmanager_secret.guild_id.id
  secret_string = var.guild_id
}

resource "aws_secretsmanager_secret" "ethereum_host" {
  name = "sparta-bot/ETHEREUM_HOST"
}

resource "aws_secretsmanager_secret_version" "ethereum_host" {
  secret_id     = aws_secretsmanager_secret.ethereum_host.id
  secret_string = var.ethereum_host
}

resource "aws_secretsmanager_secret" "ethereum_rollup_address" {
  name = "sparta-bot/ETHEREUM_ROLLUP_ADDRESS"
}

resource "aws_secretsmanager_secret_version" "ethereum_rollup_address" {
  secret_id     = aws_secretsmanager_secret.ethereum_rollup_address.id
  secret_string = var.ethereum_rollup_address
}

resource "aws_secretsmanager_secret" "ethereum_admin_address" {
  name = "sparta-bot/ETHEREUM_ADMIN_ADDRESS"
}

resource "aws_secretsmanager_secret_version" "ethereum_admin_address" {
  secret_id     = aws_secretsmanager_secret.ethereum_admin_address.id
  secret_string = var.ethereum_admin_address
}

resource "aws_secretsmanager_secret" "ethereum_chain_id" {
  name = "sparta-bot/ETHEREUM_CHAIN_ID"
}

resource "aws_secretsmanager_secret_version" "ethereum_chain_id" {
  secret_id     = aws_secretsmanager_secret.ethereum_chain_id.id
  secret_string = var.ethereum_chain_id
}

resource "aws_secretsmanager_secret" "ethereum_private_key" {
  name = "sparta-bot/ETHEREUM_PRIVATE_KEY"
}

resource "aws_secretsmanager_secret_version" "ethereum_private_key" {
  secret_id     = aws_secretsmanager_secret.ethereum_private_key.id
  secret_string = var.ethereum_private_key
}

resource "aws_secretsmanager_secret" "ethereum_value" {
  name = "sparta-bot/ETHEREUM_VALUE"
}

resource "aws_secretsmanager_secret_version" "ethereum_value" {
  secret_id     = aws_secretsmanager_secret.ethereum_value.id
  secret_string = var.ethereum_value
}

# Add IAM policy to allow Elastic Beanstalk to access Secrets Manager
resource "aws_iam_role_policy" "secrets_policy" {
  name = "${local.app_name}-secrets-policy-${local.env}"
  role = aws_iam_role.eb_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.bot_token.arn,
          aws_secretsmanager_secret.bot_client_id.arn,
          aws_secretsmanager_secret.guild_id.arn,
          aws_secretsmanager_secret.ethereum_host.arn,
          aws_secretsmanager_secret.ethereum_rollup_address.arn,
          aws_secretsmanager_secret.ethereum_admin_address.arn,
          aws_secretsmanager_secret.ethereum_chain_id.arn,
          aws_secretsmanager_secret.ethereum_private_key.arn,
          aws_secretsmanager_secret.ethereum_value.arn
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Elastic Beanstalk Configuration
# -----------------------------------------------------------------------------
# Elastic Beanstalk Application
resource "aws_elastic_beanstalk_application" "sparta_bot" {
  name        = "${local.app_name}-discord-bot-${local.env}"
  description = "Sparta Discord Bot Application"
}

# Elastic Beanstalk Environment
resource "aws_elastic_beanstalk_environment" "sparta_bot_env" {
  name                = "${local.app_name}-bot-env-${local.env}"
  application         = aws_elastic_beanstalk_application.sparta_bot.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.4.1 running Node.js 22"  # Using Node.js platform
  tier                = "WebServer"
  version_label      = aws_elastic_beanstalk_application_version.latest.name  # Use the latest version
  
  # IAM Instance Profile
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_instance_profile.name
  }

  # Security Group Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.eb_sg.id
  }

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.sparta_vpc.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = aws_subnet.public.id
  }

  # Enhanced Health Reporting
  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "SystemType"
    value     = "enhanced"  # Enable enhanced health reporting
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "HealthCheckSuccessThreshold"
    value     = "Ok"  # Set health check threshold to "Ok"
  }

  # CloudWatch Logs Configuration
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = "true"  # Clean up logs when environment is terminated
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7"  # Keep logs for 7 days
  }

  # Instance CloudWatch Logs Configuration
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "HealthStreamingEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "DeleteOnTerminate"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "RetentionInDays"
    value     = "7"
  }

  # Auto Scaling Configuration - Single instance
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "1"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "1"
  }

  # Deployment Configuration
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "AllAtOnce"  # Since we only have one instance
  }

  # SSH Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "EC2KeyName"
    value     = aws_key_pair.eb_key_pair.key_name
  }

  # Instance Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.micro"  # Smaller instance type since it's a single bot
  }

  # Root volume size - reduced since we don't need much storage
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "RootVolumeSize"
    value     = "10"  # GB
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "RootVolumeType"
    value     = "gp3"
  }

  # Configure platform hooks
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.eb_service_role.name
  }

  # Platform hooks configuration using .platform/hooks
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PLATFORM_HOOKS"
    value     = ".platform/hooks"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_REGION"
    value     = var.aws_region
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENVIRONMENT"
    value     = var.environment
  }
}

# -----------------------------------------------------------------------------
# SSH Access Configuration
# -----------------------------------------------------------------------------
# Key Pair for SSH access to EC2 instances
resource "aws_key_pair" "eb_key_pair" {
  key_name   = "${local.app_name}-eb-key-${local.env}"
  public_key = var.ssh_public_key

  tags = {
    Name = "${local.app_name}-eb-key-${local.env}"
  }
}

# -----------------------------------------------------------------------------
# Data Sources - EC2 Instance Information
# -----------------------------------------------------------------------------
data "aws_instances" "eb_instances" {
  instance_tags = {
    "elasticbeanstalk:environment-name" = aws_elastic_beanstalk_environment.sparta_bot_env.name
  }

  depends_on = [aws_elastic_beanstalk_environment.sparta_bot_env]
} 

