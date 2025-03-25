/**
 * Rollup ABI.
 */
export const RollupAbi = [
	{
		type: "constructor",
		inputs: [
			{
				name: "_fpcJuicePortal",
				type: "address",
				internalType: "contract IFeeJuicePortal",
			},
			{
				name: "_rewardDistributor",
				type: "address",
				internalType: "contract IRewardDistributor",
			},
			{
				name: "_stakingAsset",
				type: "address",
				internalType: "contract IERC20",
			},
			{
				name: "_governance",
				type: "address",
				internalType: "address",
			},
			{
				name: "_genesisState",
				type: "tuple",
				internalType: "struct GenesisState",
				components: [
					{
						name: "vkTreeRoot",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "protocolContractTreeRoot",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "genesisArchiveRoot",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "genesisBlockHash",
						type: "bytes32",
						internalType: "bytes32",
					},
				],
			},
			{
				name: "_config",
				type: "tuple",
				internalType: "struct RollupConfigInput",
				components: [
					{
						name: "aztecSlotDuration",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "aztecEpochDuration",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "targetCommitteeSize",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "aztecProofSubmissionWindow",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "minimumStake",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "slashingQuorum",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "slashingRoundSize",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "manaTarget",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "provingCostPerMana",
						type: "uint256",
						internalType: "EthValue",
					},
				],
			},
		],
		stateMutability: "nonpayable",
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
		type: "event",
		name: "Deposit",
		inputs: [
			{
				name: "attester",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "proposer",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "withdrawer",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
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
		type: "event",
		name: "EIP712DomainChanged",
		inputs: [],
		anonymous: false,
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
		name: "InvalidShortString",
		inputs: [],
	},
	{
		type: "function",
		name: "L1_BLOCK_AT_GENESIS",
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
		type: "event",
		name: "L2BlockProposed",
		inputs: [
			{
				name: "blockNumber",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "archive",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
			{
				name: "versionedBlobHashes",
				type: "bytes32[]",
				indexed: false,
				internalType: "bytes32[]",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "L2ProofVerified",
		inputs: [
			{
				name: "blockNumber",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "proverId",
				type: "address",
				indexed: true,
				internalType: "address",
			},
		],
		anonymous: false,
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
		type: "event",
		name: "PrunedPending",
		inputs: [
			{
				name: "provenBlockNumber",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
			{
				name: "pendingBlockNumber",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
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
		name: "SafeCastOverflowedIntToUint",
		inputs: [
			{
				name: "value",
				type: "int256",
				internalType: "int256",
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
		type: "event",
		name: "Slashed",
		inputs: [
			{
				name: "attester",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
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
		name: "StringTooLong",
		inputs: [
			{
				name: "str",
				type: "string",
				internalType: "string",
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
		type: "event",
		name: "WithdrawFinalised",
		inputs: [
			{
				name: "attester",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "recipient",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "WithdrawInitiated",
		inputs: [
			{
				name: "attester",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "recipient",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "function",
		name: "archive",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "archiveAt",
		inputs: [
			{
				name: "_blockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "canProposeAtTime",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "_archive",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Slot",
			},
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
		name: "canPruneAtTime",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
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
		name: "cheat__InitialiseValidatorSet",
		inputs: [
			{
				name: "_args",
				type: "tuple[]",
				internalType: "struct CheatDepositArgs[]",
				components: [
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
					{
						name: "withdrawer",
						type: "address",
						internalType: "address",
					},
					{
						name: "amount",
						type: "uint256",
						internalType: "uint256",
					},
				],
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "checkBlob",
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
		name: "claimProverRewards",
		inputs: [
			{
				name: "_recipient",
				type: "address",
				internalType: "address",
			},
			{
				name: "_epochs",
				type: "uint256[]",
				internalType: "Epoch[]",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "claimSequencerRewards",
		inputs: [
			{
				name: "_recipient",
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
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "deposit",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
			{
				name: "_proposer",
				type: "address",
				internalType: "address",
			},
			{
				name: "_withdrawer",
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
		name: "eip712Domain",
		inputs: [],
		outputs: [
			{
				name: "fields",
				type: "bytes1",
				internalType: "bytes1",
			},
			{
				name: "name",
				type: "string",
				internalType: "string",
			},
			{
				name: "version",
				type: "string",
				internalType: "string",
			},
			{
				name: "chainId",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "verifyingContract",
				type: "address",
				internalType: "address",
			},
			{
				name: "salt",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "extensions",
				type: "uint256[]",
				internalType: "uint256[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "finaliseWithdraw",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "getActiveAttesterCount",
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
		name: "getAttesterAtIndex",
		inputs: [
			{
				name: "_index",
				type: "uint256",
				internalType: "uint256",
			},
		],
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
		name: "getAttesters",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address[]",
				internalType: "address[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getBlobPublicInputsHash",
		inputs: [
			{
				name: "_blockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getBlock",
		inputs: [
			{
				name: "_blockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct BlockLog",
				components: [
					{
						name: "archive",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "blockHash",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "slotNumber",
						type: "uint256",
						internalType: "Slot",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getBurnAddress",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "pure",
	},
	{
		type: "function",
		name: "getCollectiveProverRewardsForEpoch",
		inputs: [
			{
				name: "_epoch",
				type: "uint256",
				internalType: "Epoch",
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
		name: "getCommitteeAt",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		outputs: [
			{
				name: "",
				type: "address[]",
				internalType: "address[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getCurrentEpoch",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getCurrentEpochCommittee",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address[]",
				internalType: "address[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getCurrentProposer",
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
		name: "getCurrentSampleSeed",
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
		name: "getCurrentSlot",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Slot",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEpochAt",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEpochAtSlot",
		inputs: [
			{
				name: "_slotNumber",
				type: "uint256",
				internalType: "Slot",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEpochCommittee",
		inputs: [
			{
				name: "_epoch",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		outputs: [
			{
				name: "",
				type: "address[]",
				internalType: "address[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEpochDuration",
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
		name: "getEpochForBlock",
		inputs: [
			{
				name: "_blockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEpochProofPublicInputs",
		inputs: [
			{
				name: "_start",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "_end",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "_args",
				type: "tuple",
				internalType: "struct PublicInputArgs",
				components: [
					{
						name: "previousArchive",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "endArchive",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "previousBlockHash",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "endBlockHash",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "endTimestamp",
						type: "uint256",
						internalType: "Timestamp",
					},
					{
						name: "outHash",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "proverId",
						type: "address",
						internalType: "address",
					},
				],
			},
			{
				name: "_fees",
				type: "bytes32[]",
				internalType: "bytes32[]",
			},
			{
				name: "_blobPublicInputs",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "_aggregationObject",
				type: "bytes",
				internalType: "bytes",
			},
		],
		outputs: [
			{
				name: "",
				type: "bytes32[]",
				internalType: "bytes32[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getExit",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct Exit",
				components: [
					{
						name: "exitableAt",
						type: "uint256",
						internalType: "Timestamp",
					},
					{
						name: "recipient",
						type: "address",
						internalType: "address",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getExitDelay",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getFeeAsset",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IERC20",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getFeeAssetPerEth",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "FeeAssetPerEthE9",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getFeeAssetPortal",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IFeeJuicePortal",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getFeeHeader",
		inputs: [
			{
				name: "_blockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct FeeHeader",
				components: [
					{
						name: "excessMana",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "manaUsed",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "feeAssetPriceNumerator",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "congestionCost",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "provingCost",
						type: "uint256",
						internalType: "uint256",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getGenesisTime",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getHasSubmitted",
		inputs: [
			{
				name: "_epoch",
				type: "uint256",
				internalType: "Epoch",
			},
			{
				name: "_length",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "_prover",
				type: "address",
				internalType: "address",
			},
		],
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
		name: "getInbox",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IInbox",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getInfo",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct ValidatorInfo",
				components: [
					{
						name: "stake",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "withdrawer",
						type: "address",
						internalType: "address",
					},
					{
						name: "proposer",
						type: "address",
						internalType: "address",
					},
					{
						name: "status",
						type: "uint8",
						internalType: "enum Status",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getL1FeesAt",
		inputs: [
			{
				name: "_timestamp",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct L1FeeData",
				components: [
					{
						name: "baseFee",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "blobFee",
						type: "uint256",
						internalType: "uint256",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getManaBaseFeeAt",
		inputs: [
			{
				name: "_timestamp",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "_inFeeAsset",
				type: "bool",
				internalType: "bool",
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
		name: "getManaBaseFeeComponentsAt",
		inputs: [
			{
				name: "_timestamp",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "_inFeeAsset",
				type: "bool",
				internalType: "bool",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct ManaBaseFeeComponents",
				components: [
					{
						name: "congestionCost",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "congestionMultiplier",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "dataCost",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "gasCost",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "provingCost",
						type: "uint256",
						internalType: "uint256",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getManaLimit",
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
		name: "getManaTarget",
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
		name: "getMinimumStake",
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
		name: "getOperatorAtIndex",
		inputs: [
			{
				name: "_index",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct OperatorInfo",
				components: [
					{
						name: "proposer",
						type: "address",
						internalType: "address",
					},
					{
						name: "attester",
						type: "address",
						internalType: "address",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getOutbox",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IOutbox",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getPendingBlockNumber",
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
		name: "getProofSubmissionWindow",
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
		name: "getProposerAt",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
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
		name: "getProposerAtIndex",
		inputs: [
			{
				name: "_index",
				type: "uint256",
				internalType: "uint256",
			},
		],
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
		name: "getProposerForAttester",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
		],
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
		name: "getProvenBlockNumber",
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
		name: "getProvingCostPerManaInEth",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "EthValue",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getProvingCostPerManaInFeeAsset",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "FeeAssetValue",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getRewardDistributor",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IRewardDistributor",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getSampleSeedAt",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
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
		name: "getSequencerRewards",
		inputs: [
			{
				name: "_sequencer",
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
		name: "getSlasher",
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
		name: "getSlotAt",
		inputs: [
			{
				name: "_ts",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Slot",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getSlotDuration",
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
		name: "getSpecificProverRewardsForEpoch",
		inputs: [
			{
				name: "_epoch",
				type: "uint256",
				internalType: "Epoch",
			},
			{
				name: "_prover",
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
		name: "getStakingAsset",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IERC20",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getTargetCommitteeSize",
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
		name: "getTimestampForSlot",
		inputs: [
			{
				name: "_slotNumber",
				type: "uint256",
				internalType: "Slot",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "Timestamp",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getTips",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct ChainTips",
				components: [
					{
						name: "pendingBlockNumber",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "provenBlockNumber",
						type: "uint256",
						internalType: "uint256",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getVersion",
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
		name: "initiateWithdraw",
		inputs: [
			{
				name: "_attester",
				type: "address",
				internalType: "address",
			},
			{
				name: "_recipient",
				type: "address",
				internalType: "address",
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
		name: "propose",
		inputs: [
			{
				name: "_args",
				type: "tuple",
				internalType: "struct ProposeArgs",
				components: [
					{
						name: "archive",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "blockHash",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "oracleInput",
						type: "tuple",
						internalType: "struct OracleInput",
						components: [
							{
								name: "feeAssetPriceModifier",
								type: "int256",
								internalType: "int256",
							},
						],
					},
					{
						name: "header",
						type: "bytes",
						internalType: "bytes",
					},
					{
						name: "txHashes",
						type: "bytes32[]",
						internalType: "bytes32[]",
					},
				],
			},
			{
				name: "_signatures",
				type: "tuple[]",
				internalType: "struct Signature[]",
				components: [
					{
						name: "isEmpty",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "v",
						type: "uint8",
						internalType: "uint8",
					},
					{
						name: "r",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "s",
						type: "bytes32",
						internalType: "bytes32",
					},
				],
			},
			{
				name: "_blobInput",
				type: "bytes",
				internalType: "bytes",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "prune",
		inputs: [],
		outputs: [],
		stateMutability: "nonpayable",
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
		name: "setEpochVerifier",
		inputs: [
			{
				name: "_verifier",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setProtocolContractTreeRoot",
		inputs: [
			{
				name: "_protocolContractTreeRoot",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setProvingCostPerMana",
		inputs: [
			{
				name: "_provingCostPerMana",
				type: "uint256",
				internalType: "EthValue",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setVkTreeRoot",
		inputs: [
			{
				name: "_vkTreeRoot",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setupEpoch",
		inputs: [],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "slash",
		inputs: [
			{
				name: "_attester",
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
		name: "status",
		inputs: [
			{
				name: "_myHeaderBlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "provenBlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "provenArchive",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "pendingBlockNumber",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "pendingArchive",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "archiveOfMyBlock",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "provenEpochNumber",
				type: "uint256",
				internalType: "Epoch",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "submitEpochRootProof",
		inputs: [
			{
				name: "_args",
				type: "tuple",
				internalType: "struct SubmitEpochRootProofArgs",
				components: [
					{
						name: "start",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "end",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "args",
						type: "tuple",
						internalType: "struct PublicInputArgs",
						components: [
							{
								name: "previousArchive",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "endArchive",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "previousBlockHash",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "endBlockHash",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "endTimestamp",
								type: "uint256",
								internalType: "Timestamp",
							},
							{
								name: "outHash",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "proverId",
								type: "address",
								internalType: "address",
							},
						],
					},
					{
						name: "fees",
						type: "bytes32[]",
						internalType: "bytes32[]",
					},
					{
						name: "blobPublicInputs",
						type: "bytes",
						internalType: "bytes",
					},
					{
						name: "aggregationObject",
						type: "bytes",
						internalType: "bytes",
					},
					{
						name: "proof",
						type: "bytes",
						internalType: "bytes",
					},
				],
			},
		],
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
	{
		type: "function",
		name: "updateL1GasFeeOracle",
		inputs: [],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "validateBlobs",
		inputs: [
			{
				name: "_blobsInput",
				type: "bytes",
				internalType: "bytes",
			},
		],
		outputs: [
			{
				name: "",
				type: "bytes32[]",
				internalType: "bytes32[]",
			},
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "validateHeader",
		inputs: [
			{
				name: "_header",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "_signatures",
				type: "tuple[]",
				internalType: "struct Signature[]",
				components: [
					{
						name: "isEmpty",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "v",
						type: "uint8",
						internalType: "uint8",
					},
					{
						name: "r",
						type: "bytes32",
						internalType: "bytes32",
					},
					{
						name: "s",
						type: "bytes32",
						internalType: "bytes32",
					},
				],
			},
			{
				name: "_digest",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "_currentTime",
				type: "uint256",
				internalType: "Timestamp",
			},
			{
				name: "_blobsHash",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "_flags",
				type: "tuple",
				internalType: "struct BlockHeaderValidationFlags",
				components: [
					{
						name: "ignoreDA",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "ignoreSignatures",
						type: "bool",
						internalType: "bool",
					},
				],
			},
		],
		outputs: [],
		stateMutability: "view",
	},
] as const;
