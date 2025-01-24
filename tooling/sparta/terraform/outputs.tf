# =============================================================================
# Terraform Outputs
# =============================================================================
# This file defines all the outputs that will be displayed after terraform apply
# These outputs provide important information about the deployed infrastructure
# =============================================================================

# -----------------------------------------------------------------------------
# Elastic Beanstalk Outputs
# -----------------------------------------------------------------------------
output "elastic_beanstalk_environment_id" {
  description = "ID of the Elastic Beanstalk environment"
  value       = aws_elastic_beanstalk_environment.sparta_bot_env.id
}

output "elastic_beanstalk_environment_name" {
  description = "Name of the Elastic Beanstalk environment"
  value       = aws_elastic_beanstalk_environment.sparta_bot_env.name
}

output "elastic_beanstalk_environment_endpoint" {
  description = "Endpoint URL of the Elastic Beanstalk environment"
  value       = aws_elastic_beanstalk_environment.sparta_bot_env.endpoint_url
}

output "elastic_beanstalk_application_name" {
  description = "Name of the Elastic Beanstalk application"
  value       = aws_elastic_beanstalk_application.sparta_bot.name
}

# -----------------------------------------------------------------------------
# VPC and Network Outputs
# -----------------------------------------------------------------------------
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.sparta_vpc.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.sparta_vpc.cidr_block
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "public_subnet_cidr" {
  description = "CIDR block of the public subnet"
  value       = aws_subnet.public.cidr_block
}

# -----------------------------------------------------------------------------
# Security Outputs
# -----------------------------------------------------------------------------
output "security_group_id" {
  description = "ID of the security group used by Elastic Beanstalk"
  value       = aws_security_group.eb_sg.id
}

output "instance_profile_name" {
  description = "Name of the IAM instance profile used by Elastic Beanstalk"
  value       = aws_iam_instance_profile.eb_instance_profile.name
}

output "instance_role_name" {
  description = "Name of the IAM role used by EC2 instances"
  value       = aws_iam_role.eb_instance_role.name
}

output "deployment_bucket" {
  description = "Name of the S3 bucket used for deployment artifacts"
  value       = aws_s3_bucket.eb_bucket.id
}

# -----------------------------------------------------------------------------
# Environment Information
# -----------------------------------------------------------------------------

output "aws_region" {
  description = "AWS region where resources are deployed"
  value       = var.aws_region
}

# -----------------------------------------------------------------------------
# Application URLs
# -----------------------------------------------------------------------------
output "application_url" {
  description = "URL where the application can be accessed"
  value       = "http://${aws_elastic_beanstalk_environment.sparta_bot_env.endpoint_url}"
}

output "cloudwatch_logs_url" {
  description = "URL to CloudWatch Logs for the environment"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#logsV2:log-groups|$252Faws$252Felasticbeanstalk$252F${aws_elastic_beanstalk_environment.sparta_bot_env.name}"
}

# -----------------------------------------------------------------------------
# EC2 Instance Information
# -----------------------------------------------------------------------------
output "instance_public_ips" {
  description = "Public IPs of the EC2 instances in the environment"
  value       = data.aws_instances.eb_instances.public_ips
}

output "ssh_command" {
  description = "Ready-to-use SSH command for the first instance"
  value       = length(data.aws_instances.eb_instances.public_ips) > 0 ? "ssh -i /path/to/your/private/key ec2-user@${data.aws_instances.eb_instances.public_ips[0]}" : "No instances available yet"
}

# -----------------------------------------------------------------------------
# SSH Access Information
# -----------------------------------------------------------------------------
output "ssh_connection_info" {
  description = "Information about SSH access to EC2 instances"
  value       = <<-EOT
    To SSH into your EC2 instance:
    
    Available instance IPs: ${jsonencode(data.aws_instances.eb_instances.public_ips)}
    
    Connect using:
    ssh -i /path/to/your/private/key ec2-user@<INSTANCE-IP>
    
    Quick connect to first instance:
    ${length(data.aws_instances.eb_instances.public_ips) > 0 ? "ssh -i /path/to/your/private/key ec2-user@${data.aws_instances.eb_instances.public_ips[0]}" : "No instances available yet"}
    
    Note: The Load Balancer URL (${aws_elastic_beanstalk_environment.sparta_bot_env.endpoint_url}) 
    cannot be used for SSH connections. You must use the EC2 instance's public IP.
    
    The IP may change if the instance is replaced. Always check the latest IPs in the outputs.
  EOT
}

output "application_endpoint" {
  description = "Load Balancer URL for the application (NOT for SSH)"
  value       = aws_elastic_beanstalk_environment.sparta_bot_env.endpoint_url
}
