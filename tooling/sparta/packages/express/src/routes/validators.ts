import express from "express";
import { logger } from "@sparta/utils";
import { nodeOperatorService } from "../domain/operators/service";
import { validatorService, type Validator } from "../domain/validators/service";
import { getEthereumInstance, l2InfoService } from "@sparta/ethereum";

const router = express.Router();

// GET /api/validator/validators - returns all validators
/**
 * @swagger
 * /api/validator/validators:
 *   get:
 *     summary: Get all validators
 *     description: Retrieves a comprehensive list of all validators with available information from blockchain, database, and external sources. Always includes the 5 latest history slots for each validator.
 *     tags: [Validator]
 *     operationId: getAllValidators
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: A comprehensive list of all validators with available information, including 5 latest history slots for each validator.
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
 *                     validators:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ValidatorResponse'
 *                       description: Array of all validators with comprehensive information and 5 latest history slots.
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalValidators:
 *                           type: number
 *                           description: Total number of validators.
 *                         activeValidators:
 *                           type: number
 *                           description: Number of validators active in the current rollup.
 *                         knownValidators:
 *                           type: number
 *                           description: Number of validators with associated operators.
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
router.get("/validators", async (req, res) => {
	try {
		
		// Remove manual sync call - data is now synced automatically by epoch listener
		
		// Get all validators from database with 5 latest history slots
		logger.info("Starting validator fetch from database");
		const result = await validatorService.getAllValidators(undefined, true, 5);
		const allValidators = result.validators;
		
		logger.info(`Retrieved ${allValidators.length} validators from database`);
		
		logger.info(`Processing ${allValidators.length} validators for comprehensive response`);
		
		// Build comprehensive validator information (now including history)
		const successfulValidators = allValidators.map((validator) => {
			const validatorResponse: any = {
				address: validator.validatorAddress,
				peerId: validator.peerId,
				operatorId: validator.nodeOperatorId,
				createdAt: validator.createdAt,
				updatedAt: validator.updatedAt,
				// Include all processed validator stats
				epoch: validator.epoch,
				hasAttested24h: validator.hasAttested24h,
				lastAttestationSlot: validator.lastAttestationSlot,
				lastAttestationTimestamp: validator.lastAttestationTimestamp,
				lastAttestationDate: validator.lastAttestationDate,
				lastProposalSlot: validator.lastProposalSlot,
				lastProposalTimestamp: validator.lastProposalTimestamp,
				lastProposalDate: validator.lastProposalDate,
				missedAttestationsCount: validator.missedAttestationsCount,
				missedProposalsCount: validator.missedProposalsCount,
				totalSlots: validator.totalSlots,
				// Include 5 latest history slots
				history: validator.history || [],
				// Include all processed peer data
				peerClient: validator.peerClient,
				peerCountry: validator.peerCountry,
				peerCity: validator.peerCity,
				peerIpAddress: validator.peerIpAddress,
				peerPort: validator.peerPort,
				peerIsSynced: validator.peerIsSynced,
				peerBlockHeight: validator.peerBlockHeight,
				peerLastSeen: validator.peerLastSeen,
			};

			return validatorResponse;
		});
		
		// Calculate statistics
		const stats = {
			totalValidators: successfulValidators.length,
			activeValidators: successfulValidators.filter(v => v.hasAttested24h).length,
			knownValidators: successfulValidators.filter(v => v.operatorId).length,
		};
		
		logger.info(
			`Returning ${stats.totalValidators} validators (${stats.activeValidators} active, ${stats.knownValidators} known)`
		);
		
		return res.status(200).json({
			success: true,
			data: {
				validators: successfulValidators,
				stats: stats,
			},
		});
	} catch (error) {
		logger.error(error, "Error retrieving validators");
		res.status(500).json({ error: "Failed to retrieve validators" });
	}
	return;
});

// GET /api/validator - returns validators for a specific operator by discordId
/**
 * @swagger
 * /api/validator:
 *   get:
 *     summary: Get validator information
 *     description: Retrieves validator information either by validator address or by operator's Discord ID.
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
 *         description: The Discord ID of the operator to retrieve validators for.
 *       - in: query
 *         name: historyLimit
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 1000
 *           default: 100
 *         required: false
 *         description: Maximum number of history entries to return (defaults to 100).
 *     responses:
 *       200:
 *         description: The requested validator information or operator's validators.
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
 *                   oneOf:
 *                     - $ref: '#/components/schemas/ValidatorResponse'
 *                     - type: object
 *                       properties:
 *                         operator:
 *                           type: object
 *                         validators:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ValidatorResponse'
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
		const historyLimit = req.query.historyLimit ? parseInt(req.query.historyLimit as string) : 100;
		
		// Validate historyLimit
		if (isNaN(historyLimit) || historyLimit < 0 || historyLimit > 1000) {
			return res.status(400).json({
				error: "Invalid historyLimit parameter. Must be a number between 0 and 1000.",
			});
		}
		
		// Handle validator lookup by address
		if (address) {
			// Basic address validation
			if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
				return res.status(400).json({
					error: "Invalid validator address format",
				});
			}

			// Remove manual sync call - data is now synced automatically by epoch listener
			
			const validator = await validatorService.getValidatorByAddress(address, historyLimit);
			
			if (!validator) {
				return res.status(404).json({ error: "Validator not found" });
			}
			
			// Get Ethereum instance to check if validator is active in rollup
			const ethereum = await getEthereumInstance();
			const rollupInfo = await ethereum.getRollupInfo();
			const isInRollup = rollupInfo.validators.includes(validator.validatorAddress);
			
			// Get operator information if available
			let operator = null;
			if (validator.nodeOperatorId) {
				try {
					operator = await nodeOperatorService.getOperatorByDiscordId(validator.nodeOperatorId);
				} catch (error) {
					logger.warn(
						{ nodeOperatorId: validator.nodeOperatorId, validatorAddress: address },
						"Could not find operator for validator"
					);
				}
			}

			return res.status(200).json({
				success: true,
				data: {
					address: validator.validatorAddress,
					peerId: validator.peerId,
					operatorId: validator.nodeOperatorId,
					operator: operator,
					createdAt: validator.createdAt,
					updatedAt: validator.updatedAt,
					// Include all processed validator stats
					epoch: validator.epoch,
					hasAttested24h: validator.hasAttested24h,
					lastAttestationSlot: validator.lastAttestationSlot,
					lastAttestationTimestamp: validator.lastAttestationTimestamp,
					lastAttestationDate: validator.lastAttestationDate,
					lastProposalSlot: validator.lastProposalSlot,
					lastProposalTimestamp: validator.lastProposalTimestamp,
					lastProposalDate: validator.lastProposalDate,
					missedAttestationsCount: validator.missedAttestationsCount,
					missedProposalsCount: validator.missedProposalsCount,
					totalSlots: validator.totalSlots,
					// Include attestation history
					history: validator.history || [],
					// Include all processed peer data
					peerClient: validator.peerClient,
					peerCountry: validator.peerCountry,
					peerCity: validator.peerCity,
					peerIpAddress: validator.peerIpAddress,
					peerPort: validator.peerPort,
					peerIsSynced: validator.peerIsSynced,
					peerBlockHeight: validator.peerBlockHeight,
					peerLastSeen: validator.peerLastSeen,
				},
			});
		}
		
		// Handle operator validators lookup by discordId
		if (discordId) {
			const operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
			
			if (!operator) {
				return res.status(404).json({
					error: "Node operator not found",
				});
			}
			
			// Fetch validators associated with this operator
			const validators = await validatorService.getValidatorsByNodeOperator(operator.discordId, historyLimit);
			
			return res.status(200).json({
				success: true,
				data: {
					operator: operator,
					validators: validators
				}
			});
		}
		
		// No valid parameters provided
		return res.status(400).json({ 
			error: "Missing required parameter: either address or discordId must be provided" 
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
 *     description: Adds a new validator and associates it with an operator. If the operator doesn't exist, it will be created automatically with approved status.
 *     tags: [Validator]
 *     operationId: addValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to associate with this validator. If the operator doesn't exist, it will be created automatically.
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
 *                 description: Whether to skip on-chain validator addition (for testing).
 *                 example: false
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
 *       403:
 *         description: Forbidden - Operator is not approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       409:
 *         description: Conflict - Validator already exists
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
		
		// Validate input parameters
		if (!validatorAddress) {
			return res.status(400).json({
				error: "Missing required parameter: validatorAddress",
			});
		}
		
		if (!discordId) {
			return res.status(400).json({
				error: "Missing required parameter: discordId must be provided as a query parameter",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Find or create operator by discordId
		let operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operator) {
			// Operator doesn't exist, create it
			// When creating an operator through validator addition, use the validator's address
			// as the operator's address. This ensures every operator has a unique address.
			operator = await nodeOperatorService.createOperator(
				discordId,
				validatorAddress, // Use the first validator's address as the operator's address
				true // Set isApproved to true by default
			);
			
			if (!operator) {
				return res.status(500).json({
					error: "Failed to create operator for validator addition",
				});
			}
			
			logger.info(`Created new operator ${discordId} with address ${validatorAddress} for validator addition`);
		}
		
		// Check if the operator is approved
		if (!operator.isApproved) {
			return res.status(403).json({
				error: "Node operator is not approved",
				message: "Your account requires approval before adding validators."
			});
		}

		// Update validator data to ensure we have the latest state
		// Remove manual sync call - data is now synced automatically by epoch listener
		
		// Get Ethereum instance and current rollup state
		const ethereum = await getEthereumInstance();
		const rollupInfo = await ethereum.getRollupInfo();
		const isInRollup = rollupInfo.validators.some(addr => addr.toLowerCase() === validatorAddress.toLowerCase());
		
		// Check if validator already exists in database
		const existingValidator = await validatorService.getValidatorByAddress(validatorAddress);
		
		if (existingValidator) {
			// Validator exists in database - check if it belongs to this operator or is unclaimed
			if (existingValidator.nodeOperatorId === discordId) {
				return res.status(409).json({
					error: "Validator already exists for this operator",
				});
			} else if (existingValidator.nodeOperatorId) {
				// Validator is assigned to a different operator (has a truthy nodeOperatorId)
				return res.status(409).json({
					error: "Validator already exists and is assigned to another operator",
				});
			}
			// If nodeOperatorId is falsy (null, undefined, or empty), the validator is unclaimed and can be claimed
		}
		
		// Create or claim validator in database
		await validatorService.ensureValidatorExists(validatorAddress, discordId);
		logger.info(`Ensured validator ${validatorAddress} exists and is assigned to operator ${discordId}`);
		
		// Add validator to rollup if not already there and not skipping on-chain
		if (!isInRollup && !skipOnChain) {
			await ethereum.addValidator(validatorAddress);
			logger.info(`Added validator ${validatorAddress} to rollup for operator ${discordId}`);
		} else {
			logger.info(`Validator ${validatorAddress} ${isInRollup ? 'already in rollup' : 'skipping on-chain addition'}`);
		}
		
		// Get the created validator with full information
		const createdValidator = await validatorService.getValidatorByAddress(validatorAddress);
		
		if (!createdValidator) {
			throw new Error("Failed to retrieve created validator");
		}
		
		// Return comprehensive validator information (similar to GET endpoint)
		return res.status(201).json({
			success: true,
			data: {
				address: createdValidator.validatorAddress,
				peerId: createdValidator.peerId,
				operatorId: createdValidator.nodeOperatorId,
				operator: operator,
				createdAt: createdValidator.createdAt,
				updatedAt: createdValidator.updatedAt,
				// Include all processed validator stats
				epoch: createdValidator.epoch,
				hasAttested24h: createdValidator.hasAttested24h,
				lastAttestationSlot: createdValidator.lastAttestationSlot,
				lastAttestationTimestamp: createdValidator.lastAttestationTimestamp,
				lastAttestationDate: createdValidator.lastAttestationDate,
				lastProposalSlot: createdValidator.lastProposalSlot,
				lastProposalTimestamp: createdValidator.lastProposalTimestamp,
				lastProposalDate: createdValidator.lastProposalDate,
				missedAttestationsCount: createdValidator.missedAttestationsCount,
				missedProposalsCount: createdValidator.missedProposalsCount,
				totalSlots: createdValidator.totalSlots,
				// Include attestation history
				history: createdValidator.history || [],
				// Include all processed peer data
				peerClient: createdValidator.peerClient,
				peerCountry: createdValidator.peerCountry,
				peerCity: createdValidator.peerCity,
				peerIpAddress: createdValidator.peerIpAddress,
				peerPort: createdValidator.peerPort,
				peerIsSynced: createdValidator.peerIsSynced,
				peerBlockHeight: createdValidator.peerBlockHeight,
				peerLastSeen: createdValidator.peerLastSeen,
			},
		});
	} catch (error: any) {
		logger.error(error, "Error adding validator");
		res.status(500).json({ error: error.message || "Failed to add validator" });
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
 *         required: true
 *         description: The Discord ID of the operator who owns this validator.
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
		
		// Validate input parameters
		if (!validatorAddress) {
			return res.status(400).json({
				error: "Missing required parameter: validatorAddress",
			});
		}
		
		if (!discordId) {
			return res.status(400).json({
				error: "Missing required parameter: discordId must be provided as a query parameter",
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
		
		// Find operator by discordId
		const operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operator) {
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
		
		if (!validator.nodeOperatorId || validator.nodeOperatorId !== discordId) {
			return res.status(404).json({
				error: "Validator not found for this operator",
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
		const discordId = req.query.discordId as string | undefined;
		
		// Validate input parameters
		if (!validatorAddress) {
			return res.status(400).json({
				error: "Missing required parameter: validatorAddress",
			});
		}
		
		if (!discordId) {
			return res.status(400).json({
				error: "Missing required parameter: discordId must be provided as a query parameter",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Find operator by discordId
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
		
		if (!validator.nodeOperatorId || validator.nodeOperatorId !== discordId) {
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
		
		logger.info(`Deleted validator ${validatorAddress} from operator ${discordId}. It will be re-synced as unclaimed if still in the rollup.`);
		
		// Note: We don't call ethereum.removeValidator() as this only removes the DB association
		// The validator will be re-added as unclaimed on the next sync if it's still in the rollup
		
		return res.status(204).send();
	} catch (error) {
		logger.error(error, "Error removing validator");
		res.status(500).json({ error: "Failed to remove validator" });
	}
	return;
});

// GET /api/validator/stats - returns network-wide validator statistics
/**
 * @swagger
 * /api/validator/stats:
 *   get:
 *     summary: Get validator network statistics
 *     description: Retrieves comprehensive network-wide statistics about validators, peers, and network health.
 *     tags: [Validator]
 *     operationId: getValidatorStats
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive validator network statistics.
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
 *                     network:
 *                       type: object
 *                       properties:
 *                         totalValidatorsInSet:
 *                           type: number
 *                           description: Total number of validators in the current rollup set.
 *                         activeValidators:
 *                           type: number
 *                           description: Number of validators who attested in the last 24 hours.
 *                         validatorsAttested24h:
 *                           type: number
 *                           description: Number of validators who attested in the last 24 hours.
 *                         validatorsProposed24h:
 *                           type: number
 *                           description: Number of validators who proposed blocks in the last 24 hours.
 *                         validatorsWithPeers:
 *                           type: number
 *                           description: Number of validators that have associated peer IDs.
 *                     performance:
 *                       type: object
 *                       properties:
 *                         networkAttestationMissRate:
 *                           type: number
 *                           description: Average attestation miss rate across all validators (0-1).
 *                         networkProposalMissRate:
 *                           type: number
 *                           description: Average proposal miss rate across all validators (0-1).
 *                     peers:
 *                       type: object
 *                       properties:
 *                         totalPeersInNetwork:
 *                           type: number
 *                           description: Total number of peers discovered by the crawler.
 *                         clientDistribution:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           description: Distribution of peers by client software.
 *                     geography:
 *                       type: object
 *                       properties:
 *                         countryDistribution:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           description: Distribution of peers by country.
 *                         topCountry:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             country:
 *                               type: string
 *                             count:
 *                               type: number
 *                           description: Country with the highest number of nodes.
 *                     infrastructure:
 *                       type: object
 *                       properties:
 *                         ispDistribution:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           description: Distribution of peers by ISP/hosting provider.
 *                         topISP:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             isp:
 *                               type: string
 *                             count:
 *                               type: number
 *                           description: ISP with the highest number of nodes.
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         lastUpdated:
 *                           type: number
 *                           description: Timestamp when the statistics were last updated.
 *                         currentEpoch:
 *                           type: number
 *                           description: Current epoch number.
 *                         currentSlot:
 *                           type: number
 *                           description: Current slot number.
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
router.get("/stats", async (_req, res) => {
	try {
		// Remove manual sync call - data is now synced automatically by epoch listener
		
		// Get the cached statistics
		const stats = await l2InfoService.getValidatorStats();
		
		if (!stats) {
			// If no stats are available, return a message indicating data is being processed
			return res.status(200).json({
				success: true,
				data: {
					message: "Statistics are being calculated. Please try again in a few moments.",
					metadata: {
						lastUpdated: null,
					}
				}
			});
		}
		
		// Structure the response in a more organized way
		return res.status(200).json({
			success: true,
			data: {
				network: {
					totalValidatorsInSet: stats.totalValidatorsInSet,
					activeValidators: stats.activeValidators,
					validatorsAttested24h: stats.validatorsAttested24h,
					validatorsProposed24h: stats.validatorsProposed24h,
					validatorsWithPeers: stats.validatorsWithPeers,
				},
				performance: {
					networkAttestationMissRate: Number(stats.networkAttestationMissRate.toFixed(4)),
					networkProposalMissRate: Number(stats.networkProposalMissRate.toFixed(4)),
				},
				peers: {
					totalPeersInNetwork: stats.totalPeersInNetwork,
					clientDistribution: stats.clientDistribution,
				},
				geography: {
					countryDistribution: stats.countryDistribution,
					topCountry: stats.topCountry,
				},
				infrastructure: {
					ispDistribution: stats.ispDistribution,
					topISP: stats.topISP,
				},
				metadata: {
					lastUpdated: stats.lastUpdated,
					currentEpoch: stats.currentEpoch,
					currentSlot: stats.currentSlot,
				}
			}
		});
	} catch (error) {
		logger.error(error, "Error retrieving validator statistics");
		res.status(500).json({ error: "Failed to retrieve validator statistics" });
	}
	return;
});

export default router; 