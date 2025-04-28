/**
 * OpenAPI specification for the Human API
 */

import { OpenAPIV3 } from 'openapi-client-axios';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Human API',
    version: '1.0.0',
    description: 'API for Human Passport verification'
  },
  servers: [
    {
      url: import.meta.env.VITE_PUBLIC_FRONTEND_URL + '/api',
    }
  ],
  paths: {
    '/human/score': {
      get: {
        operationId: 'getScore',
        summary: 'Get Gitcoin Passport score for a wallet address',
        parameters: [
          {
            name: 'address',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          },
          {
            name: 'verificationId',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response with score',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    score: {
                      type: 'number'
                    },
                    status: {
                      type: 'string'
                    },
                    minimumScore: {
                      type: 'number'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/human/verify': {
      post: {
        operationId: 'verifySignature',
        summary: 'Verify wallet signature for Gitcoin Passport',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  verificationId: {
                    type: 'string'
                  },
                  signature: {
                    type: 'string'
                  }
                },
                required: ['verificationId', 'signature']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful verification response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    verified: {
                      type: 'boolean'
                    },
                    score: {
                      type: 'number'
                    },
                    roleAssigned: {
                      type: 'boolean'
                    },
                    address: {
                      type: 'string'
                    },
                    status: {
                      type: 'string'
                    },
                    message: {
                      type: 'string'
                    },
                    minimumRequiredScore: {
                      type: 'number'
                    },
                    highScoreThreshold: {
                      type: 'number'
                    },
                    isHighScorer: {
                      type: 'boolean'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/human/status/{discordUserId}': {
      get: {
        operationId: 'getStatus',
        summary: 'Get verification status for a Discord user',
        parameters: [
          {
            name: 'discordUserId',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful verification status response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    verificationId: {
                      type: 'string'
                    },
                    walletConnected: {
                      type: 'boolean'
                    },
                    verified: {
                      type: 'boolean'
                    },
                    roleAssigned: {
                      type: 'boolean'
                    },
                    score: {
                      type: 'number'
                    },
                    status: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}; 
