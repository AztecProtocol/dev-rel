const { handler } = require('./lambda');
const { logger } = require('@sparta/utils');

// Mock AWS Lambda context
const mockContext = {
  awsRequestId: `local-${Date.now()}`,
  functionName: 'validator-monitor-local',
  getRemainingTimeInMillis: () => 300000, // 5 minutes
  callbackWaitsForEmptyEventLoop: true
};

// Mock scheduled event
const mockEvent = {
  source: 'aws.events',
  'detail-type': 'Scheduled Event',
  time: new Date().toISOString()
};

// Execute the Lambda function locally
async function invokeLocally() {
  logger.info('Invoking Lambda function locally...');
  
  try {
    const result = await handler(mockEvent, mockContext);
    console.log('Lambda execution result:', JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('Error invoking Lambda function locally:', error);
  }
}

// Run the local invocation
invokeLocally(); 