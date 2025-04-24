/**
 * @fileoverview Simple in-memory database for session management during verification.
 * @description Stores temporary session data associated with a verification process.
 *              Includes basic session timeout/cleanup.
 */

// Consider adding logger import: import { logger } from './logger';

interface Session {
	discordUserId: string; // Provided when session is initiated (likely by the bot)
	walletAddress: string | null;
	signature: string | null; // Might be stored after verification attempt
	verified: boolean;
	roleAssigned: boolean;
	score: number | null; // Score from passport/verification
	createdAt: number; // Timestamp (ms) for expiration
	lastScoreTimestamp: number | null; // Timestamp when the score was last updated
	status: string; // Current status of the verification process
}

const sessions = new Map<string, Session>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes session validity

/**
 * Removes expired sessions from the map.
 */
const cleanupExpiredSessions = () => {
	const now = Date.now();
	let deletedCount = 0;
	for (const [sessionId, session] of sessions.entries()) {
		if (now - session.createdAt > SESSION_TIMEOUT_MS) {
			sessions.delete(sessionId);
			deletedCount++;
		}
	}
	if (deletedCount > 0) {
		// logger?.debug(`Cleaned up ${deletedCount} expired sessions.`);
	}
};

/**
 * Retrieves a session if it exists and hasn't expired.
 * @param sessionId The session ID to look up.
 * @returns The session object or undefined.
 */
const getSession = (sessionId: string): Session | undefined => {
	cleanupExpiredSessions(); // Run cleanup on access
	return sessions.get(sessionId);
};

/**
 * Updates specific fields of an existing session.
 * @param sessionId The ID of the session to update.
 * @param updates An object containing fields to update.
 * @returns True if the session was found and updated, false otherwise.
 */
const updateSession = (
	sessionId: string,
	updates: Partial<Omit<Session, "discordUserId" | "createdAt">>
): boolean => {
	const session = getSession(sessionId); // Use getSession to ensure it's not expired
	if (!session) {
		// logger?.warn({ sessionId }, "Attempted to update non-existent or expired session.");
		return false;
	}
	// Update the session object in the map
	Object.assign(session, updates);
	sessions.set(sessionId, session); // Re-set to update the map entry
	return true;
};

/**
 * Updates the wallet address for a given session.
 * @param sessionId The session ID.
 * @param walletAddress The wallet address to store.
 * @returns True if successful, false otherwise.
 */
const updateWalletAddress = (
	sessionId: string,
	walletAddress: string
): boolean => {
	return updateSession(sessionId, { walletAddress });
};

/**
 * Updates the signature for a given session.
 * @param sessionId The session ID.
 * @param signature The signature to store.
 * @returns True if successful, false otherwise.
 */
const updateSignature = (sessionId: string, signature: string): boolean => {
	return updateSession(sessionId, { signature });
};

/**
 * Updates the passport score for a given session.
 * @param sessionId The session ID.
 * @param score The score to store.
 * @returns True if successful, false otherwise.
 */
const updatePassportScore = (
	sessionId: string,
	score: number | null
): boolean => {
	return updateSession(sessionId, { score });
};

/**
 * Marks the role as assigned for a given session.
 * @param sessionId The session ID.
 * @returns True if successful, false otherwise.
 */
const markRoleAssigned = (sessionId: string): boolean => {
	return updateSession(sessionId, { roleAssigned: true });
};

/**
 * Updates the verification status and score for a given session.
 * NOTE: Renamed for export.
 * @param sessionId The session ID.
 * @param verified The verification status.
 * @param score The associated score (optional).
 * @returns True if successful, false otherwise.
 */
const updateVerificationStatus = (
	sessionId: string,
	verified: boolean,
	score: number | null = null
): boolean => {
	return updateSession(sessionId, { verified, score });
};

// --- Functions potentially called by Discord Bot ---

/**
 * Creates a new session. Should be called by the initiating process (e.g., Discord bot).
 * @param sessionId A unique ID for the session.
 * @param discordUserId The Discord user ID associated with the session.
 * @returns The created session object or undefined if ID already exists.
 */
const createSession = (
	sessionId: string,
	discordUserId: string
): Session | undefined => {
	cleanupExpiredSessions();
	if (sessions.has(sessionId)) {
		// logger?.warn({ sessionId }, "Session ID collision detected during creation.");
		return undefined; // Or handle as needed (e.g., return existing)
	}
	const newSession: Session = {
		discordUserId,
		walletAddress: null,
		signature: null,
		verified: false,
		roleAssigned: false,
		score: null,
		createdAt: Date.now(),
		lastScoreTimestamp: null,
		status: "pending", // Initial status
	};
	sessions.set(sessionId, newSession);
	// logger?.info({ sessionId, discordUserId }, "Created new verification session.");
	return newSession;
};

/**
 * Finds the most recent, non-expired session for a Discord user.
 * @param discordUserId The Discord user ID to search for.
 * @returns The most recent session object or undefined if none found.
 */
const findSessionByDiscordId = (discordUserId: string): Session | undefined => {
	cleanupExpiredSessions();
	let latestSession: Session | undefined;
	for (const session of sessions.values()) {
		if (session.discordUserId === discordUserId) {
			if (!latestSession || session.createdAt > latestSession.createdAt) {
				latestSession = session;
			}
		}
	}
	return latestSession;
};

/**
 * Updates the verification status and score for a given session.
 * NOTE: Not part of the default export used by the API, but might be needed internally.
 * @param sessionId The session ID.
 * @param verified The verification status.
 * @param score The associated score (optional).
 * @returns True if successful, false otherwise.
 */
export const _internal_updateVerificationStatus = (
	sessionId: string,
	verified: boolean,
	score: number | null = null
): boolean => {
	return updateSession(sessionId, { verified, score });
};

/**
 * Updates the role assigned status for a given session.
 * NOTE: Not part of the default export used by the API, but might be needed internally.
 * @param sessionId The session ID.
 * @param roleAssigned Whether the role was assigned.
 * @returns True if successful, false otherwise.
 */
export const _internal_updateRoleAssigned = (
	sessionId: string,
	roleAssigned: boolean
): boolean => {
	return updateSession(sessionId, { roleAssigned });
};

// --- Default Export (for API/Service usage) ---

const inMemoryDB = {
	createSession,
	getSession,
	findSessionByDiscordId,
	updateWalletAddress,
	updateSignature,
	updatePassportScore,
	markRoleAssigned,
	updateVerificationStatus,
	updateSession,
};

export default inMemoryDB;

// Export constants if needed elsewhere
export { SESSION_TIMEOUT_MS };
