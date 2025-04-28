import { getClient } from './axios';
import type { Components } from './client';

// Using types from the generated client.d.ts
type ScoreResponse = Components.Schemas.ScoreResponse;
type VerifyResponse = Components.Schemas.VerifyResponse;
type VerificationStatusResponse = Components.Schemas.VerificationStatusResponse;

// Human API services
export const humanService = {
  /**
   * Get the Gitcoin Passport score for a wallet address
   * @param address The wallet address to check
   * @param verificationId The verification ID
   * @returns Promise with the score response
   */
  getScore: async (address: string, verificationId: string): Promise<ScoreResponse> => {
    try {
      const client = await getClient();
      // Using the actual operationId from the OpenAPI spec
      const { data } = await client.getScore({ address, verificationId });
      return data;
    } catch (error) {
      console.error('Error getting score:', error);
      throw error;
    }
  },

  /**
   * Verify a wallet signature for Gitcoin Passport
   * @param signature The wallet signature
   * @param verificationId The verification ID
   * @returns Promise with the verification response
   */
  verifySignature: async (signature: string, verificationId: string): Promise<VerifyResponse> => {
    try {
      const client = await getClient();
      // Using the correct parameters format
      const { data } = await client.verifySignature({ verificationId }, { signature, verificationId });
      return data;
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw error;
    }
  },

  /**
   * Get status for a Discord user
   * @param discordUserId The Discord user ID
   * @returns Promise with the status response
   */
  getStatus: async (discordUserId: string): Promise<VerificationStatusResponse> => {
    try {
      const client = await getClient();
      const { data } = await client.getStatus({ discordUserId });
      return data;
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }
};

// Export the legacy name for backward compatibility
export const passportService = humanService; 
