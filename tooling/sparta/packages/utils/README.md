# @sparta/utils

Shared utilities for the Sparta Discord bot and supporting services.

## Overview

This package provides common utilities and shared functionality used across the Sparta project:

- Logging with configurable levels and formats
- DynamoDB interactions for session and data storage
- Constants and configuration values
- OpenAPI definitions and client generators

## Usage

```typescript
// Import utilities
import { logger, dynamoDB as DynamoDBServiceClass } from '@sparta/utils';

// Use logger
logger.info('This is an informational message');
logger.error({ err: new Error('example') }, 'An error occurred');

// Use DynamoDBService
// 1. Instantiate the service for a specific table
const myTableService = new DynamoDBServiceClass('your-table-name');

// 2. Get the configured client
const docClient = myTableService.getClient();

// 3. Use the client with DynamoDB commands (example)
// async function getItemExample(key: any) {
//   const command = new GetCommand({ TableName: myTableService.getTableName(), Key: key });
//   try {
//     const data = await docClient.send(command);
//     logger.info({ data }, "Item retrieved");
//     return data.Item;
//   } catch (err) {
//     logger.error({ err }, "Error getting item");
//   }
// }
```

## Components

### Logger

Configurable logging utility built on Pino:

```typescript
import { logger } from '@sparta/utils';

// Different log levels
logger.trace('Detailed trace information');
logger.debug('Debug information');
logger.info('General information');
logger.warn('Warning');
logger.error('Error information');
logger.fatal('Critical error');
```

Configuration via environment variables:
- `LOG_LEVEL`: Set minimum log level (trace, debug, info, warn, error, fatal)
- `LOG_PRETTY_PRINT`: Enable/disable formatted logs (true/false)

### DynamoDB Client

The `DynamoDBService` class provides a convenient way to get a configured AWS SDK v3 `DynamoDBDocumentClient` for a specific DynamoDB table.

**Setup:**

Import the class from `@sparta/utils`:
```typescript
import { dynamoDB as DynamoDBServiceClass } from '@sparta/utils';
// or
// import DynamoDBServiceClass from '@sparta/utils/dynamo-db'; // if importing directly
```

**Instantiate for your table:**
```typescript
const TABLE_NAME = process.env.MY_DYNAMODB_TABLE || 'my-default-table';
const dbService = new DynamoDBServiceClass(TABLE_NAME);
```

**Get the client:**
The `getClient()` method returns an instance of `DynamoDBDocumentClient`.
```typescript
const docClient = dbService.getClient();
```

**Example: Putting an item:**
```typescript
import { PutCommand } from "@aws-sdk/lib-dynamodb";

async function createItem(itemData: Record<string, any>) {
  const command = new PutCommand({
    TableName: dbService.getTableName(), // Use getTableName() for safety
    Item: itemData,
  });

  try {
    await docClient.send(command);
    logger.info({ itemData }, "Successfully put item into table");
    return true;
  } catch (err) {
    logger.error({ err }, "Error putting item into table");
    return false;
  }
}

// Example usage:
// createItem({ id: 'example-123', name: 'Test Item', value: 100 });
```

The service handles local DynamoDB configuration via `LOCAL_DYNAMO_DB` and `DYNAMODB_ENDPOINT` environment variables.

### Constants

Shared constants used across the project:

```typescript
import { ROLE_NAMES } from '@sparta/utils/const';

console.log(ROLE_NAMES.SENTINEL); // "Sentinel"
```

### OpenAPI

OpenAPI schema and client generators:

```typescript
import { apiDocs } from '@sparta/utils';
import { ApiProvider } from '@sparta/utils/openapi/api/apiProvider';

// Use API docs for documentation
console.log(apiDocs.info.title);

// Create API client
const apiClient = await ApiProvider.getClient();
```

## Development

To build types:

```bash
bun run types
``` 