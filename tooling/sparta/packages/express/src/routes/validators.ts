import express from "express";
import { logger } from "@sparta/utils";
import { nodeOperatorService } from "../domain/operators/service";
import { validatorService, type Validator } from "../domain/validators/service";
import { getEthereumInstance } from "@sparta/ethereum";

const router = express.Router();

// GET /api/validator/validators - returns all validators
/**
 * @swagger
 * /api/validator/validators:
 *   get:
 *     summary: Get all validators
 *     description: Retrieves a list of all validators in the system.
 *     tags: [Validator]
 *     operationId: getAllValidators
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: A list of validators from blockchain and known validators in the database.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful.
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     blockchainValidators:
 *                       type: object
 *                       properties:
 *                         validators:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of all validator addresses from the blockchain.
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalValidators:
 *                               type: number
 *                               description: Total number of validators in the blockchain.
 *                     knownValidators:
 *                       type: object
 *                       properties:
 *                         validators:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of validator addresses that have matching operators in the database.
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalValidators:
 *                               type: number
 *                               description: Total number of validators with matching operators.
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.get("/validators", async (_req, res) => {
	try {
		// Get Ethereum instance to retrieve all validators from blockchain
		const ethereum = await getEthereumInstance();
		const rollupInfo = await ethereum.getRollupInfo();
		const blockchainValidators = rollupInfo.validators;
		
		// Get all validators from database using pagination
		let allDbValidators: Validator[] = [];
		let nextPageToken: string | undefined = undefined;
		
		do {
			const result = await validatorService.getAllValidators(nextPageToken);
			allDbValidators = allDbValidators.concat(result.validators);
			nextPageToken = result.nextPageToken;
			logger.info(`Retrieved ${result.validators.length} validators from database, total so far: ${allDbValidators.length}`);
		} while (nextPageToken);
		
		// Create a Set of database validator addresses for O(1) lookup
		const dbValidatorAddresses = new Set(allDbValidators.map(v => v.validatorAddress.toLowerCase()));
		
		// Find intersection - blockchain validators that exist in database
		const validatorsWithOperators = blockchainValidators.filter(address => 
			dbValidatorAddresses.has(address.toLowerCase())
		);
		
		// Log for debugging
		logger.info(`Retrieved ${blockchainValidators.length} validators from blockchain and ${allDbValidators.length} validators in database`);
		logger.info(`Found ${validatorsWithOperators.length} validators with matching operators in database`);
		
		return res.status(200).json({
			success: true,
			data: {
				blockchainValidators: {
					validators: blockchainValidators,
					stats: {
						totalValidators: blockchainValidators.length,
					},
				},
				knownValidators: {
					validators: validatorsWithOperators,
					stats: {
						totalValidators: validatorsWithOperators.length,
					},
				},
			},
		});
	} catch (error) {
		logger.error(error, "Error retrieving validators");
		res.status(500).json({ error: "Failed to retrieve validators" });
	}
	return;
});

// GET /api/validator - returns a specific validator by address
/**
 * @swagger
 * /api/validator:
 *   get:
 *     summary: Get validator information
 *     description: Retrieves validator information either by validator address or by operator (discordId/username).
 *     tags: [Validator]
 *     operationId: getValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: false
 *         description: The validator address to retrieve information for.
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to get validators for.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to get validators for.
 *     responses:
 *       200:
 *         description: The requested validator information or validators for an operator.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/ValidatorResponse'
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/ValidatorResponse'
 *       400:
 *         description: Bad Request - Missing or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       404:
 *         description: Validator or operator not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.get("/", async (req, res) => {
	try {
		const address = req.query.address as string | undefined;
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		// Require at least one parameter
		if (!address && !discordId && !discordUsername) {
			return res.status(400).json({ 
				error: "At least one parameter is required: address, discordId, or discordUsername" 
			});
		}
		
		// If address is provided, get the specific validator
		if (address) {
			// Basic address validation
			if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
				return res.status(400).json({
					error: "Invalid validator address format",
				});
			}
			
			const validator = await validatorService.getValidatorByAddress(address);
			
			if (!validator) {
				return res.status(404).json({ error: "Validator not found" });
			}
			
			// Get Ethereum instance to check if validator is active in rollup
			const ethereum = await getEthereumInstance();
			const rollupInfo = await ethereum.getRollupInfo();
			const isInRollup = rollupInfo.validators.includes(validator.validatorAddress);
			
			// Get operator information if available
			let operator = null;
			try {
				operator = await nodeOperatorService.getOperatorByDiscordId(validator.nodeOperatorId);
			} catch (error) {
				logger.warn(
					{ nodeOperatorId: validator.nodeOperatorId, validatorAddress: address },
					"Could not find operator for validator"
				);
			}

			
			return res.status(200).json({
				success: true,
				data: {
					address: validator.validatorAddress,
					peerId: validator.peerId,
					operatorId: validator.nodeOperatorId,
					isActive: isInRollup,
					operator: operator,
					createdAt: validator.createdAt,
					updatedAt: validator.updatedAt,
				},
			});
		}
		
		// Original logic for getting validators by operator
		// Get Ethereum instance to access validators
		const ethereum = await getEthereumInstance();
		const rollupInfo = await ethereum.getRollupInfo();
		
		let operatorId = discordId;
		let operator = null;
		
		if (discordId) {
			operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operator = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operator) {
				operatorId = operator.discordId;
			}
		}
		
		if (!operator || !operatorId) {
			return res.status(404).json({ error: "Operator not found" });
		}
		
		// Get all validators for this operator
		const validators = await validatorService.getValidatorsByNodeOperator(operatorId);
		
		// Get detailed info for each validator
		const validatorDetails = validators.map(validator => {
			const isInRollup = rollupInfo.validators.includes(validator.validatorAddress);
			
			return {
				address: validator.validatorAddress,
				peerId: validator.peerId,
				operatorId: validator.nodeOperatorId,
				isActive: isInRollup, // Whether the validator is active in the rollup
			};
		});
		
		return res.status(200).json({
			success: true,
			data: {
				operator: operator,
				validators: validatorDetails
			},
		});
	} catch (error) {
		logger.error(error, "Error retrieving validator");
		res.status(500).json({ error: "Failed to retrieve validator" });
	}
	return;
});

// POST /api/validator - adds a new validator
/**
 * @swagger
 * /api/validator:
 *   post:
 *     summary: Add a new validator
 *     description: Adds a new validator and associates it with an operator.
 *     tags: [Validator]
 *     operationId: addValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to associate with this validator.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to associate with this validator.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validatorAddress:
 *                 type: string
 *                 description: The validator address to add.
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *               skipOnChain:
 *                 type: boolean
 *                 description: Whether to skip adding the validator on-chain. If true, only adds to database.
 *                 example: false
 *                 default: false
 *             required:
 *               - validatorAddress
 *     responses:
 *       201:
 *         description: Validator added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ValidatorResponse'
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       404:
 *         description: Operator not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.post("/", async (req, res) => {
	try {
		const { validatorAddress, skipOnChain } = req.body;
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		// Validate input parameters
		if (!validatorAddress) {
			return res.status(400).json({
				error: "Missing required parameter: validatorAddress",
			});
		}
		
		if (!discordId && !discordUsername) {
			return res.status(400).json({
				error: "Missing required parameter: either discordId or discordUsername must be provided as a query parameter",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Find operator by discordId or discordUsername
		let operator;
		let operatorId = discordId;
		
		if (discordId) {
			operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operator = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operator) {
				operatorId = operator.discordId;
			}
		}
		
		if (!operator || !operatorId) {
			return res.status(404).json({
				error: "Node operator not found",
			});
		}
		
		// Check if the operator is approved
		if (!operator.isApproved) {
			return res.status(403).json({
				error: "Node operator is not approved",
				message: "Your account requires approval before adding validators."
			});
		}

		// // Check if this operator was previously slashed
		// if (operator.wasSlashed) {
		// 	return res.status(403).json({
		// 		error: "Operator was slashed",
		// 		message: "Your validator was slashed, so you are unable to re-add your validator."
		// 	});
		// }
		
		// Get Ethereum instance for both on-chain operations and stats
		const ethereum = await getEthereumInstance();
		
		// Add the validator to the database first (easier to rollback)
		let validatorCreated = false;
		let operatorUpdated = false;
		
		try {
			// Step 1: Add validator to database
			await validatorService.createValidator(validatorAddress, operatorId);
			validatorCreated = true;
			
			// Step 2: Add validator to operator in database
			await nodeOperatorService.addValidatorToOperator(operatorId, validatorAddress);
			operatorUpdated = true;
			
			// Step 3: Add validator to Ethereum rollup (if not skipped)
			if (!skipOnChain) {
				await ethereum.addValidator(validatorAddress);
			}
			
		} catch (error: any) {
			// Rollback database operations if Ethereum operation failed
			logger.error(error, "Error during validator addition, attempting rollback");
			
			try {
				if (operatorUpdated) {
					// Note: You may need to implement removeValidatorFromOperator method
					// For now, we'll log that manual cleanup may be needed
					logger.warn(`Manual cleanup may be needed for operator ${operatorId} and validator ${validatorAddress}`);
				}
				
				if (validatorCreated) {
					await validatorService.deleteValidator(validatorAddress);
					logger.info(`Successfully rolled back validator creation for ${validatorAddress}`);
				}
			} catch (rollbackError) {
				logger.error(rollbackError, "Failed to rollback database operations - manual cleanup required");
			}
			
			// Re-throw the original error
			throw error;
		}

		return res.status(201).json({
			success: true,
			data: {
				address: validatorAddress,
				operatorId: operatorId,
				operatorInfo: operator,
			},
		});
	} catch (error: any) {
		logger.error(error.message, "Error adding validator");
		res.status(500).json({ error: error.message });
	}
	return;
});

// PUT /api/validator - updates validator information (e.g., peerId)
/**
 * @swagger
 * /api/validator:
 *   put:
 *     summary: Update validator information
 *     description: Updates validator information such as peer network ID.
 *     tags: [Validator]
 *     operationId: updateValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator who owns this validator.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator who owns this validator.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validatorAddress:
 *                 type: string
 *                 description: The validator address to update.
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *               peerId:
 *                 type: string
 *                 description: The peer network ID to associate with this validator. Use null to remove.
 *                 example: "16Uiu2HAmJpn1h7BCnz2XqmeuoykU7J7f52o8S4DtU4LpjVCJD1RU"
 *                 nullable: true
 *             required:
 *               - validatorAddress
 *     responses:
 *       200:
 *         description: Validator updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                     peerId:
 *                       type: string
 *                       nullable: true
 *                     updatedAt:
 *                       type: number
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       403:
 *         description: Forbidden - Validator not owned by operator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       404:
 *         description: Validator or operator not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.put("/", async (req, res) => {
	try {
		const { validatorAddress, peerId } = req.body;
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		// Validate input parameters
		if (!validatorAddress) {
			return res.status(400).json({
				error: "Missing required parameter: validatorAddress",
			});
		}
		
		if (!discordId && !discordUsername) {
			return res.status(400).json({
				error: "Missing required parameter: either discordId or discordUsername must be provided as a query parameter",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Validate peerId format if provided (basic libp2p peer ID validation)
		if (peerId !== null && peerId !== undefined && peerId !== "") {
			// Basic peer ID validation - should start with specific prefixes and be base58 encoded
			if (!/^(1|Qm|16Uiu2H)[A-Za-z0-9]{44,}$/.test(peerId)) {
				return res.status(400).json({
					error: "Invalid peerId format. Expected libp2p peer ID format.",
				});
			}
		}
		
		// Find operator by discordId or discordUsername
		let operator;
		let operatorId = discordId;
		
		if (discordId) {
			operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operator = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operator) {
				operatorId = operator.discordId;
			}
		}
		
		if (!operator || !operatorId) {
			return res.status(404).json({
				error: "Node operator not found",
			});
		}
		
		// Check if the validator exists and is owned by this operator
		const validator = await validatorService.getValidatorByAddress(validatorAddress);
		
		if (!validator) {
			return res.status(404).json({
				error: "Validator not found",
			});
		}
		
		if (validator.nodeOperatorId !== operatorId) {
			return res.status(403).json({
				error: "Validator not owned by this operator",
			});
		}
		
		// Update the peerId
		const normalizedPeerId = (peerId === null || peerId === undefined || peerId === "") ? null : peerId;
		const success = await validatorService.updateValidatorPeerId(validatorAddress, normalizedPeerId);
		
		if (!success) {
			return res.status(500).json({
				error: "Failed to update validator peerId",
			});
		}
		
		return res.status(200).json({
			success: true,
			data: {
				address: validatorAddress,
				peerId: normalizedPeerId,
				updatedAt: Date.now(),
			},
		});
	} catch (error: any) {
		logger.error(error, "Error updating validator");
		res.status(500).json({ error: error.message || "Failed to update validator" });
	}
	return;
});

// DELETE /api/validator - removes a validator from an operator
/**
 * @swagger
 * /api/validator:
 *   delete:
 *     summary: Remove a validator
 *     description: Removes a validator from an operator's list of validators.
 *     tags: [Validator]
 *     operationId: removeValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: validatorAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: The validator address to remove.
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator.
 *     responses:
 *       204:
 *         description: Validator removed successfully.
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       404:
 *         description: Operator or validator not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.delete("/", async (req, res) => {
	try {
		const validatorAddress = req.query.validatorAddress as string;
		const discordId = req.query.discordId as string;
		
		// Validate input parameters
		if (!validatorAddress || !discordId) {
			return res.status(400).json({
				error: "Missing required parameters: validatorAddress or discordId",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Check if operator exists
		const operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		if (!operator) {
			return res.status(404).json({
				error: "Node operator not found",
			});
		}
		
		// Check if the validator exists and is associated with the operator
		const validator = await validatorService.getValidatorByAddress(validatorAddress);
		
		if (!validator) {
			return res.status(404).json({
				error: "Validator not found",
			});
		}
		
		if (validator.nodeOperatorId !== discordId) {
			return res.status(404).json({
				error: "Validator not found for this operator",
			});
		}
		
		// Delete the validator
		const success = await validatorService.deleteValidator(validatorAddress);
		
		if (!success) {
			return res.status(500).json({
				error: "Failed to remove validator",
			});
		}
		
		// Optionally, you could also call ethereum.removeValidator(validatorAddress)
		// if there's a need to remove from the blockchain as well
		
		return res.status(204).send();
	} catch (error) {
		logger.error(error, "Error removing validator");
		res.status(500).json({ error: "Failed to remove validator" });
	}
	return;
});

export default router; 