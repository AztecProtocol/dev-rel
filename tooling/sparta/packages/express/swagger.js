import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title:   'Sparta API',
    version: '1.0.0',
  },
  host:    'localhost:3000',
  basePath:'/',
  components: {
    schemas: { /* … */ },
    securitySchemes: { /* … */ },
  },
};

const outputFile   = './api-docs.json';
const endpoints    = ['./src/index.ts']; 

swaggerAutogen({ language: 'node' })(outputFile, endpoints, doc)
  .then(() => {
    console.log('✅ swagger-autogen complete');
  });
