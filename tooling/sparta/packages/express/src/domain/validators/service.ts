import { logger } from "@sparta/utils";
import { validatorRepository, ValidatorRepository } from "../../db/validatorRepository";

export interface Validator {
    validatorAddress: string; // Primary Key
    nodeOperatorId: string; // GSI Partition Key: NodeOperatorIndex
    createdAt: number;
    updatedAt: number;
    peerId?: string; // Optional peer network ID for linking with crawler data
    
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
     * Retrieves all validators with pagination.
     * @param pageToken Optional token for pagination
     * @returns Object containing array of Validator objects and optional nextPageToken.
     */
    public async getAllValidators(pageToken?: string): Promise<{ validators: Validator[]; nextPageToken?: string }> {
        try {
            return await this.repository.findAll(pageToken);
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
     * @returns The Validator object or undefined if not found.
     */
    public async getValidatorByAddress(validatorAddress: string): Promise<Validator | undefined> {
        try {
            return await this.repository.findByAddress(validatorAddress);
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
     * @returns Array of Validator objects.
     */
    public async getValidatorsByNodeOperator(nodeOperatorId: string): Promise<Validator[]> {
        try {
            return await this.repository.findByNodeOperator(nodeOperatorId);
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