import api from './axios';

// Type definitions for API responses
interface ScoreResponse {
  success: boolean;
  score: number;
  status: string;
  minimumScore: number;
}

interface VerifyResponse {
  success: boolean;
  verified: boolean;
  score: number;
  roleAssigned: boolean;
  address: string;
  sessionStatus: string;
  message: string;
  minimumRequiredScore: number;
  highScoreThreshold: number;
  isHighScorer: boolean;
}

// Passport API services
export const passportService = {
  /**
   * Get the Gitcoin Passport score for a wallet address
   * @param address The wallet address to check
   * @param sessionId The session ID
   * @returns Promise with the score response
   */
  getScore: async (address: string, sessionId?: string): Promise<ScoreResponse> => {
    try {
      const { data } = await api.get<ScoreResponse>('/score', {
        params: { address, sessionId }
      });
      return data;
    } catch (error) {
      console.error('Error getting score:', error);
      throw error;
    }
  },

  /**
   * Verify a wallet signature for Gitcoin Passport
   * @param signature The wallet signature
   * @param sessionId The session ID
   * @returns Promise with the verification response
   */
  verifySignature: async (signature: string, sessionId: string): Promise<VerifyResponse> => {
    try {
      const { data } = await api.post<VerifyResponse>('/verify', {
        sessionId,
        signature
      });
      return data;
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw error;
    }
  },

  /**
   * Get session status
   * @param sessionId The session ID
   * @returns Promise with the session status
   */
  getSession: async (sessionId: string) => {
    try {
      const { data } = await api.get(`/session/${sessionId}`);
      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }
}; 
