/**
 * Registry ABI.
 */
export const RegistryAbi = [
{
	"type": "constructor",
	"inputs": [
	{
		"name": "_owner",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "_rewardAsset",
		"type": "address",
		"internalType": "contract IERC20"
	}
	],
	"stateMutability": "nonpayable"
},
{
	"type": "error",
	"name": "CoinIssuer__InsufficientMintAvailable",
	"inputs": [
	{
		"name": "available",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "needed",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Delegation__InsufficientPower",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "DevNet__InvalidProposer",
	"inputs": [
	{
		"name": "expected",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "actual",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "DevNet__NoPruningAllowed",
	"inputs": []
},
{
	"type": "error",
	"name": "FeeJuicePortal__AlreadyInitialized",
	"inputs": []
},
{
	"type": "error",
	"name": "FeeJuicePortal__InvalidInitialization",
	"inputs": []
},
{
	"type": "error",
	"name": "FeeJuicePortal__Unauthorized",
	"inputs": []
},
{
	"type": "error",
	"name": "FeeLib__InvalidFeeAssetPriceModifier",
	"inputs": []
},
{
	"type": "error",
	"name": "GSE__AlreadyRegistered",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__FailedToRemove",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__FatalError",
	"inputs": [
	{
		"name": "",
		"type": "string",
		"internalType": "string"
	}
	]
},
{
	"type": "error",
	"name": "GSE__GovernanceAlreadySet",
	"inputs": []
},
{
	"type": "error",
	"name": "GSE__InstanceDoesNotExist",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__InsufficientStake",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GSE__InvalidRollupAddress",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__NotCanonical",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__NotRollup",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__NotWithdrawer",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__NothingToExit",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GSE__OutOfBounds",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GSE__RollupAlreadyRegistered",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__CanOnlyExecuteProposalInPast",
	"inputs": []
},
{
	"type": "error",
	"name": "GovernanceProposer__FailedToPropose",
	"inputs": [
	{
		"name": "proposal",
		"type": "address",
		"internalType": "contract IPayload"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__GSEPayloadInvalid",
	"inputs": []
},
{
	"type": "error",
	"name": "GovernanceProposer__InstanceHaveNoCode",
	"inputs": [
	{
		"name": "instance",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__InsufficientVotes",
	"inputs": [
	{
		"name": "votesCast",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "votesNeeded",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__InvalidNAndMValues",
	"inputs": [
	{
		"name": "n",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "m",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__NCannotBeLargerTHanM",
	"inputs": [
	{
		"name": "n",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "m",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__OnlyProposerCanVote",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "proposer",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__ProposalAlreadyExecuted",
	"inputs": [
	{
		"name": "roundNumber",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__ProposalCannotBeAddressZero",
	"inputs": []
},
{
	"type": "error",
	"name": "GovernanceProposer__ProposalHaveNoCode",
	"inputs": [
	{
		"name": "proposal",
		"type": "address",
		"internalType": "contract IPayload"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__ProposalTooOld",
	"inputs": [
	{
		"name": "roundNumber",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "currentRoundNumber",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "GovernanceProposer__VoteAlreadyCastForSlot",
	"inputs": [
	{
		"name": "slot",
		"type": "uint256",
		"internalType": "Slot"
	}
	]
},
{
	"type": "event",
	"name": "GovernanceUpdated",
	"inputs": [
	{
		"name": "governance",
		"type": "address",
		"indexed": true,
		"internalType": "address"
	}
	],
	"anonymous": false
},
{
	"type": "error",
	"name": "Governance__CallFailed",
	"inputs": [
	{
		"name": "target",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Governance__CallerNotGovernanceProposer",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "governanceProposer",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Governance__CallerNotSelf",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "self",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Governance__CannotCallAsset",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__DifferentialTooBig",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__DifferentialTooSmall",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__InvalidMinimumVotes",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__LockAmountTooSmall",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__QuorumTooBig",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__QuorumTooSmall",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__TimeTooBig",
	"inputs": [
	{
		"name": "name",
		"type": "string",
		"internalType": "string"
	}
	]
},
{
	"type": "error",
	"name": "Governance__ConfigurationLib__TimeTooSmall",
	"inputs": [
	{
		"name": "name",
		"type": "string",
		"internalType": "string"
	}
	]
},
{
	"type": "error",
	"name": "Governance__DepositNotAllowed",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__InsufficientPower",
	"inputs": [
	{
		"name": "voter",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "have",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "required",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Governance__InvalidConfiguration",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__NoCheckpointsFound",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalAlreadyDropped",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalCannotBeDropped",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalDoesNotExists",
	"inputs": [
	{
		"name": "proposalId",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Governance__ProposalLib__MoreVoteThanExistNeeded",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalLib__MoreYeaVoteThanExistNeeded",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalLib__ZeroMinimum",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalLib__ZeroVotesNeeded",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalLib__ZeroYeaVotesNeeded",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalNotActive",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__ProposalNotExecutable",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__UserLib__NotInPast",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__WithdrawalAlreadyclaimed",
	"inputs": []
},
{
	"type": "error",
	"name": "Governance__WithdrawalNotUnlockedYet",
	"inputs": [
	{
		"name": "currentTime",
		"type": "uint256",
		"internalType": "Timestamp"
	},
	{
		"name": "unlocksAt",
		"type": "uint256",
		"internalType": "Timestamp"
	}
	]
},
{
	"type": "error",
	"name": "HeaderLib__InvalidHeaderSize",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "HeaderLib__InvalidSlotNumber",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "Slot"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "Slot"
	}
	]
},
{
	"type": "error",
	"name": "Inbox__ActorTooLarge",
	"inputs": [
	{
		"name": "actor",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Inbox__ContentTooLarge",
	"inputs": [
	{
		"name": "content",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Inbox__MustBuildBeforeConsume",
	"inputs": []
},
{
	"type": "error",
	"name": "Inbox__SecretHashTooLarge",
	"inputs": [
	{
		"name": "secretHash",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Inbox__Unauthorized",
	"inputs": []
},
{
	"type": "error",
	"name": "Inbox__VersionMismatch",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "event",
	"name": "InstanceAdded",
	"inputs": [
	{
		"name": "instance",
		"type": "address",
		"indexed": true,
		"internalType": "address"
	},
	{
		"name": "version",
		"type": "uint256",
		"indexed": true,
		"internalType": "uint256"
	}
	],
	"anonymous": false
},
{
	"type": "error",
	"name": "MerkleLib__InvalidRoot",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "leaf",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "leafIndex",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__AlreadyNullified",
	"inputs": [
	{
		"name": "l2BlockNumber",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "leafIndex",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__BlockNotProven",
	"inputs": [
	{
		"name": "l2BlockNumber",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__IncompatibleEntryArguments",
	"inputs": [
	{
		"name": "messageHash",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "storedFee",
		"type": "uint64",
		"internalType": "uint64"
	},
	{
		"name": "feePassed",
		"type": "uint64",
		"internalType": "uint64"
	},
	{
		"name": "storedVersion",
		"type": "uint32",
		"internalType": "uint32"
	},
	{
		"name": "versionPassed",
		"type": "uint32",
		"internalType": "uint32"
	},
	{
		"name": "storedDeadline",
		"type": "uint32",
		"internalType": "uint32"
	},
	{
		"name": "deadlinePassed",
		"type": "uint32",
		"internalType": "uint32"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__InvalidChainId",
	"inputs": []
},
{
	"type": "error",
	"name": "Outbox__InvalidRecipient",
	"inputs": [
	{
		"name": "expected",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "actual",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__NothingToConsume",
	"inputs": [
	{
		"name": "messageHash",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__NothingToConsumeAtBlock",
	"inputs": [
	{
		"name": "l2BlockNumber",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__RootAlreadySetAtBlock",
	"inputs": [
	{
		"name": "l2BlockNumber",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Outbox__Unauthorized",
	"inputs": []
},
{
	"type": "error",
	"name": "Outbox__VersionMismatch",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "OwnableInvalidOwner",
	"inputs": [
	{
		"name": "owner",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "OwnableUnauthorizedAccount",
	"inputs": [
	{
		"name": "account",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "event",
	"name": "OwnershipTransferred",
	"inputs": [
	{
		"name": "previousOwner",
		"type": "address",
		"indexed": true,
		"internalType": "address"
	},
	{
		"name": "newOwner",
		"type": "address",
		"indexed": true,
		"internalType": "address"
	}
	],
	"anonymous": false
},
{
	"type": "error",
	"name": "ProofCommitmentEscrow__InsufficientBalance",
	"inputs": [
	{
		"name": "balance",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "requested",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "ProofCommitmentEscrow__NotOwner",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "ProofCommitmentEscrow__WithdrawRequestNotReady",
	"inputs": [
	{
		"name": "current",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "readyAt",
		"type": "uint256",
		"internalType": "Timestamp"
	}
	]
},
{
	"type": "error",
	"name": "Registry__NoRollupsRegistered",
	"inputs": []
},
{
	"type": "error",
	"name": "Registry__RollupAlreadyRegistered",
	"inputs": [
	{
		"name": "rollup",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Registry__RollupNotRegistered",
	"inputs": [
	{
		"name": "version",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "RewardBooster__OnlyRollup",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "event",
	"name": "RewardDistributorUpdated",
	"inputs": [
	{
		"name": "rewardDistributor",
		"type": "address",
		"indexed": true,
		"internalType": "address"
	}
	],
	"anonymous": false
},
{
	"type": "error",
	"name": "RewardDistributor__InvalidCaller",
	"inputs": [
	{
		"name": "caller",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "canonical",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__AlreadyClaimed",
	"inputs": [
	{
		"name": "prover",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "epoch",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InsufficientBondAmount",
	"inputs": [
	{
		"name": "minimum",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "provided",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InsufficientFundsInEscrow",
	"inputs": [
	{
		"name": "required",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "available",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidArchive",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidBasisPointFee",
	"inputs": [
	{
		"name": "basisPointFee",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidBlobHash",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidBlobProof",
	"inputs": [
	{
		"name": "blobHash",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidBlockNumber",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidCoinbase",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__InvalidFirstEpochProof",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__InvalidInHash",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidManaBaseFee",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidManaTarget",
	"inputs": [
	{
		"name": "minimum",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "provided",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidPreviousArchive",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidProof",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__InvalidProposedArchive",
	"inputs": [
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "actual",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__InvalidTimestamp",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "Timestamp"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "Timestamp"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__ManaLimitExceeded",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__NoEpochToProve",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__NonSequentialProving",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__NonZeroDaFee",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__NotPastDeadline",
	"inputs": [
	{
		"name": "deadline",
		"type": "uint256",
		"internalType": "Epoch"
	},
	{
		"name": "currentEpoch",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__NothingToPrune",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__PastDeadline",
	"inputs": [
	{
		"name": "deadline",
		"type": "uint256",
		"internalType": "Epoch"
	},
	{
		"name": "currentEpoch",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__ProverHaveAlreadySubmitted",
	"inputs": [
	{
		"name": "prover",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "epoch",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__RewardsNotClaimable",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__SlotAlreadyInChain",
	"inputs": [
	{
		"name": "lastSlot",
		"type": "uint256",
		"internalType": "Slot"
	},
	{
		"name": "proposedSlot",
		"type": "uint256",
		"internalType": "Slot"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__StartAndEndNotSameEpoch",
	"inputs": [
	{
		"name": "start",
		"type": "uint256",
		"internalType": "Epoch"
	},
	{
		"name": "end",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__StartIsNotBuildingOnProven",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__StartIsNotFirstBlockOfEpoch",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__TimestampInFuture",
	"inputs": [
	{
		"name": "max",
		"type": "uint256",
		"internalType": "Timestamp"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "Timestamp"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__TimestampTooOld",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__TooManyBlocksInEpoch",
	"inputs": [
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Rollup__TryingToProveNonExistingBlock",
	"inputs": []
},
{
	"type": "error",
	"name": "Rollup__UnavailableTxs",
	"inputs": [
	{
		"name": "txsHash",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "SampleLib__IndexOutOfBounds",
	"inputs": [
	{
		"name": "requested",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "bound",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "SampleLib__SampleLargerThanIndex",
	"inputs": [
	{
		"name": "sample",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "index",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Staking__AlreadyActive",
	"inputs": [
	{
		"name": "attester",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__AlreadyExiting",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__AlreadyQueued",
	"inputs": [
	{
		"name": "_attester",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__AlreadyRegistered",
	"inputs": [
	{
		"name": "instance",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "attester",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__CannotSlashExitedStake",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__DepositOutOfGas",
	"inputs": []
},
{
	"type": "error",
	"name": "Staking__FailedToRemove",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__FatalError",
	"inputs": [
	{
		"name": "",
		"type": "string",
		"internalType": "string"
	}
	]
},
{
	"type": "error",
	"name": "Staking__GovernanceAlreadySet",
	"inputs": []
},
{
	"type": "error",
	"name": "Staking__IncorrectGovProposer",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InstanceDoesNotExist",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InsufficientPower",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InsufficientStake",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InvalidDeposit",
	"inputs": [
	{
		"name": "attester",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "proposer",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InvalidRecipient",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__InvalidRollupAddress",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NoOneToSlash",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotCanonical",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotExiting",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotOurProposal",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotRollup",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotSlasher",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NotWithdrawer",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__NothingToExit",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__OutOfBounds",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "Staking__QueueAlreadyFlushed",
	"inputs": [
	{
		"name": "epoch",
		"type": "uint256",
		"internalType": "Epoch"
	}
	]
},
{
	"type": "error",
	"name": "Staking__QueueEmpty",
	"inputs": []
},
{
	"type": "error",
	"name": "Staking__RollupAlreadyRegistered",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__WithdrawFailed",
	"inputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "Staking__WithdrawalNotUnlockedYet",
	"inputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "Timestamp"
	},
	{
		"name": "",
		"type": "uint256",
		"internalType": "Timestamp"
	}
	]
},
{
	"type": "error",
	"name": "ValidatorSelection__EpochNotSetup",
	"inputs": []
},
{
	"type": "error",
	"name": "ValidatorSelection__InsufficientAttestations",
	"inputs": [
	{
		"name": "minimumNeeded",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "provided",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "ValidatorSelection__InsufficientCommitteeSize",
	"inputs": [
	{
		"name": "actual",
		"type": "uint256",
		"internalType": "uint256"
	},
	{
		"name": "expected",
		"type": "uint256",
		"internalType": "uint256"
	}
	]
},
{
	"type": "error",
	"name": "ValidatorSelection__InvalidCommitteeCommitment",
	"inputs": [
	{
		"name": "reconstructed",
		"type": "bytes32",
		"internalType": "bytes32"
	},
	{
		"name": "expected",
		"type": "bytes32",
		"internalType": "bytes32"
	}
	]
},
{
	"type": "error",
	"name": "ValidatorSelection__InvalidDeposit",
	"inputs": [
	{
		"name": "attester",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "proposer",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "error",
	"name": "ValidatorSelection__InvalidProposer",
	"inputs": [
	{
		"name": "expected",
		"type": "address",
		"internalType": "address"
	},
	{
		"name": "actual",
		"type": "address",
		"internalType": "address"
	}
	]
},
{
	"type": "function",
	"name": "addRollup",
	"inputs": [
	{
		"name": "_rollup",
		"type": "address",
		"internalType": "contract IHaveVersion"
	}
	],
	"outputs": [],
	"stateMutability": "nonpayable"
},
{
	"type": "function",
	"name": "getCanonicalRollup",
	"inputs": [],
	"outputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "contract IHaveVersion"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "getGovernance",
	"inputs": [],
	"outputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "getRewardDistributor",
	"inputs": [],
	"outputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "contract IRewardDistributor"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "getRollup",
	"inputs": [
	{
		"name": "_version",
		"type": "uint256",
		"internalType": "uint256"
	}
	],
	"outputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "contract IHaveVersion"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "getVersion",
	"inputs": [
	{
		"name": "_index",
		"type": "uint256",
		"internalType": "uint256"
	}
	],
	"outputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "numberOfVersions",
	"inputs": [],
	"outputs": [
	{
		"name": "",
		"type": "uint256",
		"internalType": "uint256"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "owner",
	"inputs": [],
	"outputs": [
	{
		"name": "",
		"type": "address",
		"internalType": "address"
	}
	],
	"stateMutability": "view"
},
{
	"type": "function",
	"name": "renounceOwnership",
	"inputs": [],
	"outputs": [],
	"stateMutability": "nonpayable"
},
{
	"type": "function",
	"name": "transferOwnership",
	"inputs": [
	{
		"name": "newOwner",
		"type": "address",
		"internalType": "address"
	}
	],
	"outputs": [],
	"stateMutability": "nonpayable"
},
{
	"type": "function",
	"name": "updateGovernance",
	"inputs": [
	{
		"name": "_governance",
		"type": "address",
		"internalType": "address"
	}
	],
	"outputs": [],
	"stateMutability": "nonpayable"
},
{
	"type": "function",
	"name": "updateRewardDistributor",
	"inputs": [
	{
		"name": "_rewardDistributor",
		"type": "address",
		"internalType": "address"
	}
	],
	"outputs": [],
	"stateMutability": "nonpayable"
}
] as const;
