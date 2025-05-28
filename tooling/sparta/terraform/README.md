# Sparta Discord Bot - AWS Infrastructure Deployment

This directory contains the Terraform Infrastructure as Code (IaC) configuration for deploying the Sparta Discord bot system to AWS. The infrastructure is designed for high availability, security, and scalability.

## 🏗️ Infrastructure Architecture

### AWS Services Overview

The Terraform configuration deploys a comprehensive multi-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                           AWS Cloud                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   CloudFront    │────►│  Application    │                   │
│  │   (Optional)    │     │  Load Balancer  │                   │
│  └─────────────────┘     └─────────────────┘                   │
│                                  │                              │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                    VPC Network Layer                        │
│  │  ┌─────────────────┐          ┌─────────────────┐          │
│  │  │ Public Subnet   │          │ Private Subnet  │          │
│  │  │ (NAT Gateway)   │          │ (ECS Tasks)     │          │
│  │  └─────────────────┘          └─────────────────┘          │
│  └─────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                   Compute Layer                             │
│  │  ┌─────────────────┐          ┌─────────────────┐          │
│  │  │   ECS Cluster   │          │ Lambda Functions│          │
│  │  │                 │          │                 │          │
│  │  │ ┌─────────────┐ │          │ ┌─────────────┐ │          │
│  │  │ │Discord Bot  │ │          │ │ Validator   │ │          │
│  │  │ │   Service   │ │          │ │ Monitor     │ │          │
│  │  │ └─────────────┘ │          │ └─────────────┘ │          │
│  │  │                 │          │                 │          │
│  │  │ ┌─────────────┐ │          │ ┌─────────────┐ │          │
│  │  │ │ API Server  │ │          │ │ Scheduled   │ │          │
│  │  │ │   Service   │ │          │ │ Tasks       │ │          │
│  │  │ └─────────────┘ │          │ └─────────────┘ │          │
│  │  └─────────────────┘          └─────────────────┘          │
│  └─────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                   Data Layer                                │
│  │  ┌─────────────────┐          ┌─────────────────┐          │
│  │  │    DynamoDB     │          │  Secrets        │          │
│  │  │    Tables       │          │  Manager        │          │
│  │  │                 │          │                 │          │
│  │  │ • Operators     │          │ • Bot Token     │          │
│  │  │ • Validators    │          │ • API Keys      │          │
│  │  │ • Config        │          │ • Private Keys  │          │
│  │  └─────────────────┘          └─────────────────┘          │
│  └─────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                 Monitoring Layer                            │
│  │  ┌─────────────────┐          ┌─────────────────┐          │
│  │  │   CloudWatch    │          │  EventBridge    │          │
│  │  │                 │          │                 │          │
│  │  │ • Log Groups    │          │ • Schedules     │          │
│  │  │ • Metrics       │          │ • Event Rules   │          │
│  │  │ • Alarms        │          │ • Triggers      │          │
│  │  │ • Dashboards    │          │                 │          │
│  │  └─────────────────┘          └─────────────────┘          │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

### Core AWS Resources

| Category | Resource | Purpose | Configuration |
|----------|----------|---------|---------------|
| **Networking** | VPC | Isolated network environment | CIDR: 10.10.0.0/16 |
| | Public Subnets | Internet-facing resources | ALB, NAT Gateway |
| | Private Subnets | Application resources | ECS tasks, Lambda |
| | Internet Gateway | Internet connectivity | Public subnet routing |
| | NAT Gateway | Outbound internet for private | Lambda/ECS egress |
| **Compute** | ECS Cluster | Container orchestration | Fargate launch type |
| | ECS Services | Discord bot & API server | Auto-scaling enabled |
| | Lambda Functions | Validator monitoring | Event-driven execution |
| **Storage** | DynamoDB Tables | NoSQL database | On-demand billing |
| | S3 Buckets | Backups and artifacts | Versioning enabled |
| **Security** | Secrets Manager | Secure credential storage | Automatic rotation |
| | IAM Roles | Service permissions | Least privilege principle |
| | Security Groups | Network access control | Port-specific rules |
| **Monitoring** | CloudWatch | Logging and monitoring | Log retention 30 days |
| | EventBridge | Event scheduling | Cron-based triggers |

## 🚀 Prerequisites

### Required Tools

Before deploying, ensure you have:

1. **AWS CLI** (v2.0+) installed and configured:
```bash
aws --version
aws configure list
```

2. **Terraform** (v1.0+) installed:
```bash
terraform --version
```

3. **Docker** (for building container images):
```bash
docker --version
```

### AWS Account Setup

1. **IAM Permissions**: Your AWS user/role needs permissions for:
   - ECS (Elastic Container Service)
   - Lambda functions
   - DynamoDB tables
   - VPC networking
   - CloudWatch logging
   - Secrets Manager
   - IAM role management

2. **AWS Configuration**:
```bash
aws configure
# OR use environment variables:
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=eu-west-2
```

### Application Prerequisites

1. **Discord Bot Setup**:
   - Create application at [Discord Developer Portal](https://discord.com/developers/applications)
   - Generate bot token with appropriate permissions
   - Note the client ID and guild ID

2. **Ethereum Node Access**:
   - Ethereum RPC endpoint (Infura, Alchemy, or self-hosted)
   - Deployed staking contract address
   - Funded wallet for bot operations

## ⚙️ Configuration

### Environment Variables

Configure deployment through `terraform.tfvars` file:

```hcl
# AWS Configuration
aws_region = "eu-west-2"
environment = "production"

# Networking
vpc_cidr = "10.10.0.0/16"
availability_zones = ["eu-west-2a", "eu-west-2b"]
public_subnet_cidrs = ["10.10.1.0/24", "10.10.2.0/24"]
private_subnet_cidrs = ["10.10.101.0/24", "10.10.102.0/24"]

# Discord Configuration
bot_token = "MTMzMDg2ODk1NTI5MTcxMzYxNg.G_wEfW..."
bot_client_id = "1329079356785688616"
guild_id = "1144692727120937080"

# Ethereum Configuration
ethereum_host = "https://mainnet.infura.io/v3/your-project-id"
staking_asset_handler_address = "0xF739D03e98e23A7B65940848aBA8921fF3bAc4b2"
l1_chain_id = "1"  # 1 for mainnet, 11155111 for Sepolia
sparta_address = "0x1234567890123456789012345678901234567890"
sparta_private_key = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"

# API Configuration
backend_api_key = "your-secure-api-key-here"
api_port = 3000
api_desired_count = 2
api_cpu = "1024"    # 1 vCPU
api_memory = "2048"  # 2 GB

# Aztec Configuration
aztec_rpc_url = "https://your-aztec-node.com:8080"

# Logging
log_level = "info"
log_pretty_print = false

# Monitoring
enable_validator_monitor_schedule = true
```

### Security Configuration

#### Secrets Management

Sensitive values are automatically stored in AWS Secrets Manager:

```hcl
# Automatically created secrets:
secret_names = [
  "sparta/${var.environment}/bot-token",
  "sparta/${var.environment}/ethereum-private-key", 
  "sparta/${var.environment}/api-key"
]
```

#### IAM Roles and Policies

The deployment creates least-privilege IAM roles:

- **ECS Task Role**: DynamoDB access, Secrets Manager read
- **ECS Execution Role**: CloudWatch logs, ECR image pull
- **Lambda Execution Role**: DynamoDB access, CloudWatch logs
- **EventBridge Role**: Lambda function invocation

#### Network Security

Security groups with minimal required access:

```hcl
# ALB Security Group
ingress_rules = [
  {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # HTTP access
  }
]

# ECS Security Group  
ingress_rules = [
  {
    from_port = 3000
    to_port = 3000
    protocol = "tcp"
    source_security_group_id = alb_security_group_id
  }
]
```

## 🚀 Deployment Process

### Step 1: Initial Setup

1. **Clone Repository**:
```bash
git clone <repository-url>
cd tooling/sparta/terraform
```

2. **Create Configuration**:
```bash
cp terraform.production.tfvars.example terraform.production.tfvars
# Edit with your specific values
```

3. **Initialize Terraform**:
```bash
terraform init
```

### Step 2: Plan Deployment

Review the infrastructure changes:

```bash
terraform plan -var-file=terraform.production.tfvars -out=tfplan
```

Key outputs to review:
- Resource creation count
- Security group rules
- IAM permissions
- Cost estimates

### Step 3: Deploy Infrastructure

Apply the planned changes:

```bash
terraform apply tfplan
```

This process typically takes 10-15 minutes and creates:
- VPC and networking components
- ECS cluster and services
- DynamoDB tables
- Lambda functions
- CloudWatch resources

### Step 4: Verify Deployment

1. **Check ECS Services**:
```bash
aws ecs describe-services \
  --cluster sparta-${var.environment} \
  --services sparta-api sparta-discord
```

2. **Monitor Logs**:
```bash
aws logs tail /ecs/sparta-bot --follow --region eu-west-2
```

3. **Test API Health**:
```bash
curl https://your-alb-url.eu-west-2.elb.amazonaws.com/health
```

4. **Verify Discord Bot**:
   - Check bot online status in Discord server
   - Test slash commands

## 🔄 CI/CD Integration

### GitHub Actions Deployment

The repository includes a GitHub Actions workflow for automated deployment:

#### Workflow Configuration

```yaml
# .github/workflows/terraform-deploy.yml
name: Terraform Deploy
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: ['tooling/sparta/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      TF_VAR_bot_token: ${{ secrets.BOT_TOKEN }}
      TF_VAR_ethereum_host: ${{ secrets.ETHEREUM_HOST }}
      # ... other variables
```

#### Required Secrets

Configure these secrets in your GitHub repository:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `BOT_TOKEN` | Discord bot token | `MTMzMDg2ODk1NTI5...` |
| `ETHEREUM_HOST` | Ethereum RPC URL | `https://mainnet.infura.io/v3/...` |
| `BACKEND_API_KEY` | API authentication | `secure-random-key` |

#### Deployment Trigger

Deploy via GitHub Actions:

1. Navigate to repository → Actions tab
2. Select "Terraform Deploy" workflow
3. Click "Run workflow"
4. Monitor deployment progress

## 🔧 Operations & Maintenance

### Scaling Operations

#### Horizontal Scaling

Scale ECS services based on demand:

```bash
# Scale API service
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-api \
  --desired-count 4

# Scale Discord bot (typically 1 instance)
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-discord \
  --desired-count 1
```

#### Auto Scaling Configuration

Configure auto scaling in Terraform:

```hcl
resource "aws_appautoscaling_target" "api_scaling_target" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/sparta-${var.environment}/sparta-api"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_scaling_policy" {
  name               = "api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_scaling_target.resource_id
  scalable_dimension = aws_appautoscaling_target.api_scaling_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_scaling_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Monitoring & Observability

#### CloudWatch Dashboards

Create custom dashboards for monitoring:

```bash
# View ECS service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=sparta-api \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average
```

#### Log Analysis

Query CloudWatch logs:

```bash
# Search for errors in API logs
aws logs filter-log-events \
  --log-group-name /ecs/sparta-api \
  --filter-pattern "ERROR" \
  --start-time 1609459200000

# Monitor Discord bot activity
aws logs tail /ecs/sparta-bot --follow --filter-pattern "discord"
```

#### Alerting Setup

Configure CloudWatch alarms:

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "sparta-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "sparta-api"
    ClusterName = "sparta-${var.environment}"
  }
}
```

### Database Maintenance

#### DynamoDB Operations

Monitor and maintain DynamoDB tables:

```bash
# Check table status
aws dynamodb describe-table --table-name sparta-validators-production

# Monitor consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=sparta-validators-production

# Create backup
aws dynamodb create-backup \
  --table-name sparta-validators-production \
  --backup-name sparta-validators-backup-$(date +%Y%m%d)
```

#### Migration Management

Run database migrations:

```bash
# From the sparta root directory
cd tooling/sparta

# Create backup before migration
bun run --filter='@sparta/utils' backup

# Run migration
bun run --filter='@sparta/utils' migration

# Verify migration
bun run --filter='@sparta/utils' migration:verify
```

### Security Maintenance

#### Secret Rotation

Rotate sensitive credentials regularly:

```bash
# Update bot token in Secrets Manager
aws secretsmanager update-secret \
  --secret-id sparta/production/bot-token \
  --secret-string "new-bot-token-here"

# Update API key
aws secretsmanager update-secret \
  --secret-id sparta/production/api-key \
  --secret-string "new-api-key-here"
```

#### Security Auditing

Regular security checks:

```bash
# Review IAM permissions
aws iam get-role-policy \
  --role-name sparta-ecs-task-role \
  --policy-name sparta-ecs-policy

# Check security group rules
aws ec2 describe-security-groups \
  --group-names sparta-ecs-sg

# Audit CloudTrail logs
aws logs filter-log-events \
  --log-group-name cloudtrail-log-group \
  --filter-pattern "sparta"
```

### Cost Optimization

#### Resource Monitoring

Track AWS costs:

```bash
# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

#### Optimization Strategies

1. **ECS**: Use appropriate task sizes, implement auto-scaling
2. **DynamoDB**: Monitor read/write capacity, use on-demand billing
3. **Lambda**: Optimize memory allocation and execution time
4. **CloudWatch**: Set appropriate log retention periods
5. **Data Transfer**: Use VPC endpoints to reduce NAT Gateway costs

## 🔄 Updates & Rollbacks

### Application Updates

Deploy new application versions:

```bash
# Update container image in task definition
terraform apply -var="container_image=sparta:v2.0.0"

# Force service update
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-api \
  --force-new-deployment
```

### Infrastructure Updates

Update infrastructure components:

```bash
# Plan infrastructure changes
terraform plan -var-file=terraform.production.tfvars

# Apply updates
terraform apply -var-file=terraform.production.tfvars
```

### Rollback Procedures

#### Application Rollback

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-api \
  --task-definition sparta-api:previous-revision
```

#### Infrastructure Rollback

```bash
# Revert to previous Terraform state
terraform apply -var-file=terraform.production.tfvars \
  -target=aws_ecs_service.api
```

### Emergency Procedures

#### Service Restart

```bash
# Force restart all tasks
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-api \
  --force-new-deployment

# Stop specific task (auto-replacement)
aws ecs stop-task \
  --cluster sparta-production \
  --task task-id \
  --reason "Emergency restart"
```

#### Quick Disable

```bash
# Scale down to 0 instances
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-discord \
  --desired-count 0
```

## 🗑️ Cleanup & Destruction

### Terraform Destroy

**⚠️ Warning**: This will permanently delete all resources!

```bash
# Plan destruction
terraform plan -destroy -var-file=terraform.production.tfvars

# Destroy infrastructure
terraform destroy -var-file=terraform.production.tfvars
```

### Selective Resource Cleanup

Remove specific resources:

```bash
# Remove specific resources
terraform destroy -target=aws_lambda_function.validator_monitor

# Remove and recreate resource
terraform taint aws_ecs_service.api
terraform apply
```

### Data Backup Before Destruction

Always backup critical data:

```bash
# Backup DynamoDB tables
aws dynamodb create-backup --table-name sparta-validators-production
aws dynamodb create-backup --table-name sparta-operators-production

# Export secrets
aws secretsmanager get-secret-value --secret-id sparta/production/bot-token
```

## 🛠️ Troubleshooting

### Common Deployment Issues

#### 1. ECS Task Startup Failures

**Symptoms**: Tasks start but immediately stop

**Diagnosis**:
```bash
# Check task details
aws ecs describe-tasks --cluster sparta-production --tasks task-id

# Review logs
aws logs get-log-events --log-group-name /ecs/sparta-api
```

**Common Causes**:
- Missing environment variables
- Invalid secrets in Secrets Manager
- Network connectivity issues
- Insufficient memory/CPU allocation

#### 2. Database Connection Issues

**Symptoms**: Application errors related to DynamoDB

**Diagnosis**:
```bash
# Check IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::account:role/sparta-ecs-task-role \
  --action-names dynamodb:GetItem \
  --resource-arns arn:aws:dynamodb:region:account:table/sparta-validators
```

**Solutions**:
- Verify IAM role permissions
- Check security group rules
- Validate DynamoDB table names

#### 3. Lambda Function Errors

**Symptoms**: Validator monitoring not working

**Diagnosis**:
```bash
# Check Lambda logs
aws logs get-log-events \
  --log-group-name /aws/lambda/sparta-validator-monitor

# Test function manually
aws lambda invoke \
  --function-name sparta-validator-monitor \
  --payload '{}' \
  response.json
```

**Solutions**:
- Review Lambda function configuration
- Check EventBridge trigger rules
- Validate environment variables

### Performance Troubleshooting

#### High CPU Usage

```bash
# Monitor ECS CPU metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=sparta-api

# Scale up if needed
aws ecs update-service \
  --cluster sparta-production \
  --service sparta-api \
  --desired-count 3
```

#### Memory Issues

```bash
# Check memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=sparta-api

# Increase task memory in Terraform
# api_memory = "4096"  # 4GB
```

#### Database Throttling

```bash
# Monitor DynamoDB throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=sparta-validators

# Increase capacity if needed
aws dynamodb update-table \
  --table-name sparta-validators \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5
```

## 📊 Monitoring & Metrics

### Key Performance Indicators

Monitor these critical metrics:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| ECS CPU Utilization | < 70% | > 85% |
| ECS Memory Utilization | < 80% | > 90% |
| API Response Time | < 500ms | > 1000ms |
| DynamoDB Read/Write Errors | 0 | > 0 |
| Lambda Error Rate | < 1% | > 5% |
| Discord Bot Uptime | > 99.9% | < 99% |

### Custom Metrics

Create application-specific metrics:

```typescript
// In application code
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

await cloudwatch.putMetricData({
  Namespace: 'Sparta/Application',
  MetricData: [
    {
      MetricName: 'ValidatorRegistrations',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date()
    }
  ]
});
```

### Alerting Strategy

Configure alerts for:

1. **Critical**: Service down, high error rates
2. **Warning**: High resource usage, slow responses  
3. **Info**: New deployments, configuration changes

```hcl
resource "aws_sns_topic" "sparta_alerts" {
  name = "sparta-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.sparta_alerts.arn
  protocol  = "email"
  endpoint  = "alerts@yourcompany.com"
}
```

## 🔐 Security Best Practices

### Implementation Checklist

- ✅ **Secrets Management**: All sensitive data in Secrets Manager
- ✅ **Network Isolation**: Private subnets for application resources
- ✅ **Least Privilege**: IAM roles with minimal permissions
- ✅ **Encryption**: Data encrypted at rest and in transit
- ✅ **Monitoring**: CloudTrail enabled for audit logging
- ✅ **Access Control**: Security groups with specific port access
- ✅ **Regular Updates**: Automated security patches

### Compliance Considerations

For production environments:

1. **Data Retention**: Configure appropriate log retention periods
2. **Backup Strategy**: Regular automated backups
3. **Disaster Recovery**: Multi-AZ deployment
4. **Incident Response**: Documented procedures
5. **Access Auditing**: Regular review of permissions

---

This comprehensive infrastructure setup provides a robust, scalable, and secure foundation for the Sparta Discord bot system. Regular monitoring and maintenance ensure optimal performance and reliability in production environments.
