const { ValidatorMonitorService } = require('./validator-monitor');
const { logger } = require('@sparta/utils');

/**
 * Test suite for ValidatorMonitorService
 * This test runs the validator monitor in a controlled environment
 * and validates the expected behavior and results.
 */
class ValidatorMonitorTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
    }

    /**
     * Assert helper function
     */
    assert(condition, message) {
        this.testResults.total++;
        if (condition) {
            this.testResults.passed++;
            logger.info(`✅ PASS: ${message}`);
        } else {
            this.testResults.failed++;
            const error = `❌ FAIL: ${message}`;
            logger.error(error);
            this.testResults.errors.push(error);
        }
    }

    /**
     * Test the main monitoring functionality
     */
    async testValidatorMonitoring() {
        logger.info('\n🧪 Testing Validator Monitoring...');
        
        try {
            // Create service instance with test parameters
            const service = await ValidatorMonitorService.new();
            
            // Run the monitoring process
            const startTime = Date.now();
            const reports = await service.monitorValidators();
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // Assert on results
            this.assert(Array.isArray(reports), 'Monitor should return an array of reports');
            this.assert(executionTime < 60000, 'Monitoring should complete within 60 seconds'); // Reasonable timeout
            
            logger.info(`📊 Monitoring completed in ${executionTime}ms, generated ${reports.length} reports`);
            
            // If we have reports, validate their structure
            if (reports.length > 0) {
                const sampleReport = reports[0];
                this.assert(
                    sampleReport.hasOwnProperty('validatorAddress'), 
                    'Reports should have validatorAddress field'
                );
                this.assert(
                    sampleReport.hasOwnProperty('operatorDiscordUsername'), 
                    'Reports should have operatorDiscordUsername field'
                );
                this.assert(
                    sampleReport.hasOwnProperty('messageContent'), 
                    'Reports should have messageContent field'
                );
                this.assert(
                    sampleReport.hasOwnProperty('timestamp'), 
                    'Reports should have timestamp field'
                );
                this.assert(
                    sampleReport.hasOwnProperty('dmSent'), 
                    'Reports should have dmSent field'
                );
                
                // Validate that when SKIP_MSG is set, no DMs are sent
                if (process.env.SKIP_MSG) {
                    this.assert(
                        sampleReport.dmSent === false, 
                        'When SKIP_MSG is set, no DMs should be sent'
                    );
                }
                
                logger.info(`📋 Sample report structure validated`);
            } else {
                logger.info(`✅ No validator issues detected (clean run)`);
            }
            
            return reports;
            
        } catch (error) {
            this.assert(false, `Validator monitoring failed: ${error.message}`);
            return [];
        }
    }


    /**
     * Run all tests
     */
    async runAllTests() {
        logger.info('🚀 Starting ValidatorMonitorService Test Suite...\n');
        
        const suiteStartTime = Date.now();
        
        // Run all test methods
        const reports = await this.testValidatorMonitoring();
        
        const suiteEndTime = Date.now();
        const totalTime = suiteEndTime - suiteStartTime;
        
        // Print summary
        logger.info('\n📊 Test Suite Summary:');
        logger.info(`⏱️  Total execution time: ${totalTime}ms`);
        logger.info(`✅ Tests passed: ${this.testResults.passed}`);
        logger.info(`❌ Tests failed: ${this.testResults.failed}`);
        logger.info(`📈 Total tests: ${this.testResults.total}`);
        logger.info(`📊 Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.errors.length > 0) {
            logger.error('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => logger.error(`  ${error}`));
        }
        
        // Log summary of monitoring results
        if (reports && reports.length > 0) {
            logger.info(`\n📋 Monitoring Results Summary:`);
            logger.info(`  - Generated ${reports.length} alert reports`);
            logger.info(`  - DMs sent: ${reports.filter(r => r.dmSent).length}`);
            logger.info(`  - DM failures: ${reports.filter(r => !r.dmSent && r.error).length}`);
        }
        
        // Exit with appropriate code
        const success = this.testResults.failed === 0;
        if (success) {
            logger.info('\n🎉 All tests passed!');
        } else {
            logger.error('\n💥 Some tests failed!');
        }
        
        return {
            success,
            results: this.testResults,
            reports
        };
    }
}

/**
 * Main test execution
 */
async function runTests() {
    // Set SKIP_MSG to true for testing to avoid sending actual messages
    const originalSkipMsg = process.env.SKIP_MSG;
    process.env.SKIP_MSG = 'true';
    
    // Suppress all console output during testing
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    
    console.log = () => {};
    console.error = () => {};
    console.info = () => {};
    console.warn = () => {};
    
    try {
        const testSuite = new ValidatorMonitorTest();
        
        // Override logger to be silent during test execution
        const originalLoggerInfo = logger.info;
        const originalLoggerError = logger.error;
        const originalLoggerWarn = logger.warn;
        
        logger.info = () => {};
        logger.error = () => {};
        logger.warn = () => {};
        
        const result = await testSuite.runAllTests();
        
        // Restore logger
        logger.info = originalLoggerInfo;
        logger.error = originalLoggerError;
        logger.warn = originalLoggerWarn;
        
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        
        // Only show the final result
        if (result.success) {
            console.log('✅ All tests passed!');
            process.exit(0);
        } else {
            console.error(`❌ ${result.results.failed}/${result.results.total} tests failed`);
            result.results.errors.forEach(error => console.error(error));
            process.exit(1);
        }
        
    } catch (error) {
        // Restore console first
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        
        console.error(`Critical test failure: ${error.message}`);
        process.exit(1);
    } finally {
        // Restore original environment
        if (originalSkipMsg !== undefined) {
            process.env.SKIP_MSG = originalSkipMsg;
        } else {
            delete process.env.SKIP_MSG;
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { ValidatorMonitorTest, runTests }; 