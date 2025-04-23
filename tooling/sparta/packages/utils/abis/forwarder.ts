/**
 * Forwarder ABI.
 */
export const ForwarderAbi = [
	{
		type: "constructor",
		inputs: [
			{
				name: "__owner",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "error",
		name: "AddressEmptyCode",
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
		name: "FailedCall",
		inputs: [],
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
		name: "FeeLib__InvalidFeeAssetPriceModifier",
		inputs: [],
	},
	{
		type: "error",
		name: "ForwarderLengthMismatch",
		inputs: [
			{
				name: "toLength",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "dataLength",
				type: "uint256",
				internalType: "uint256",
			},
		],
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
		name: "InsufficientBalance",
		inputs: [
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
		name: "Rollup__AlreadyClaimed",
		inputs: [
			{
				name: "prover",
				type: "address",
				internalType: "address",
			},
			{
				name: "epoch",
				type: "uint256",
				internalType: "Epoch",
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
		name: "Rollup__ManaLimitExceeded",
		inputs: [],
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
		name: "Rollup__NotPastDeadline",
		inputs: [
			{
				name: "deadline",
				type: "uint256",
				internalType: "Slot",
			},
			{
				name: "currentSlot",
				type: "uint256",
				internalType: "Slot",
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
		name: "Rollup__PastDeadline",
		inputs: [
			{
				name: "deadline",
				type: "uint256",
				internalType: "Slot",
			},
			{
				name: "currentSlot",
				type: "uint256",
				internalType: "Slot",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__ProverHaveAlreadySubmitted",
		inputs: [
			{
				name: "prover",
				type: "address",
				internalType: "address",
			},
			{
				name: "epoch",
				type: "uint256",
				internalType: "Epoch",
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
		name: "Rollup__StartAndEndNotSameEpoch",
		inputs: [
			{
				name: "start",
				type: "uint256",
				internalType: "Epoch",
			},
			{
				name: "end",
				type: "uint256",
				internalType: "Epoch",
			},
		],
	},
	{
		type: "error",
		name: "Rollup__StartIsNotBuildingOnProven",
		inputs: [],
	},
	{
		type: "error",
		name: "Rollup__StartIsNotFirstBlockOfEpoch",
		inputs: [],
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
		name: "Staking__InvalidDeposit",
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
		name: "forward",
		inputs: [
			{
				name: "_to",
				type: "address[]",
				internalType: "address[]",
			},
			{
				name: "_data",
				type: "bytes[]",
				internalType: "bytes[]",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
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

export const ForwarderBytecode =
	"0x6080604052348015600e575f5ffd5b506040516105f13803806105f1833981016040819052602b9160b4565b806001600160a01b038116605857604051631e4fbdf760e01b81525f600482015260240160405180910390fd5b605f816065565b505060df565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f6020828403121560c3575f5ffd5b81516001600160a01b038116811460d8575f5ffd5b9392505050565b610505806100ec5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c8063715018a61461004e5780638da5cb5b14610058578063b028e60714610076578063f2fde38b14610089575b5f5ffd5b61005661009c565b005b5f54604080516001600160a01b039092168252519081900360200190f35b6100566100843660046103d0565b6100af565b61005661009736600461043c565b610197565b6100a46101d4565b6100ad5f610200565b565b6100b76101d4565b82818181146100e757604051633a2aeb4d60e01b8152600481019290925260248201526044015b60405180910390fd5b505f90505b838110156101905761018783838381811061010957610109610462565b905060200281019061011b9190610476565b8080601f0160208091040260200160405190810160405280939291908181526020018383808284375f9201919091525089925088915085905081811061016357610163610462565b9050602002016020810190610178919061043c565b6001600160a01b03169061024f565b506001016100ec565b5050505050565b61019f6101d4565b6001600160a01b0381166101c857604051631e4fbdf760e01b81525f60048201526024016100de565b6101d181610200565b50565b5f546001600160a01b031633146100ad5760405163118cdaa760e01b81523360048201526024016100de565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b606061025c83835f610263565b9392505050565b60608147101561028f5760405163cf47918160e01b8152476004820152602481018390526044016100de565b5f5f856001600160a01b031684866040516102aa91906104b9565b5f6040518083038185875af1925050503d805f81146102e4576040519150601f19603f3d011682016040523d82523d5f602084013e6102e9565b606091505b50915091506102f9868383610303565b9695505050505050565b606082610318576103138261035f565b61025c565b815115801561032f57506001600160a01b0384163b155b1561035857604051639996b31560e01b81526001600160a01b03851660048201526024016100de565b508061025c565b80511561036f5780518082602001fd5b60405163d6bda27560e01b815260040160405180910390fd5b5f5f83601f840112610398575f5ffd5b50813567ffffffffffffffff8111156103af575f5ffd5b6020830191508360208260051b85010111156103c9575f5ffd5b9250929050565b5f5f5f5f604085870312156103e3575f5ffd5b843567ffffffffffffffff8111156103f9575f5ffd5b61040587828801610388565b909550935050602085013567ffffffffffffffff811115610424575f5ffd5b61043087828801610388565b95989497509550505050565b5f6020828403121561044c575f5ffd5b81356001600160a01b038116811461025c575f5ffd5b634e487b7160e01b5f52603260045260245ffd5b5f5f8335601e1984360301811261048b575f5ffd5b83018035915067ffffffffffffffff8211156104a5575f5ffd5b6020019150368190038213156103c9575f5ffd5b5f82518060208501845e5f92019182525091905056fea26469706673582212201094da15988f4705d58503cdbc19677b21e89966fdc614400045372c2317a21b64736f6c634300081b0033";
