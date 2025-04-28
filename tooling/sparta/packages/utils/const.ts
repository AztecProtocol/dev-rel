// Removed ADDRESSES_PER_PAGE constant as it's no longer used

export enum AdminSubcommandGroups {
	Admin = "admin",
}

export enum AdminSubcommands {
	Get = "get",
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

export enum PassportRoles {
	Verified = "Verified+", // Base role for verification
	HighScorer = "highscorer", // for users with scores over 10
}

export const VERIFICATION_STATUS = {
	PENDING: 'pending',
	SIGNATURE_RECEIVED: 'signature_received',
	VERIFICATION_FAILED: 'verification_failed',
	VERIFICATION_COMPLETE: 'verification_complete',
	ERROR: 'error'
};

// Verification Message
export const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";

// Removed old status constants related to background queue
