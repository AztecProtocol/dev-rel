# @sparta/scheduler

A serverless AWS Lambda-based service for monitoring validators and sending alerts when issues are detected.

## Overview

- Serverless AWS Lambda-based validator monitoring
- EventBridge scheduled triggers (default: hourly)
- Alerts sent to operators via Discord
- Summary reports posted to admin channels
- Lightweight Discord messaging via REST API

## Local Development

```bash
# Run locally
bun run dev
```

## Configuration

Required environment variables:

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

## Deployment

Deploy using Terraform (see project root's terraform directory):

```terraform
resource "aws_lambda_function" "validator_monitor" {
  function_name    = "sparta-validator-monitor"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "lambda.handler"
  runtime          = "nodejs18.x"
  filename         = "lambda-package.zip"
  timeout          = 300  # 5 minutes
  memory_size      = 256  # MB
  
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