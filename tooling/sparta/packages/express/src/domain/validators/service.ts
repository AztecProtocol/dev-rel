import { logger } from "@sparta/utils";
import { validatorRepository, ValidatorRepository } from "../../db/validatorRepository";

export interface Validator {
    validatorAddress: string; // Primary Key
    nodeOperatorId?: string; // GSI Partition Key: NodeOperatorIndex - now optional
    createdAt: number;
    updatedAt: number;
    peerId?: string; // Optional peer network ID for linking with crawler data
    
    // Active status (updated by epoch sync service)
    isActive?: boolean; // Whether this validator is currently in the rollup validator set
    
    // Processed validator stats (updated each epoch)
    epoch?: number; // Last epoch when stats were updated
    hasAttested24h?: boolean;
    lastAttestationSlot?: string; // Store as string to avoid BigInt serialization issues
    lastAttestationTimestamp?: string;
    lastAttestationDate?: string;
    lastProposalSlot?: string;
    lastProposalTimestamp?: string;
    lastProposalDate?: string;
    missedAttestationsCount?: number;
    missedProposalsCount?: number;
    totalSlots?: number;
    
    // Attestation history from RPC (append-only, never overwrite)
    history?: Array<{
        slot: string;
        status: string;
    }>;
    
    // Processed peer data (updated less frequently)
    peerClient?: string;
    peerCountry?: string;
    peerCity?: string;
    peerIpAddress?: string;
    peerPort?: number;
    peerIsSynced?: boolean;
    peerBlockHeight?: number;
    peerLastSeen?: string;
}

class ValidatorService {
    private repository: ValidatorRepository;

    constructor(repository: ValidatorRepository = validatorRepository) {
        this.repository = repository;
        logger.info("ValidatorService initialized with repository.");
    }

    /**
     * Retrieves all validators from the database.
     * @param pageToken Optional pagination token.
     * @param includeHistory Whether to include validator history (defaults to true).
     * @param historyLimit Optional limit on number of history entries to return (defaults to 5).
     * @returns A paginated list of Validator objects.
     */
    public async getAllValidators(pageToken?: string, includeHistory: boolean = true, historyLimit: number = 5): Promise<{ validators: Validator[]; nextPageToken?: string }> {
        try {
            return await this.repository.findAll(pageToken, includeHistory, historyLimit);
        } catch (error) {
            logger.error(error, "Service error getting all validators");
            throw error;
        }
    }

    /**
     * Counts the total number of validators.
     * @returns The count of validators.
     */
    public async countValidators(): Promise<number> {
        try {
            return await this.repository.countAll();
        } catch (error) {
            logger.error(error, "Service error counting validators");
            throw error;
        }
    }

    /**
     * Retrieves a validator by address.
     * @param validatorAddress The validator address.
     * @param historyLimit Optional limit on number of history entries to return (defaults to 5).
     * @returns The Validator object or undefined if not found.
     */
    public async getValidatorByAddress(validatorAddress: string, historyLimit: number = 5): Promise<Validator | undefined> {
        try {
            return await this.repository.findByAddress(validatorAddress, true, historyLimit);
        } catch (error) {
            logger.error(
                { error, validatorAddress },
                "Service error getting validator by address"
            );
            throw error;
        }
    }

    /**
     * Retrieves all validators for a node operator.
     * @param nodeOperatorId The Discord ID of the node operator.
     * @param historyLimit Optional limit on number of history entries to return (defaults to 5).
     * @returns Array of Validator objects.
     */
    public async getValidatorsByNodeOperator(nodeOperatorId: string, historyLimit: number = 5): Promise<Validator[]> {
        try {
            return await this.repository.findByNodeOperator(nodeOperatorId, true, historyLimit);
        } catch (error) {
            logger.error(
                { error, nodeOperatorId },
                "Service error getting validators by node operator"
            );
            throw error;
        }
    }

    /**
     * Creates a new validator.
     * @param validatorAddress The validator address.
     * @param nodeOperatorId The Discord ID of the node operator.
     * @returns The created Validator object or undefined if creation failed.
     */
    public async createValidator(
        validatorAddress: string,
        nodeOperatorId: string
    ): Promise<Validator | undefined> {
        try {
            return await this.repository.create(validatorAddress, nodeOperatorId);
        } catch (error: any) {
            logger.error(
                { error: error.message, validatorAddress, nodeOperatorId },
                "Service error creating validator"
            );
            if (error.message.includes("already exists")) {
                return undefined;
            }
            throw new Error("Service failed to create validator.");
        }
    }

    /**
     * Creates a new validator without an operator (for blockchain-only validators).
     * @param validatorAddress The validator address.
     * @returns The created Validator object or undefined if creation failed.
     */
    public async createValidatorWithoutOperator(
        validatorAddress: string
    ): Promise<Validator | undefined> {
        try {
            return await this.repository.createWithoutOperator(validatorAddress);
        } catch (error: any) {
            logger.error(
                { error: error.message, validatorAddress },
                "Service error creating validator without operator"
            );
            if (error.message.includes("already exists")) {
                return undefined;
            }
            throw new Error("Service failed to create validator.");
        }
    }

    /**
     * Ensures a validator exists in the database, creating it if necessary.
     * @param validatorAddress The validator address.
     * @param nodeOperatorId Optional Discord ID of the node operator.
     * @returns The existing or created Validator object.
     */
    public async ensureValidatorExists(
        validatorAddress: string,
        nodeOperatorId?: string
    ): Promise<Validator> {
        try {
            let validator = await this.getValidatorByAddress(validatorAddress);
            
            if (!validator) {
                if (nodeOperatorId) {
                    validator = await this.createValidator(validatorAddress, nodeOperatorId);
                } else {
                    validator = await this.createValidatorWithoutOperator(validatorAddress);
                }
                
                if (!validator) {
                    throw new Error("Failed to create validator");
                }
                
                logger.info(
                    { validatorAddress, nodeOperatorId },
                    "Created new validator in database"
                );
            } else if (nodeOperatorId && !validator.nodeOperatorId) {
                // If validator exists without operator but we now have an operator, update it
                await this.repository.updateNodeOperator(validatorAddress, nodeOperatorId);
                validator.nodeOperatorId = nodeOperatorId;
                logger.info(
                    { validatorAddress, nodeOperatorId },
                    "Associated existing validator with operator"
                );
            }
            
            return validator;
        } catch (error) {
            logger.error(
                { error, validatorAddress, nodeOperatorId },
                "Service error ensuring validator exists"
            );
            throw error;
        }
    }

    /**
     * Deletes a validator by address.
     * @param validatorAddress The validator address.
     * @returns True if deletion was successful, false otherwise.
     */
    public async deleteValidator(validatorAddress: string): Promise<boolean> {
        try {
            return await this.repository.deleteByAddress(validatorAddress);
        } catch (error) {
            logger.error(
                { error, validatorAddress },
                "Service error deleting validator"
            );
            throw error;
        }
    }

    /**
     * Updates the peerId for a validator.
     * @param validatorAddress The validator address.
     * @param peerId The peer network ID to associate with the validator (null to remove).
     * @returns True if update was successful, false otherwise.
     */
    public async updateValidatorPeerId(validatorAddress: string, peerId: string | null): Promise<boolean> {
        try {
            return await this.repository.updatePeerId(validatorAddress, peerId);
        } catch (error) {
            logger.error(
                { error, validatorAddress, peerId },
                "Service error updating validator peerId"
            );
            throw error;
        }
    }

    /**
     * Updates validator stats with processed data
     * @param validatorAddress The validator address
     * @param statsData Processed stats data to update
     * @returns True if update was successful
     */
    public async updateValidatorStats(
        validatorAddress: string,
        statsData: Partial<Validator>
    ): Promise<boolean> {
        try {
            return await this.repository.updateValidatorStats(validatorAddress, statsData);
        } catch (error) {
            logger.error(
                { error, validatorAddress },
                "Service error updating validator stats"
            );
            throw error;
        }
    }

    /**
     * Batch update multiple validators' stats
     * @param updates Array of validator address and stats data pairs
     * @returns Number of successful updates
     */
    public async batchUpdateValidatorStats(
        updates: Array<{ validatorAddress: string; statsData: Partial<Validator> }>
    ): Promise<number> {
        try {
            return await this.repository.batchUpdateValidatorStats(updates);
        } catch (error) {
            logger.error(error, "Service error batch updating validator stats");
            throw error;
        }
    }
}

export const validatorService = new ValidatorService();
export default validatorService; 