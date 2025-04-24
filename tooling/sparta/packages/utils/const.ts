export const ADDRESSES_PER_PAGE = 20;

export enum AdminSubcommandGroups {
	Admin = "admin",
}

export enum AdminSubcommands {
	Get = "get",
	Committee = "committee",
	Validators = "validators",
	Remove = "remove",
	Fund = "fund",
}

export enum NodeOperatorSubcommandGroups {
	Operator = "operator",
}

export enum NodeOperatorSubcommands {
	ChainInfo = "chain-info",
}

export enum ValidatorSubcommandGroups {
	Validator = "validator",
}

export enum ValidatorSubcommands {
	Check = "check",
}

export enum NodeOperatorRoles {
	Guardian = "Guardian", // lowest level, requires minimum score of 0
	Defender = "Defender", // mid level, requires over 5
	HighScorer = "High Scorer", // for users with scores over 10
	Sentinel = "Sentinel", // set manually, but can be removed by this service
}

export enum PassportRoles {
	Verified = "Verified+", // Base role for verification
	HighScorer = "highscorer", // for users with scores over 10
}

export const MINIMUM_SCORE = 0;
export const HIGH_SCORE_THRESHOLD = 10;

// Session Statuses (Simplified)
export const STATUS_INITIATED = 'initiated'; // Session created, pre-wallet connect
export const STATUS_WALLET_CONNECTED = 'wallet_connected'; // Wallet connected, pre-signature
export const STATUS_SIGNATURE_RECEIVED = 'signature_received'; // Signature received, pre-score check
export const STATUS_SCORE_RETRIEVED = 'score_retrieved'; // Score checked, pre-role assignment (if verified)
export const STATUS_VERIFIED_COMPLETE = 'verified_complete'; // Verified and role assignment attempt finished (check roleAssigned flag)
export const STATUS_VERIFICATION_FAILED_SCORE = 'verification_failed_score'; // Score below threshold
export const STATUS_VERIFICATION_ERROR = 'verification_error'; // Generic error during process
export const STATUS_SESSION_EXPIRED = 'expired';
export const STATUS_SESSION_USED = 'used'; // Session successfully used for verification/status check

// Verification Message
export const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";

// Removed old status constants related to background queue
