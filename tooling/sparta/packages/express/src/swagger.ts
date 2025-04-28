import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { VERIFICATION_STATUS } from "@sparta/utils/const.js";

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
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
          description: 'API key for accessing protected endpoints'
        }
      },
      parameters: {
        ContentTypeHeader: {
          name: 'Content-Type',
          in: 'header',
          description: 'The content type of the request body',
          required: true,
          schema: {
            type: 'string',
            default: 'application/json'
          }
        },
        AcceptHeader: {
          name: 'Accept',
          in: 'header',
          description: 'The requested content type for the response',
          required: false,
          schema: {
            type: 'string',
            default: 'application/json'
          }
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            discordUserId: {
              type: 'string',
              description: 'Discord user ID'
            },
            discordUsername: {
              type: 'string',
              description: 'Discord username'
            },
            walletAddress: {
              type: 'string',
              nullable: true,
              description: 'User wallet address'
            },
            verified: {
              type: 'boolean',
              description: 'Whether the user has been verified through Human Passport'
            },
            passportScore: {
              type: 'number',
              nullable: true,
              description: 'Human Passport verification score'
            },
            createdAt: {
              type: 'number',
              description: 'Timestamp when user was created'
            },
            updatedAt: {
              type: 'number',
              description: 'Timestamp when user was last updated'
            },
            lastVerificationTime: {
              type: 'number',
              nullable: true,
              description: 'When they last completed verification'
            },
            verificationId: {
              type: 'string',
              nullable: true,
              description: 'ID used for the verification process'
            },
            verificationStatus: {
              type: 'string',
              nullable: true,
              description: 'Current status of verification',
              enum: Object.values(VERIFICATION_STATUS)
            },
            verificationSignature: {
              type: 'string',
              nullable: true,
              description: 'Signature provided during verification'
            },
            interactionToken: {
              type: 'string',
              nullable: true,
              description: 'Discord interaction token'
            },
            roleAssigned: {
              type: 'boolean',
              nullable: true,
              description: 'Whether Discord roles were assigned'
            }
          }
        },
        VerificationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful'
            },
            verificationId: {
              type: 'string',
              description: 'Unique verification identifier'
            },
            verificationUrl: {
              type: 'string',
              description: 'URL for the verification process'
            }
          }
        },
        VerificationStatusResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful'
            },
            verificationId: {
              type: 'string',
              description: 'Verification identifier'
            },
            walletConnected: {
              type: 'boolean',
              description: 'Whether a wallet is connected'
            },
            signatureReceived: {
              type: 'boolean',
              description: 'Whether a signature was received'
            },
            verified: {
              type: 'boolean',
              description: 'Whether the user is verified'
            },
            roleAssigned: {
              type: 'boolean',
              description: 'Whether roles were assigned in Discord'
            },
            score: {
              type: 'number',
              nullable: true,
              description: 'Passport score'
            },
            status: {
              type: 'string',
              description: 'Current verification status',
              enum: Object.values(VERIFICATION_STATUS)
            },
            minimumRequiredScore: {
              type: 'number',
              description: 'Minimum score required for verification'
            },
            highScoreThreshold: {
              type: 'number',
              description: 'Threshold for high scorer status'
            },
            isHighScorer: {
              type: 'boolean',
              description: 'Whether the user is a high scorer'
            },
            lastChecked: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the last status check'
            }
          }
        },
        ScoreResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the score check succeeded or met threshold'
            },
            score: {
              type: 'number',
              description: 'Passport score'
            },
            status: {
              type: 'string',
              description: 'Status of the score check',
              enum: [...Object.values(VERIFICATION_STATUS), 'score_sufficient']
            },
            minimumScore: {
              type: 'number',
              description: 'Minimum required score'
            },
            error: {
              type: 'string',
              description: 'Error message if operation failed'
            }
          }
        },
        VerifyResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the verification was successful'
            },
            verified: {
              type: 'boolean',
              description: 'Whether the user is verified'
            },
            score: {
              type: 'number',
              description: 'Passport score'
            },
            roleAssigned: {
              type: 'boolean',
              description: 'Whether Discord roles were assigned'
            },
            address: {
              type: 'string',
              description: 'Recovered wallet address'
            },
            verificationStatus: {
              type: 'string',
              description: 'Status of the verification process',
              enum: Object.values(VERIFICATION_STATUS)
            },
            message: {
              type: 'string',
              description: 'Message describing the verification result'
            },
            minimumRequiredScore: {
              type: 'number',
              description: 'Minimum score required for verification'
            },
            highScoreThreshold: {
              type: 'number',
              description: 'Threshold for high scorer status'
            },
            isHighScorer: {
              type: 'boolean',
              description: 'Whether the user is a high scorer'
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
            },
            verificationStatus: {
              type: 'string',
              description: 'Status when an error occurred',
              enum: [VERIFICATION_STATUS.ERROR]
            }
          }
        }
      }
    },
    paths: {
      '/api/human/verify': {
        post: {
          operationId: 'verifySignature',
          summary: 'Verify a wallet signature',
          // ... existing code ...
        }
      },
      '/api/human/status/{discordUserId}': {
        get: {
          operationId: 'getStatus',
          summary: 'Check verification status by Discord user ID',
          // ... existing code ...
        }
      },
      '/api/human/score': {
        get: {
          operationId: 'getScore',
          summary: 'Get passport score for a given address and verification',
          // ... existing code ...
        }
      },
      '/api/users': {
        get: {
          operationId: 'getUsers',
          summary: 'Get all users',
          // ... existing code ...
        },
        post: {
          operationId: 'createUser',
          summary: 'Create a new user',
          // ... existing code ...
        }
      },
      '/api/users/{discordUserId}': {
        get: {
          operationId: 'getUserByDiscordId',
          summary: 'Get a specific user by Discord user ID',
          // ... existing code ...
        },
        put: {
          operationId: 'updateUser',
          summary: 'Update a user',
          // ... existing code ...
        },
        delete: {
          operationId: 'deleteUser',
          summary: 'Delete a user',
          // ... existing code ...
        }
      },
      '/api/users/wallet/{walletAddress}': {
        get: {
          operationId: 'getUserByWallet',
          summary: 'Get a user by wallet address',
          // ... existing code ...
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export { swaggerSpec, swaggerUi };
