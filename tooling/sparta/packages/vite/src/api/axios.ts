import OpenAPIClientAxios from 'openapi-client-axios';


// Create an OpenAPIClientAxios instance with our spec
export const api = new OpenAPIClientAxios({
  definition: `${import.meta.env.VITE_PUBLIC_FRONTEND_URL}/api/api-docs.json`,
  axiosConfigDefaults: {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }
});
