# @sparta/scheduler

A serverless AWS Lambda-based service for monitoring validators and sending alerts when issues are detected.

## Features

- Serverless AWS Lambda-based validator monitoring
- EventBridge scheduled triggers (default: hourly)
- Alerts sent to operators via Discord
- Summary reports posted to admin channels
- AWS Lambda best practices for error handling and performance
- Lightweight Discord messaging via REST API (no full client initialization)

## Installation

```bash
# From the root of the project
bun add @sparta/scheduler
```

## Local Development

### Prerequisites

- AWS CLI configured with appropriate credentials
- Environment variables set up

### Environment Variables

```
# API Configuration
API_URL=http://localhost:3000
BACKEND_API_KEY=your-api-key

# AWS Configuration
AWS_REGION=eu-west-2

# Discord Configuration
NODE_ENV=development  # Use 'production' for live systems
BOT_TOKEN=your-discord-bot-token
BOT_CLIENT_ID=your-discord-client-id
GUILD_ID=your-discord-guild-id

# Logging
LOG_LEVEL=debug
```

### Running Locally

```bash
# In the Sparta project root directory
./tooling/sparta/packages/scheduler/run-local.sh
```

## Deployment

Deploy to AWS Lambda using the included script or Terraform config:

```bash
# Set required environment variables first
export API_URL=https://api.example.com
export BACKEND_API_KEY=your-production-api-key
export BOT_TOKEN=your-discord-bot-token
export BOT_CLIENT_ID=your-discord-client-id
export GUILD_ID=your-discord-guild-id
export NODE_ENV=production
export LOG_LEVEL=info
export AWS_REGION=eu-west-2

# Deploy to AWS Lambda
./tooling/sparta/packages/scheduler/deploy-lambda.sh
```

### Terraform Deployment

For production deployments, use Terraform:

```terraform
resource "aws_lambda_function" "validator_monitor" {
  function_name    = "sparta-validator-monitor"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "lambda.handler"
  runtime          = "nodejs18.x"
  filename         = "lambda-package.zip"
  timeout          = 300  # 5 minutes
  memory_size      = 256  # MB - reduced from 512MB as we don't need full Discord client
  
  environment {
    variables = {
      NODE_ENV        = var.environment
      API_URL         = "http://${aws_lb.sparta_alb.dns_name}"
      BACKEND_API_KEY = var.backend_api_key
      BOT_TOKEN       = var.discord_bot_token
      BOT_CLIENT_ID   = var.discord_client_id
      GUILD_ID        = var.discord_guild_id
      LOG_LEVEL       = var.log_level
    }
  }
}

# EventBridge rule to trigger Lambda hourly
resource "aws_cloudwatch_event_rule" "hourly_check" {
  name                = "sparta-hourly-validator-check"
  description         = "Trigger validator monitoring hourly"
  schedule_expression = "rate(1 hour)"
}

# Target the Lambda function
resource "aws_cloudwatch_event_target" "invoke_lambda" {
  rule      = aws_cloudwatch_event_rule.hourly_check.name
  target_id = "InvokeValidatorMonitor"
  arn       = aws_lambda_function.validator_monitor.arn
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.validator_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_check.arn
}
```

## AWS Lambda Best Practices

This implementation follows AWS Lambda best practices:

1. **Optimized handler**: Streamlined execution with minimal overhead
2. **Proper error handling**: All errors are caught and logged without crashing Lambda
3. **Connection reuse**: API connections are reused between invocations
4. **callbackWaitsForEmptyEventLoop = false**: Lambda returns promptly without waiting for event loop
5. **Minimal dependencies**: Only requires essential packages
6. **Efficient validation logic**: Early returns for valid validators
7. **Lightweight Discord messaging**: Uses REST API instead of full Discord client

## License

See the project license for details. 