import { logger } from "@sparta/utils"; // Assuming logger is accessible
import {
	nodeOperatorRepository, // Import the repository instance
	NodeOperatorRepository, // Import the repository type if needed for dependency injection
} from "../../db/nodeOperatorRepository"; // Corrected relative path from service to db
import { validatorService } from "../validators/service";

export interface NodeOperator {
	discordId: string; // Primary Key
	walletAddress: string; // GSI Partition Key: WalletAddressIndex
	discordUsername?: string; // Optional Discord username
	isApproved?: boolean; // Whether the operator is approved
	wasSlashed?: boolean; // Whether the operator had a validator that was slashed
	createdAt: number;
	updatedAt: number;
}

class NodeOperatorService {
	// Optionally inject repository for testability
	private repository: NodeOperatorRepository;

	constructor(repository: NodeOperatorRepository = nodeOperatorRepository) {
		this.repository = repository;
		logger.info("NodeOperatorService initialized with repository.");
	}

	/**
	 * Retrieves all node operators with pagination.
	 * @param pageToken Optional token for pagination
	 * @returns Object containing array of NodeOperator objects and optional nextPageToken.
	 */
	public async getAllOperators(pageToken?: string): Promise<{ operators: NodeOperator[]; nextPageToken?: string }> {
		try {
			return await this.repository.findAll(pageToken);
		} catch (error) {
			logger.error(error, "Service error getting all operators");
			// Re-throw or handle specific service-level errors
			throw error; // Re-throwing the repository error for now
		}
	}

	/**
	 * Retrieves all node operators that have no associated validators with pagination.
	 * @param pageToken Optional token for pagination
	 * @returns Object containing array of NodeOperator objects without validators and optional nextPageToken.
	 */
	public async getOperatorsWithoutValidators(pageToken?: string): Promise<{ operators: NodeOperator[]; nextPageToken?: string }> {
		try {
			return await this.repository.findOperatorsWithoutValidators(pageToken);
		} catch (error) {
			logger.error(error, "Service error getting operators without validators");
			// Re-throw or handle specific service-level errors
			throw error; // Re-throwing the repository error for now
		}
	}

	/**
	 * Counts the total number of node operators.
	 * @returns The count of node operators.
	 */
	public async countOperators(): Promise<number> {
		try {
			return await this.repository.countAll();
		} catch (error) {
			logger.error(error, "Service error counting operators");
			throw error;
		}
	}

	/**
	 * Retrieves a node operator by their Discord ID.
	 * @param discordId The Discord ID.
	 * @returns The NodeOperator object or undefined if not found.
	 */
	public async getOperatorByDiscordId(
		discordId: string
	): Promise<NodeOperator | undefined> {
		try {
			return await this.repository.findByDiscordId(discordId);
		} catch (error) {
			logger.error(
				{ error, discordId },
				"Service error getting operator by Discord ID"
			);
			throw error;
		}
	}

	/**
	 * Retrieves a node operator by their Discord username.
	 * @param discordUsername The Discord username.
	 * @returns The NodeOperator object or undefined if not found.
	 */
	public async getOperatorByDiscordUsername(
		discordUsername: string
	): Promise<NodeOperator | undefined> {
		try {
			return await this.repository.findByDiscordUsername(discordUsername);
		} catch (error) {
			logger.error(
				{ error, discordUsername },
				"Service error getting operator by Discord username"
			);
			throw error;
		}
	}

	/**
	 * Retrieves a node operator by their wallet address.
	 * @param walletAddress The wallet address.
	 * @returns The NodeOperator object or undefined if not found.
	 */
	public async getOperatorByAddress(
		walletAddress: string
	): Promise<NodeOperator | undefined> {
		try {
			// Add any service-level validation or logic here if needed
			return await this.repository.findByWalletAddress(walletAddress);
		} catch (error) {
			logger.error(
				{ error, walletAddress },
				"Service error getting operator by wallet address"
			);
			throw error;
		}
	}

	/**
	 * Creates a new node operator.
	 * @param discordId The Discord ID.
	 * @param walletAddress The wallet address.
	 * @param discordUsername The Discord username.
	 * @returns The created NodeOperator object or undefined if creation failed (e.g., duplicate discordId).
	 */
	public async createOperator(
		discordId: string,
		walletAddress: string,
		discordUsername: string,
		isApproved?: boolean
	): Promise<NodeOperator | undefined> {
		try {
			// Add any service-level validation or transformation here
			return await this.repository.create(discordId, walletAddress, discordUsername, isApproved);
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordId, walletAddress, discordUsername }, // Log error message
				"Service error creating operator"
			);
			// Check for specific repository errors (like duplicate) and handle
			if (error.message.includes("already exists")) {
				return undefined; // Indicate conflict at the service level
			}
			throw new Error("Service failed to create node operator."); // Throw a generic service error
		}
	}

	/**
	 * Updates the wallet address for a node operator.
	 * @param discordId The Discord ID of the operator to update.
	 * @param newWalletAddress The new wallet address.
	 * @returns True if the update was successful, false otherwise (e.g., operator not found).
	 */
	public async updateOperatorWallet(
		discordId: string,
		newWalletAddress: string
	): Promise<boolean> {
		try {
			// Add service-level validation if needed
			return await this.repository.updateWallet(
				discordId,
				newWalletAddress
			);
		} catch (error) {
			logger.error(
				{ error, discordId, newWalletAddress },
				"Service error updating operator wallet"
			);
			// The repository already returns false if not found due to condition check
			// If other errors occur, re-throw
			throw error;
		}
	}

	/**
	 * Deletes a node operator by their Discord ID.
	 * @param discordId The Discord ID of the operator to delete.
	 * @returns True if deletion was successful, false otherwise (e.g., operator not found).
	 */
	public async deleteOperatorByDiscordId(
		discordId: string
	): Promise<boolean> {
		try {
			return await this.repository.deleteByDiscordId(discordId);
		} catch (error) {
			logger.error(
				{ error, discordId },
				"Service error deleting operator by Discord ID"
			);
			// Repository returns false if not found, re-throw other errors
			throw error;
		}
	}

	/**
	 * Updates the approval status for a node operator.
	 * @param discordId The Discord ID of the operator to update.
	 * @param isApproved The approval status to set.
	 * @returns True if the update was successful, false otherwise (e.g., operator not found).
	 */
	public async updateApprovalStatus(
		discordId: string,
		isApproved: boolean
	): Promise<boolean> {
		try {
			return await this.repository.updateApprovalStatus(
				discordId,
				isApproved
			);
		} catch (error) {
			logger.error(
				{ error, discordId, isApproved },
				"Service error updating operator approval status"
			);
			// The repository already returns false if not found due to condition check
			// If other errors occur, re-throw
			throw error;
		}
	}

	/**
	 * Updates the slashed status for a node operator.
	 * @param discordId The Discord ID of the operator to update.
	 * @param wasSlashed The slashed status to set.
	 * @returns True if the update was successful, false otherwise (e.g., operator not found).
	 */
	public async updateSlashedStatus(
		discordId: string,
		wasSlashed: boolean
	): Promise<boolean> {
		try {
			return await this.repository.updateSlashedStatus(
				discordId,
				wasSlashed
			);
		} catch (error) {
			logger.error(
				{ error, discordId, wasSlashed },
				"Service error updating operator slashed status"
			);
			// The repository already returns false if not found due to condition check
			// If other errors occur, re-throw
			throw error;
		}
	}

	/**
	 * Adds a validator to an operator using the validator service.
	 * @param discordId The Discord ID of the operator.
	 * @param validatorAddress The validator address to add.
	 * @returns True if the update was successful, false otherwise.
	 */
	public async addValidatorToOperator(
		discordId: string,
		validatorAddress: string
	): Promise<boolean> {
		try {
			const operator = await this.repository.findByDiscordId(discordId);
			
			if (!operator) {
				return false;
			}
			
			// Create a new validator associated with this operator
			const validator = await validatorService.createValidator(validatorAddress, discordId);
			return !!validator;
		} catch (error) {
			logger.error(
				{ error, discordId, validatorAddress },
				"Service error adding validator to operator"
			);
			throw error;
		}
	}

	/**
	 * Updates the complete list of validators for an operator.
	 * @param discordId The Discord ID of the operator.
	 * @param validators Array of validator addresses to set.
	 * @returns True if the update was successful, false otherwise.
	 */
	public async updateValidatorsList(
		discordId: string,
		validators: string[]
	): Promise<boolean> {
		try {
			// First, check if the operator exists
			const operator = await this.repository.findByDiscordId(discordId);
			if (!operator) {
				return false;
			}
			
			// Get all current validators for this operator
			const currentValidators = await validatorService.getValidatorsByNodeOperator(discordId);
			const currentAddresses = currentValidators.map(v => v.validatorAddress);
			
			// Determine which validators to add and which to remove
			const validatorsToAdd = validators.filter(addr => !currentAddresses.includes(addr));
			const validatorsToRemove = currentAddresses.filter(addr => !validators.includes(addr));
			
			// Remove validators not in the new list
			for (const addr of validatorsToRemove) {
				await validatorService.deleteValidator(addr);
			}
			
			// Add new validators
			for (const addr of validatorsToAdd) {
				await validatorService.createValidator(addr, discordId);
			}
			
			return true;
		} catch (error) {
			logger.error(
				{ error, discordId },
				"Service error updating validators list"
			);
			throw error;
		}
	}

	/**
	 * Checks if an operator was slashed.
	 * @param discordId The Discord ID of the operator to check.
	 * @returns True if the operator was slashed, false otherwise.
	 */
	public async isOperatorSlashed(discordId: string): Promise<boolean> {
		try {
			const operator = await this.repository.findByDiscordId(discordId);
			return operator?.wasSlashed === true;
		} catch (error) {
			logger.error(
				{ error, discordId },
				"Service error checking if operator was slashed"
			);
			throw error;
		}
	}

	/**
	 * Counts all node operators that have no associated validators and are approved.
	 * @returns The count of approved node operators without validators.
	 */
	public async countApprovedOperatorsWithoutValidators(): Promise<number> {
		try {
			return await this.repository.countApprovedOperatorsWithoutValidators();
		} catch (error) {
			logger.error(error, "Service error counting approved operators without validators");
			// Re-throw or handle specific service-level errors
			throw error; // Re-throwing the repository error for now
		}
	}
}

export const nodeOperatorService = new NodeOperatorService();
export default nodeOperatorService;
