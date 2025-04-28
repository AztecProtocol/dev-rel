import OpenAPIClientAxios from 'openapi-client-axios';
import { openApiDocument } from './openapi';
import type { Client as HumanAPIClient } from './client';


// Create an OpenAPIClientAxios instance with our spec
const api = new OpenAPIClientAxios({
  definition: openApiDocument,
  axiosConfigDefaults: {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }
});

// Store the initialized client
let client: HumanAPIClient | null = null;

// Initialize the client
export const getClient = async (): Promise<HumanAPIClient> => {
  if (!client) {
    try {
      const apiClient = await api.init<HumanAPIClient>();
      
      // Add interceptors
      apiClient.interceptors.request.use(
        (config: any) => {
          // You can modify request config here (add auth tokens, etc.)
          return config;
        },
        (error: any) => {
          return Promise.reject(error);
        }
      );
      
      apiClient.interceptors.response.use(
        (response: any) => {
          // You can transform successful responses here
          return response;
        },
        (error: any) => {
          // Handle common error cases
          if (error.response) {
            console.error('API Error Response:', error.response.status, error.response.data);
          } else if (error.request) {
            console.error('API Error Request:', error.request);
          } else {
            console.error('API Error:', error.message);
          }
          return Promise.reject(error);
        }
      );
      
      console.log('OpenAPI client initialized successfully');
      client = apiClient;
    } catch (error) {
      throw error;
    }
  }
  
  return client as HumanAPIClient;
};
