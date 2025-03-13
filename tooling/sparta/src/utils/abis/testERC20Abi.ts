/**
 * TestERC20 ABI.
 */
export const TestERC20Abi = [
	{
		type: "constructor",
		inputs: [
			{
				name: "_name",
				type: "string",
				internalType: "string",
			},
			{
				name: "_symbol",
				type: "string",
				internalType: "string",
			},
			{
				name: "_owner",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "Approval",
		inputs: [
			{
				name: "owner",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "spender",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "value",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "error",
		name: "CoinIssuer__InsufficientMintAvailable",
		inputs: [
			{
				name: "available",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "needed",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "DevNet__InvalidProposer",
		inputs: [
			{
				name: "expected",
				type: "address",
				internalType: "address",
			},
			{
				name: "actual",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "DevNet__NoPruningAllowed",
		inputs: [],
	},
	{
		type: "error",
		name: "ERC20InsufficientAllowance",
		inputs: [
			{
				name: "spender",
				type: "address",
				internalType: "address",
			},
			{
				name: "allowance",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "needed",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "ERC20InsufficientBalance",
		inputs: [
			{
				name: "sender",
				type: "address",
				internalType: "address",
			},
			{
				name: "balance",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "needed",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "ERC20InvalidApprover",
		inputs: [
			{
				name: "approver",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "ERC20InvalidReceiver",
		inputs: [
			{
				name: "receiver",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "ERC20InvalidSender",
		inputs: [
			{
				name: "sender",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "ERC20InvalidSpender",
		inputs: [
			{
				name: "spender",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "FeeJuicePortal__AlreadyInitialized",
		inputs: [],
	},
	{
		type: "error",
		name: "FeeJuicePortal__InvalidInitialization",
		inputs: [],
	},
	{
		type: "error",
		name: "FeeJuicePortal__Unauthorized",
		inputs: [],
	},
	{
		type: "error",
		name: "FeeMath__InvalidFeeAssetPriceModifier",
		inputs: [],
	},
	{
		type: "error",
		name: "FeeMath__InvalidProvingCostModifier",
		inputs: [],
	},
	{
		type: "error",
		name: "GovernanceProposer__CanOnlyExecuteProposalInPast",
		inputs: [],
	},
	{
		type: "error",
		name: "GovernanceProposer__FailedToPropose",
		inputs: [
			{
				name: "proposal",
				type: "address",
				internalType: "contract IPayload",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__InstanceHaveNoCode",
		inputs: [
			{
				name: "instance",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__InsufficientVotes",
		inputs: [
			{
				name: "votesCast",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "votesNeeded",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__InvalidNAndMValues",
		inputs: [
			{
				name: "n",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "m",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__NCannotBeLargerTHanM",
		inputs: [
			{
				name: "n",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "m",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__OnlyProposerCanVote",
		inputs: [
			{
				name: "caller",
				type: "address",
				internalType: "address",
			},
			{
				name: "proposer",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__ProposalAlreadyExecuted",
		inputs: [
			{
				name: "roundNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__ProposalCannotBeAddressZero",
		inputs: [],
	},
	{
		type: "error",
		name: "GovernanceProposer__ProposalHaveNoCode",
		inputs: [
			{
				name: "proposal",
				type: "address",
				internalType: "contract IPayload",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__ProposalTooOld",
		inputs: [
			{
				name: "roundNumber",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "currentRoundNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "GovernanceProposer__VoteAlreadyCastForSlot",
		inputs: [
			{
				name: "slot",
				type: "uint256",
				internalType: "Slot",
			},
		],
	},
	{
		type: "error",
		name: "Governance__CallFailed",
		inputs: [
			{
				name: "target",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Governance__CallerNotGovernanceProposer",
		inputs: [
			{
				name: "caller",
				type: "address",
				internalType: "address",
			},
			{
				name: "governanceProposer",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Governance__CallerNotSelf",
		inputs: [
			{
				name: "caller",
				type: "address",
				internalType: "address",
			},
			{
				name: "self",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Governance__CannotCallAsset",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__DifferentialTooBig",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__DifferentialTooSmall",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__InvalidMinimumVotes",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__LockAmountTooSmall",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__QuorumTooBig",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__QuorumTooSmall",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__TimeTooBig",
		inputs: [
			{
				name: "name",
				type: "string",
				internalType: "string",
			},
		],
	},
	{
		type: "error",
		name: "Governance__ConfigurationLib__TimeTooSmall",
		inputs: [
			{
				name: "name",
				type: "string",
				internalType: "string",
			},
		],
	},
	{
		type: "error",
		name: "Governance__InsufficientPower",
		inputs: [
			{
				name: "voter",
				type: "address",
				internalType: "address",
			},
			{
				name: "have",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "required",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Governance__InvalidConfiguration",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__NoCheckpointsFound",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalAlreadyDropped",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalCannotBeDropped",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalDoesNotExists",
		inputs: [
			{
				name: "proposalId",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Governance__ProposalLib__MoreVoteThanExistNeeded",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalLib__MoreYeaVoteThanExistNeeded",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalLib__ZeroMinimum",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalLib__ZeroVotesNeeded",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalLib__ZeroYeaVotesNeeded",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalNotActive",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__ProposalNotExecutable",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__UserLib__NotInPast",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__WithdrawalAlreadyclaimed",
		inputs: [],
	},
	{
		type: "error",
		name: "Governance__WithdrawalNotUnlockedYet",
		inputs: [
			{
				name: "currentTime",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "unlocksAt",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
	},
	{
		type: "error",
		name: "HeaderLib__InvalidHeaderSize",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "HeaderLib__InvalidSlotNumber",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "Slot",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "Slot",
			},
		],
	},
	{
		type: "error",
		name: "Inbox__ActorTooLarge",
		inputs: [
			{
				name: "actor",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Inbox__ContentTooLarge",
		inputs: [
			{
				name: "content",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Inbox__MustBuildBeforeConsume",
		inputs: [],
	},
	{
		type: "error",
		name: "Inbox__SecretHashTooLarge",
		inputs: [
			{
				name: "secretHash",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Inbox__Unauthorized",
		inputs: [],
	},
	{
		type: "error",
		name: "MerkleLib__InvalidRoot",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "leaf",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "leafIndex",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__AlreadyNullified",
		inputs: [
			{
				name: "l2BlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "leafIndex",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__BlockNotProven",
		inputs: [
			{
				name: "l2BlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__IncompatibleEntryArguments",
		inputs: [
			{
				name: "messageHash",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "storedFee",
				type: "uint64",
				internalType: "uint64",
			},
			{
				name: "feePassed",
				type: "uint64",
				internalType: "uint64",
			},
			{
				name: "storedVersion",
				type: "uint32",
				internalType: "uint32",
			},
			{
				name: "versionPassed",
				type: "uint32",
				internalType: "uint32",
			},
			{
				name: "storedDeadline",
				type: "uint32",
				internalType: "uint32",
			},
			{
				name: "deadlinePassed",
				type: "uint32",
				internalType: "uint32",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__InvalidChainId",
		inputs: [],
	},
	{
		type: "error",
		name: "Outbox__InvalidPathLength",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__InvalidRecipient",
		inputs: [
			{
				name: "expected",
				type: "address",
				internalType: "address",
			},
			{
				name: "actual",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__InvalidVersion",
		inputs: [
			{
				name: "entry",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "message",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__NothingToConsume",
		inputs: [
			{
				name: "messageHash",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__NothingToConsumeAtBlock",
		inputs: [
			{
				name: "l2BlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__RootAlreadySetAtBlock",
		inputs: [
			{
				name: "l2BlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Outbox__Unauthorized",
		inputs: [],
	},
	{
		type: "error",
		name: "OwnableInvalidOwner",
		inputs: [
			{
				name: "owner",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "OwnableUnauthorizedAccount",
		inputs: [
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "event",
		name: "OwnershipTransferred",
		inputs: [
			{
				name: "previousOwner",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "newOwner",
				type: "address",
				indexed: true,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "error",
		name: "ProofCommitmentEscrow__InsufficientBalance",
		inputs: [
			{
				name: "balance",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "requested",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "ProofCommitmentEscrow__NotOwner",
		inputs: [
			{
				name: "caller",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "ProofCommitmentEscrow__WithdrawRequestNotReady",
		inputs: [
			{
				name: "current",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "readyAt",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
	},
	{
		type: "error",
		name: "Registry__RollupAlreadyRegistered",
		inputs: [
			{
				name: "rollup",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Registry__RollupNotRegistered",
		inputs: [
			{
				name: "rollup",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "RewardDistributor__InvalidCaller",
		inputs: [
			{
				name: "caller",
				type: "address",
				internalType: "address",
			},
			{
				name: "canonical",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InsufficientBondAmount",
		inputs: [
			{
				name: "minimum",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "provided",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InsufficientFundsInEscrow",
		inputs: [
			{
				name: "required",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "available",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidArchive",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBasisPointFee",
		inputs: [
			{
				name: "basisPointFee",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBlobHash",
		inputs: [
			{
				name: "blobHash",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBlobProof",
		inputs: [
			{
				name: "blobHash",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBlobPublicInputsHash",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBlockHash",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidBlockNumber",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidChainId",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidEpoch",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "Epoch",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "Epoch",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidInHash",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidManaBaseFee",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidPreviousArchive",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidPreviousBlockHash",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidProof",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__InvalidProposedArchive",
		inputs: [
			{
				name: "expected",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "actual",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidTimestamp",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__InvalidVersion",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__NoEpochToProve",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__NonSequentialProving",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__NonZeroDaFee",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__NonZeroL2Fee",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__NotClaimingCorrectEpoch",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "Epoch",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "Epoch",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__NotInClaimPhase",
		inputs: [
			{
				name: "currentSlotInEpoch",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "claimDuration",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__NothingToPrune",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__ProofRightAlreadyClaimed",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__QuoteExpired",
		inputs: [
			{
				name: "currentSlot",
				type: "uint256",
				internalType: "Slot",
			},
			{
				name: "quoteSlot",
				type: "uint256",
				internalType: "Slot",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__SlotAlreadyInChain",
		inputs: [
			{
				name: "lastSlot",
				type: "uint256",
				internalType: "Slot",
			},
			{
				name: "proposedSlot",
				type: "uint256",
				internalType: "Slot",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__TimestampInFuture",
		inputs: [
			{
				name: "max",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__TimestampTooOld",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__TryingToProveNonExistingBlock",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__UnavailableTxs",
		inputs: [
			{
				name: "txsHash",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
	{
		type: "error",
		name: "SampleLib__IndexOutOfBounds",
		inputs: [
			{
				name: "requested",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "bound",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "SignatureLib__CannotVerifyEmpty",
		inputs: [],
	},
	{
		type: "error",
		name: "SignatureLib__InvalidSignature",
		inputs: [
			{
				name: "expected",
				type: "address",
				internalType: "address",
			},
			{
				name: "recovered",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__AlreadyActive",
		inputs: [
			{
				name: "attester",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__AlreadyRegistered",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__CannotSlashExitedStake",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__FailedToRemove",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__InsufficientStake",
		inputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "Staking__NoOneToSlash",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__NotExiting",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__NotSlasher",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__NotWithdrawer",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__NothingToExit",
		inputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "Staking__WithdrawalNotUnlockedYet",
		inputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
	},
	{
		type: "event",
		name: "Transfer",
		inputs: [
			{
				name: "from",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "to",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "value",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "error",
		name: "ValidatorSelection__EpochNotSetup",
		inputs: [],
	},
	{
		type: "error",
		name: "ValidatorSelection__InsufficientAttestations",
		inputs: [
			{
				name: "minimumNeeded",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "provided",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "ValidatorSelection__InsufficientAttestationsProvided",
		inputs: [
			{
				name: "minimumNeeded",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "provided",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "ValidatorSelection__InvalidDeposit",
		inputs: [
			{
				name: "attester",
				type: "address",
				internalType: "address",
			},
			{
				name: "proposer",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "error",
		name: "ValidatorSelection__InvalidProposer",
		inputs: [
			{
				name: "expected",
				type: "address",
				internalType: "address",
			},
			{
				name: "actual",
				type: "address",
				internalType: "address",
			},
		],
	},
	{
		type: "function",
		name: "allowance",
		inputs: [
			{
				name: "owner",
				type: "address",
				internalType: "address",
			},
			{
				name: "spender",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "approve",
		inputs: [
			{
				name: "spender",
				type: "address",
				internalType: "address",
			},
			{
				name: "value",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "balanceOf",
		inputs: [
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "decimals",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint8",
				internalType: "uint8",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "freeForAll",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "mint",
		inputs: [
			{
				name: "_to",
				type: "address",
				internalType: "address",
			},
			{
				name: "_amount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "name",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "string",
				internalType: "string",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "owner",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "renounceOwnership",
		inputs: [],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setFreeForAll",
		inputs: [
			{
				name: "_freeForAll",
				type: "bool",
				internalType: "bool",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "symbol",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "string",
				internalType: "string",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "totalSupply",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "transfer",
		inputs: [
			{
				name: "to",
				type: "address",
				internalType: "address",
			},
			{
				name: "value",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "transferFrom",
		inputs: [
			{
				name: "from",
				type: "address",
				internalType: "address",
			},
			{
				name: "to",
				type: "address",
				internalType: "address",
			},
			{
				name: "value",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "transferOwnership",
		inputs: [
			{
				name: "newOwner",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
] as const;
