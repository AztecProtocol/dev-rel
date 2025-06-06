#!/bin/bash

# Set your cluster and service names
CLUSTER_NAME="sparta-production-cluster"
SERVICE_NAME="sparta-production-api-service"
REGION="eu-west-2"

echo "🔍 Checking ECS Service Resource Utilization..."
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "========================================"

# Get current service status
echo "📊 Current Service Status:"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount,TaskDefinition:taskDefinition}' \
  --output table

# Get recent CloudWatch CPU metrics (last hour)
echo -e "\n📈 Recent CPU Utilization (last hour):"
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
  --start-time $(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 300 \
  --statistics Average Maximum \
  --region $REGION \
  --query 'Datapoints[*].{Time:Timestamp,Avg:Average,Max:Maximum}' \
  --output table

# Get recent CloudWatch Memory metrics (last hour)
echo -e "\n🧠 Recent Memory Utilization (last hour):"
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
  --start-time $(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 300 \
  --statistics Average Maximum \
  --region $REGION \
  --query 'Datapoints[*].{Time:Timestamp,Avg:Average,Max:Maximum}' \
  --output table

# Check for any scaling activities in the last 24 hours
echo -e "\n⚡ Recent Auto Scaling Activities:"
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id "service/$CLUSTER_NAME/$SERVICE_NAME" \
  --region $REGION \
  --max-items 5 \
  --query 'ScalingActivities[*].{Time:StartTime,Status:StatusCode,Cause:Cause,Description:Description}' \
  --output table

# Check current task count and health
echo -e "\n🏥 Current Task Health:"
TASK_ARNS=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $REGION \
  --query 'taskArns' \
  --output text)

if [ ! -z "$TASK_ARNS" ]; then
  aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARNS \
    --region $REGION \
    --query 'tasks[*].{TaskArn:taskArn,LastStatus:lastStatus,HealthStatus:healthStatus,CPU:cpu,Memory:memory,CreatedAt:createdAt}' \
    --output table
else
  echo "No running tasks found!"
fi

echo -e "\n🚨 Resource Recommendations:"
echo "- CPU consistently >70%: Consider increasing CPU allocation"
echo "- Memory consistently >70%: Consider increasing memory allocation"
echo "- Frequent scaling events: May need higher baseline resources"
echo "- Task restarts/failures: Check for out-of-memory kills"

echo -e "\n💡 Next Steps:"
echo "1. Run this script regularly to monitor trends"
echo "2. Set up CloudWatch alarms for proactive monitoring"
echo "3. Review application logs for errors: aws logs tail /ecs/sparta-production-api --region eu-west-2"
echo "4. Test your API health endpoint: curl -I http://YOUR_ALB_DNS_NAME/health" 