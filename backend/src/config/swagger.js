const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Concurrent Banking Transaction System API',
      version: '1.0.0',
      description:
        'REST API for a concurrent banking system with optimistic concurrency control, WebSocket real-time updates, and support for deposits, withdrawals, and transfers.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5050',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Account: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '67a1b2c3d4e5f6a7b8c9d0e1' },
            accountId: { type: 'string', example: 'ACC1001' },
            holderName: { type: 'string', example: 'John Doe' },
            balance: { type: 'number', example: 1000 },
            version: { type: 'integer', example: 1, description: 'Optimistic concurrency version' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['deposit', 'withdraw', 'transfer'],
            },
            fromAccount: { type: 'string', nullable: true },
            toAccount: { type: 'string', nullable: true },
            amount: { type: 'number', example: 500 },
            status: { type: 'string', enum: ['success', 'failed'] },
            errorMessage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {},
            error: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
