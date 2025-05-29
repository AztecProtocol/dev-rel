import axios, { type AxiosRequestConfig } from "axios";

export const BASE_URL = "http://localhost:3000";
export const API_KEY = "test_key_12345";

// Test data
export const testOperator = {
  discordId: "123456789012345678",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  discordUsername: "testuser#1234"
};

export const updatedWalletAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

export const testValidatorAddress = "0xabcdef1234567890abcdef1234567890abcdef13";
export const testValidatorAddress2 = "0x9876543210fedcba9876543210fedcba98765432";

export const validatorTestOperator = {
  discordId: "validator_test_operator_123",
  walletAddress: "0x1111111111111111111111111111111111111111",
  discordUsername: "validatortest#1234"
};

export const validatorTestOperator2 = {
  discordId: "validator_test_operator_456", 
  walletAddress: "0x2222222222222222222222222222222222222222",
  discordUsername: "validatortest2#5678"
};

export async function waitForEthereumReady(
  timeoutMs: number = 1200000,
  retryIntervalMs: number = 2000
): Promise<void> {
  const startTime = Date.now();
  const endpoint = "/api/ethereum/rollup/validators";
  let attempt = 0;

  console.log(`Starting Ethereum health check by polling ${process.env.API_URL}${endpoint}...`);

  while (Date.now() - startTime < timeoutMs) {
    attempt++;
    
    try {
      const response = await makeAPIRequest("GET", endpoint);

      if (response.status === 200) {
        const data = response.data as { data?: string[] };
        console.log(`✅ Ethereum network is ready! (attempt ${attempt}, ${Date.now() - startTime}ms)`);
        console.log(`Found ${data.data?.length || 0} validators`);
        return; // Success!
      } else {
        console.log(`⏳ Ethereum not ready yet - HTTP ${response.status} (attempt ${attempt})`);
      }

    } catch (error: any) {
      console.log(`⏳ Ethereum not ready yet - ${error.message} (attempt ${attempt})`);
    }

    // Wait before next attempt, but don't wait if we're about to timeout
    const remainingTime = timeoutMs - (Date.now() - startTime);
    if (remainingTime > retryIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    } else if (remainingTime > 0) {
      // Wait for the remaining time
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
  }

  // If we get here, we've timed out
  const elapsedTime = Date.now() - startTime;
  throw new Error(`❌ Ethereum health check timed out after ${elapsedTime}ms (${attempt} attempts). The Anvil network may not be running or accessible.`);
}

// Helper functions
export async function makeAPIRequest(method: string, endpoint: string, { params, data }: { params?: any, data?: any } = {}) {
  const config: AxiosRequestConfig = {
    method,
    url: `${process.env.API_URL}${endpoint}`,
    headers: {
      "x-api-key": process.env.BACKEND_API_KEY,
      "Content-Type": "application/json"
    },
    data,
    params
  };

  try {
    return await axios(config);
  } catch (error: any) {
    // Create a cleaner error object to avoid massive dumps
    const cleanError = new Error();
    cleanError.name = "APIRequestError";
    cleanError.message = `${method} ${endpoint} failed`;
    
    // Add essential error information without the massive object dump
    (cleanError as any).response = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    };
    
    // Add request information for debugging
    (cleanError as any).request = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data
    };
    
    throw cleanError;
  }
} 