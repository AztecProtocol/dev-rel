output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.discord_bot.function_name
}

output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = "${aws_apigatewayv2_api.discord_webhook.api_endpoint}/discord-webhook"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.validator_ops.repository_url
}

output "cloudwatch_log_group_lambda" {
  description = "Name of the CloudWatch log group for Lambda"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "cloudwatch_log_group_api" {
  description = "Name of the CloudWatch log group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway.name
} 
