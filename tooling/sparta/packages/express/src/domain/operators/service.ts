import { logger } from "@sparta/utils"; // Assuming logger is accessible
import {
	nodeOperatorRepository, // Import the repository instance
	NodeOperatorRepository, // Import the repository type if needed for dependency injection
} from "../../db/nodeOperatorRepository"; // Corrected relative path from service to db

export interface NodeOperator {
	discordId: string; // Primary Key
	walletAddress: string; // GSI Partition Key: WalletAddressIndex
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
	 * Retrieves all node operators.
	 * @returns Array of NodeOperator objects.
	 */
	public async getAllOperators(): Promise<NodeOperator[]> {
		try {
			return await this.repository.findAll();
		} catch (error) {
			logger.error({ error }, "Service error getting all operators");
			// Re-throw or handle specific service-level errors
			throw error; // Re-throwing the repository error for now
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
	 * @returns The created NodeOperator object or undefined if creation failed (e.g., duplicate discordId).
	 */
	public async createOperator(
		discordId: string,
		walletAddress: string
	): Promise<NodeOperator | undefined> {
		try {
			// Add any service-level validation or transformation here
			return await this.repository.create(discordId, walletAddress);
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordId, walletAddress }, // Log error message
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
}

// Export a singleton instance of the service
export const nodeOperatorService = new NodeOperatorService();
