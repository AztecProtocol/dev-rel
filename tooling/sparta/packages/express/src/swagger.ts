import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sparta API',
      version: '1.0.0',
      description: 'API documentation for Sparta - Human Passport Verification',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `/api`,
        description: 'API Server',
      },
    ],
    components: {
      schemas: {
        Session: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Unique session identifier',
            },
            discordUserId: {
              type: 'string',
              description: 'Discord user ID',
            },
            walletAddress: {
              type: 'string',
              description: 'User wallet address',
            },
            verified: {
              type: 'boolean',
              description: 'Whether the session is verified',
            },
            status: {
              type: 'string',
              description: 'Current verification status',
              enum: ['pending', 'verified', 'failed']
            },
            score: {
              type: 'number',
              description: 'Human Passport verification score',
            },
            lastScoreTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of last score check',
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Session not found or expired'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export { swaggerSpec, swaggerUi }; 
