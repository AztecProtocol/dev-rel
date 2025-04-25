# Sparta Discord Bot - Terraform Deployment

This directory contains the Terraform configuration for deploying the Sparta Discord bot to AWS.

## Architecture

The Terraform configuration deploys the following AWS resources:

- **ECS Cluster**: Manages the Docker containers running the bot
- **ECS Task Definition**: Defines the Docker container configuration
- **ECS Service**: Maintains the desired count of container instances
- **CloudWatch Log Group**: Collects and stores logs from the bot
- **IAM Roles**: Provides necessary permissions for the services
- **Security Groups**: Controls network access to the resources
- **Secrets Manager**: Securely stores sensitive credentials

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate credentials
2. **Terraform** (v1.0+) installed
3. Discord bot credentials (token, client ID)
4. Ethereum node access information
5. Google Sheets API credentials (if using role management)

## Configuration Variables

The deployment is configured using the following variables:

| Name                          | Description                                                             | Required?    |
|-------------------------------|-------------------------------------------------------------------------|--------------|
| `aws_region`                  | AWS region                                                              | Required     |
| `environment`                 | Deployment environment (development/production)                         | Required     |
| `bot_token`                   | Discord bot token                                                       | Required     |
| `bot_client_id`               | Discord client ID                                                       | Required     |
| `guild_id`                    | Discord server ID                                                       | Required     |
| `ethereum_host`               | Ethereum node URL                                                       | Required     |
| `staking_asset_handler_address` | Contract address                                                      | Required     |
| `l1_chain_id`                 | Ethereum chain ID                                                       | Required     |
| `funder_address_private_key`  | Private key for funding                                                 | Required     |
| `log_level`                   | Log level (debug, info, warn, error)                                    | Optional     |
| `log_pretty_print`            | Enable pretty printing for logs                                         | Optional     |
| `availability_zones`          | List of Availability Zones                                              | Optional     |
| `public_subnet_cidrs`         | List of CIDR blocks for public subnets                                  | Optional     |
| `private_subnet_cidrs`        | List of CIDR blocks for private subnets                                 | Optional     |
| `api_port`                    | Port for the API container                                              | Optional     |
| `api_desired_count`           | Desired number of API tasks                                             | Optional     |
| `api_cpu`                     | CPU units for API task                                                  | Optional     |
| `api_memory`                  | Memory for API task                                                     | Optional     |
| `vpc_cidr`                    | CIDR block for the VPC                                                  | Optional     |

## Deployment Steps

1. **Initialize Terraform**:

```bash
terraform init
```

2. **Create Variable Configuration**:

Create a `terraform.tfvars` file based on the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values.

3. **Plan Deployment**:

```bash
terraform plan -out=tfplan
```

Review the planned changes to ensure they match your expectations.

4. **Apply Deployment**:

```bash
terraform apply tfplan
```

5. **Verify Deployment**:

After deployment completes, verify the service is running in the AWS Console:
- Check ECS service status
- Verify CloudWatch logs are being generated
- Confirm Discord bot is online

## Environment-Specific Deployments

For multiple environments (production, staging, etc.):

```bash
# For staging
terraform apply -var-file=terraform.staging.tfvars

# For production
terraform apply -var-file=terraform.production.tfvars
```

## Destroying Resources

To tear down all resources:

```bash
terraform destroy
```

**⚠️ Warning**: This will permanently delete all resources created by Terraform.

## Updating the Deployment

To update the deployment with new bot code:

1. **Build and push a new Docker image** with your changes
2. **Update the task definition** with the new image
3. **Apply the changes**:

```bash
terraform apply -var="container_image=<new-image>"
```

## Troubleshooting

### Common Issues

1. **Bot not coming online**:
   - Check ECS service logs in CloudWatch
   - Verify Discord token is correct
   - Check task definition for environment variables

2. **Permission errors**:
   - Verify IAM roles have sufficient permissions
   - Check security group configurations

3. **State file issues**:
   - Consider using remote state with S3 and DynamoDB for team environments

### Logging

Access logs through:
- AWS CloudWatch console
- AWS CLI:
  ```bash
  aws logs get-log-events --log-group-name /ecs/sparta-bot --log-stream-name <stream-name>
  ```

## Security Best Practices

- Use AWS Secrets Manager for sensitive values
- Rotate credentials regularly
- Use the principle of least privilege for IAM roles
- Encrypt data at rest and in transit
- Enable CloudTrail for AWS API auditing 

### Logging Configuration

For production environments, it's recommended to:
- Set `log_level` to `info` or `warn` to reduce log volume
- Set `log_pretty_print` to `false` for better performance and compatibility with log aggregation services
