// Shared types for Sparta packages

export interface SessionData {
	sessionId: string;
	walletConnected: boolean;
	walletAddress: string | null;
	verified: boolean;
	status: string;
	score: number | null;
	lastScoreTimestamp: number | null;
} 
