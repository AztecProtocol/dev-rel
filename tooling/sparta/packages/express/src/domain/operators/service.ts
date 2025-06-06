import { logger } from "@sparta/utils"; // Assuming logger is accessible
import {
	nodeOperatorRepository, // Import the repository instance
	NodeOperatorRepository, // Import the repository type if needed for dependency injection
} from "../../db/nodeOperatorRepository"; // Corrected relative path from service to db

export interface SocialAccount {
	status: 'pending' | 'verified' | 'rejected';
}

export interface NodeOperator {
	address: string; // Primary Key (wallet address)
	discordId?: string; // Secondary Key (indexed, optional)
	xId?: string; // Changed from SocialsXId, For GSI on socials.x.id
	createdAt: number;
	updatedAt: number;
	socials?: {
		discord?: SocialAccount;
		x?: SocialAccount;
	};
	validators?: string[]; // Array of validator addresses associated with this operator
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
	 * @param limit Optional maximum number of operators to return per page (defaults to 100).
	 * @returns Object containing array of NodeOperator objects and optional nextPageToken.
	 */
	public async getAllOperators(pageToken?: string, limit: number = 100): Promise<{ operators: NodeOperator[]; nextPageToken?: string }> {
		try {
			return await this.repository.findAll(pageToken, limit);
		} catch (error) {
			logger.error(error, "Service error getting all operators");
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
	 * Retrieves a node operator by their address.
	 * @param address The wallet address.
	 * @returns The NodeOperator object or undefined if not found.
	 */
	public async getOperatorByAddress(
		address: string
	): Promise<NodeOperator | undefined> {
		try {
			return await this.repository.findByAddress(address);
		} catch (error) {
			logger.error(
				{ error, address },
				"Service error getting operator by address"
			);
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
	 * Creates a new node operator.
	 * @param address The wallet address (required).
	 * @param discordId Optional Discord ID.
	 * @param socials Optional social accounts data.
	 * @returns The created NodeOperator object or undefined if creation failed (e.g., duplicate address).
	 */
	public async createOperator(
		address: string,
		discordId?: string,
		socials?: NodeOperator['socials']
	): Promise<NodeOperator | undefined> {
		try {
			const operatorData: Partial<NodeOperator> = {
				address,
				discordId,
				socials,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			// Note: xId would be set separately when X is verified

			// The repository.create method will need to be updated to accept this structure
			return await this.repository.create(operatorData as NodeOperator);
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordId, address }, // Log error message
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
	 * Counts operators without validators.
	 * @returns The count of operators without validators.
	 */
	public async countOperatorsWithoutValidators(): Promise<number> {
		try {
			return await this.repository.countAllOperatorsWithoutValidators();
		} catch (error) {
			logger.error(error, "Service error counting operators without validators");
			throw error;
		}
	}

	/**
	 * Counts operators with multiple validators.
	 * @returns The count of operators with more than one validator.
	 */
	public async countOperatorsWithMultipleValidators(): Promise<number> {
		try {
			return await this.repository.countOperatorsWithMultipleValidators();
		} catch (error) {
			logger.error(error, "Service error counting operators with multiple validators");
			throw error;
		}
	}

	/**
	 * Updates the social account status for a node operator.
	 * @param address The wallet address of the operator.
	 * @param social The social platform (discord or x).
	 * @param status The new status to set.
	 * @returns True if the update was successful, false otherwise.
	 */
	public async updateSocialStatus(
		address: string,
		social: 'discord' | 'x',
		status: 'pending' | 'verified' | 'rejected'
	): Promise<boolean> {
		try {
			const operator = await this.repository.findByAddress(address);
			if (!operator || !operator.socials || !operator.socials[social]) {
				logger.warn(
					{ address, social },
					"Operator or social account not found for update"
				);
				return false;
			}

			const socialAccount = operator.socials[social]!;
			const oldStatus = socialAccount.status;

			// Update the social status
			socialAccount.status = status;
			
			const updates: Partial<NodeOperator> = {
				socials: operator.socials,
				updatedAt: Date.now(),
			};

			// No need to update discordId or xId here since they're already set
			// when the operator is created or when social linking is initiated

			// The repository.update method will need to handle these partial updates.
			// It might take an address and a Partial<NodeOperator>.
			// For now, assuming a generic update method exists or will be created.
			return await this.repository.update(address, updates);
		} catch (error) {
			logger.error(
				{ error, address, social, status },
				"Service error updating social status"
			);
			throw error;
		}
	}

	/**
	 * Deletes a node operator by their wallet address.
	 * @param address The wallet address of the operator to delete.
	 * @returns True if deletion was successful, false otherwise (e.g., operator not found).
	 */
	public async deleteOperatorByAddress(
		address: string
	): Promise<boolean> {
		try {
			return await this.repository.deleteByAddress(address);
		} catch (error) {
			logger.error(
				{ error, address },
				"Service error deleting operator by address"
			);
			// Repository returns false if not found, re-throw other errors
			throw error;
		}
	}

	/**
	 * Retrieves a node operator by their social platform handle.
	 * @param socialPlatform The social platform (discord, x).
	 * @param socialHandle The social platform handle/ID.
	 * @returns The NodeOperator object or undefined if not found.
	 */
	public async getOperatorBySocial(
		socialPlatform: 'discord' | 'x',
		socialHandle: string
	): Promise<NodeOperator | undefined> {
		try {
			return await this.repository.findBySocial(socialPlatform, socialHandle);
		} catch (error) {
			logger.error(
				{ error, socialPlatform, socialHandle },
				"Service error getting operator by social handle"
			);
			throw error;
		}
	}

	/**
	 * Adds a validator to the operator's validators array.
	 * @param address The wallet address of the operator.
	 * @param validatorAddress The address of the validator to add.
	 * @returns True if the update was successful, false otherwise.
	 */
	public async addValidatorToOperator(
		address: string,
		validatorAddress: string
	): Promise<boolean> {
		try {
			const operator = await this.repository.findByAddress(address);
			if (!operator) {
				logger.warn(
					{ address },
					"Operator not found for adding validator"
				);
				return false;
			}

			// Initialize validators array if it doesn't exist
			const validators = operator.validators || [];
			
			// Check if validator already exists
			const exists = validators.some(v => v === validatorAddress);
			if (exists) {
				logger.debug(
					{ address, validatorAddress },
					"Validator already exists in operator's validators array"
				);
				return true; // Already exists, consider it successful
			}

			// Add the new validator
			validators.push(validatorAddress);

			// Update the operator
			const updates: Partial<NodeOperator> = {
				validators,
				updatedAt: Date.now(),
			};

			return await this.repository.update(address, updates);
		} catch (error) {
			logger.error(
				{ error, address, validatorAddress },
				"Service error adding validator to operator"
			);
			throw error;
		}
	}

	/**
	 * Removes a validator from the operator's validators array.
	 * @param address The wallet address of the operator.
	 * @param validatorAddress The address of the validator to remove.
	 * @returns True if the update was successful, false otherwise.
	 */
	public async removeValidatorFromOperator(
		address: string,
		validatorAddress: string
	): Promise<boolean> {
		try {
			const operator = await this.repository.findByAddress(address);
			if (!operator) {
				logger.warn(
					{ address },
					"Operator not found for removing validator"
				);
				return false;
			}

			// Check if validators array exists
			if (!operator.validators || operator.validators.length === 0) {
				logger.debug(
					{ address },
					"Operator has no validators to remove"
				);
				return true; // Nothing to remove, consider it successful
			}

			// Filter out the validator
			const updatedValidators = operator.validators.filter(
				v => v !== validatorAddress
			);

			// Check if anything was actually removed
			if (updatedValidators.length === operator.validators.length) {
				logger.debug(
					{ address, validatorAddress },
					"Validator not found in operator's validators array"
				);
				return true; // Validator wasn't there, consider it successful
			}

			// Update the operator
			const updates: Partial<NodeOperator> = {
				validators: updatedValidators,
				updatedAt: Date.now(),
			};

			return await this.repository.update(address, updates);
		} catch (error) {
			logger.error(
				{ error, address, validatorAddress },
				"Service error removing validator from operator"
			);
			throw error;
		}
	}
}

export const nodeOperatorService = new NodeOperatorService();
export default nodeOperatorService;
