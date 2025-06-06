# ECS Resource Monitoring Commands

## Quick Health Check
```bash
# Check service status
aws ecs describe-services --cluster sparta-production-cluster --services sparta-production-api-service --region eu-west-2

# List running tasks
aws ecs list-tasks --cluster sparta-production-cluster --service-name sparta-production-api-service --region eu-west-2

# Get task details (replace TASK_ARN with actual task ARN from above)
aws ecs describe-tasks --cluster sparta-production-cluster --tasks TASK_ARN --region eu-west-2
```

## Resource Utilization (Last 24 Hours)
```bash
# CPU Utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=sparta-production-api-service Name=ClusterName,Value=sparta-production-cluster \
  --start-time $(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 3600 \
  --statistics Average,Maximum \
  --region eu-west-2

# Memory Utilization  
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=sparta-production-api-service Name=ClusterName,Value=sparta-production-cluster \
  --start-time $(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 3600 \
  --statistics Average,Maximum \
  --region eu-west-2
```

## Check Auto Scaling Activity
```bash
# View scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/sparta-production-cluster/sparta-production-api-service \
  --region eu-west-2

# Check current scaling configuration
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs \
  --resource-ids service/sparta-production-cluster/sparta-production-api-service \
  --region eu-west-2
```

## CloudWatch Logs
```bash
# View recent ECS service events
aws ecs describe-services \
  --cluster sparta-production-cluster \
  --services sparta-production-api-service \
  --region eu-west-2 \
  --query 'services[0].events[0:10]'

# View application logs (replace LOG_STREAM with actual stream name)
aws logs get-log-events \
  --log-group-name /ecs/sparta-production-api \
  --log-stream-name api/sparta-production-api-container/TASK_ID \
  --region eu-west-2
```

## Performance Alerts Setup
Create CloudWatch alarms for proactive monitoring:

```bash
# High CPU Usage Alert
aws cloudwatch put-metric-alarm \
  --alarm-name "sparta-api-high-cpu" \
  --alarm-description "API service high CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=sparta-production-api-service Name=ClusterName,Value=sparta-production-cluster \
  --region eu-west-2

# High Memory Usage Alert  
aws cloudwatch put-metric-alarm \
  --alarm-name "sparta-api-high-memory" \
  --alarm-description "API service high memory utilization" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=sparta-production-api-service Name=ClusterName,Value=sparta-production-cluster \
  --region eu-west-2
```

## Resource Sizing Guidelines

### Current Configuration:
- **CPU**: 1024 units (1 vCPU)
- **Memory**: 2048 MiB (2 GB)
- **Auto Scaling**: 1-4 tasks, triggers at 75% CPU/Memory

### Recommended Upgrades Based on Usage:

#### Light Load (< 1000 requests/hour):
- CPU: 512-1024 units (0.5-1 vCPU)
- Memory: 1024-2048 MiB (1-2 GB)

#### Moderate Load (1000-10000 requests/hour):
- CPU: 2048 units (2 vCPU)  
- Memory: 4096 MiB (4 GB)

#### Heavy Load (> 10000 requests/hour):
- CPU: 4096 units (4 vCPU)
- Memory: 8192 MiB (8 GB)
- Consider increasing max auto-scaling to 8-10 tasks

### Warning Signs:
- 🚨 **Immediate Action**: CPU/Memory > 90%
- ⚠️ **Plan Upgrade**: CPU/Memory consistently > 70%
- 📈 **Scale Out**: Frequent auto-scaling events
- 🔄 **Memory Leaks**: Memory usage climbing over time 