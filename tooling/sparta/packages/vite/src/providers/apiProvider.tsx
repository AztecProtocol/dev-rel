import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { api as openapi } from '../api/axios';
import {
  OpenAPIClient,
  UnknownOperationMethods,
  UnknownPathsDictionary,
} from 'openapi-client-axios';

export const ApiContext = createContext<
  OpenAPIClient<UnknownOperationMethods, UnknownPathsDictionary> | null
>(null);

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [client, setClient] = useState<
    OpenAPIClient<UnknownOperationMethods, UnknownPathsDictionary> | null
  >(null);
  const [error, setError] = useState<Error | null>(null);
    
  useEffect(() => {
    const initApi = async () => {
      try {
        // init() itself *is* your client
        const clientInstance = await openapi.init();
        setClient(clientInstance);
      } catch (err) {
        setError(err as Error);
      }
    };
    initApi();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            API Initialization Error
          </h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing API...</p>
        </div>
      </div>
    );
  }

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};
