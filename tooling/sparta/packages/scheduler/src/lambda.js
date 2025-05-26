// AWS Lambda handler for validator monitoring
const { logger } = require("@sparta/utils");
const { ValidatorMonitorService } = require('./validator-monitor');
const { CHANNELS } = require("@sparta/utils");
// Singleton validator monitor service instance
let validatorMonitor;

/**
 * Lambda handler for validator monitoring
 * Can be triggered by EventBridge scheduled events or manually invoked
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for event loop to empty before returning
  // Important for external connections like Discord API
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Initialize service if needed
    if (!validatorMonitor) {
      // validatorMonitor = await ValidatorMonitorService.new("zkpedro", CHANNELS.BOT_TEST?.id);
      validatorMonitor = await ValidatorMonitorService.new();

    }

    logger.info( {
      requestId: context.awsRequestId,
      eventSource: event.source || 'manual'
    },"Starting validator monitoring");
    
    // Run the validator monitoring process
    const reports = await validatorMonitor.monitorValidators();
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Validator monitoring completed successfully",
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId,
        reportsCount: reports.length,
        summary: reports.length > 0 ? "Issues detected" : "No validator issues detected"
      })
    };
  } catch (error) {
    // Log the error but don't crash the Lambda
    logger.error({
      error: error.message,
      stack: error.stack
    }, "Error in validator monitoring lambda");
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error executing validator monitoring",
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId
      })
    };
  }
}; 