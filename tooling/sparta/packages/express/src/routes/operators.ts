import express, { type Request, type Response, Router } from "express";
import { nodeOperatorService, type NodeOperator } from "../domain/operators/service"; // Adjust path if necessary
import { logger } from "@sparta/utils"; // Assuming logger is accessible
import { discordWebhookService } from "@sparta/discord"; // Import Discord service
import { validatorService } from "../domain/validators/service";
import { discordService } from "@sparta/discord"; // Import Discord service for username fetching
import { verifyMessage, recoverMessageAddress, type Address } from "viem";

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: API key for authenticating requests
 *   schemas:
 *     NodeOperator:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           description: The wallet address of the node operator (primary key).
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *         discordId:
 *           type: string
 *           description: The Discord user ID of the node operator.
 *           example: "123456789012345678"
 *         xId:
 *           type: string
 *           description: The X (Twitter) ID of the node operator.
 *           example: "twitter_user_123"
 *         createdAt:
 *           type: number
 *           description: Timestamp (milliseconds since epoch) when the operator was created.
 *           example: 1678886400000
 *         updatedAt:
 *           type: number
 *           description: Timestamp (milliseconds since epoch) when the operator was last updated.
 *           example: 1678887400000
 *         socials:
 *           type: object
 *           description: Social media verification status for this operator.
 *           properties:
 *             discord:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, verified, rejected]
 *                   description: Verification status
 *             x:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, verified, rejected]
 *                   description: Verification status
 *         validators:
 *           type: array
 *           description: List of validators associated with this operator.
 *           items:
 *             type: object
 *             properties:
 *               validatorAddress:
 *                 type: string
 *                 description: The Ethereum address of the validator.
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *       required:
 *         - address
 *         - createdAt
 *         - updatedAt
 *     OperatorInput:
 *       type: object
 *       properties:
 *         discordId:
 *           type: string
 *           description: The Discord user ID.
 *       required:
 *         - discordId
 *     OperatorError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message describing the issue.
 *     OperatorResponse:
 *       type: object
 *       properties:
 *         discordId:
 *           type: string
 *           description: The Discord user ID of the node operator.
 *         createdAt:
 *           type: number
 *           description: Timestamp when operator was created
 *         updatedAt:
 *           type: number
 *           description: Timestamp when operator was last updated
 *     ValidatorResponse:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           description: The Ethereum address of the validator.
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *         operatorId:
 *           type: string
 *           description: The Discord ID of the operator who owns this validator.
 *           example: "123456789012345678"
 *         stats:
 *           type: object
 *           properties:
 *             totalValidators:
 *               type: number
 *               description: Total number of validators in the system.
 *               example: 42
 */

const router: Router = express.Router();

// GET /api/operator/operators - returns paginated list of operators
/**
 * @swagger
 * /api/operator/operators:
 *   get:
 *     summary: Get node operators
 *     description: Retrieves a list of registered node operators.
 *     tags: [NodeOperator]
 *     operationId: getOperators
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         required: false
 *         description: Token for pagination to get the next page of results.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 10
 *           maximum: 1000
 *           default: 100
 *         required: false
 *         description: Maximum number of operators to return per page (defaults to 100).
 *     responses:
 *       200:
 *         description: A list of node operators with pagination token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operators:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NodeOperator'
 *                 nextPageToken:
 *                   type: string
 *                   description: Token to retrieve the next page of results. Not present on the last page.
 *                   example: "eyJsYXN0S2V5IjoiMTIzNDU2Nzg5MCJ9"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     hasMorePages:
 *                       type: boolean
 *                       description: Indicates if there are more pages available.
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
router.get("/operators", async (_req: Request, res: Response) => {
	const pageToken = _req.query.pageToken as string | undefined;
	const limit = _req.query.limit ? parseInt(_req.query.limit as string) : 100;
	
	// Validate limit parameter
	if (isNaN(limit) || limit < 10 || limit > 1000) {
		return res.status(400).json({
			error: "Invalid limit parameter. Must be a number between 10 and 1000.",
		});
	}
	
	const { operators, nextPageToken } = await nodeOperatorService.getAllOperators(pageToken, limit);
	
	// The operators should already have validators field populated from the database
	// after running migration 07_populate_operators_validators_field
	// If not, we could fetch them dynamically but that would be expensive for many operators
	
	// Add pagination information to the response
	const response = {
		operators,
		nextPageToken,
		pagination: {
			hasMorePages: !!nextPageToken,
		},
	};
	
	res.status(200).json(response);
	return;
});

// GET /api/operator with query parameters - returns a specific operator
/**
 * @swagger
 * /api/operator:
 *   get:
 *     summary: Get a specific node operator
 *     description: Retrieves a specific node operator using their wallet address.
 *     tags: [NodeOperator]
 *     operationId: getOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: The wallet address of the operator to retrieve.
 *     responses:
 *       200:
 *         description: The requested node operator with associated validators.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing query parameters
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
router.get("/", async (req: Request, res: Response) => {
	const address = req.query.address as string | undefined;
	
	if (!address) {
		return res
			.status(400)
			.json({ error: "Missing address parameter" });
	}
	
	const operator = await nodeOperatorService.getOperatorByAddress(address);
	
	if (operator) {
		// The operator should already have validators field populated from the database
		// If not present, initialize as empty array
		const operatorWithValidators = {
			...operator,
			validators: operator.validators || []
		};
		
		res.status(200).json(operatorWithValidators);
	} else {
		res.status(404).json({ error: "Operator not found" });
	}
	return;
});

// GET /api/operator/stats - returns operator statistics
/**
 * @swagger
 * /api/operator/stats:
 *   get:
 *     summary: Get node operator statistics
 *     description: Retrieves statistics about registered node operators.
 *     tags: [NodeOperator]
 *     operationId: getOperatorStats
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Node operator statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalOperators:
 *                       type: number
 *                       description: Total number of registered operators.
 *                       example: 42
 *                     operatorsWithoutValidators:
 *                       type: object
 *                       description: Counts of operators without validators.
 *                       properties:
 *                         all:
 *                           type: number
 *                           description: Count of all operators without validators.
 *                           example: 10
 *                     operatorsWithMultipleValidators:
 *                       type: number
 *                       description: Count of operators with more than one validator.
 *                       example: 5
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
router.get("/stats", async (_req: Request, res: Response) => {
	try {
		// Get total operator count
		const totalOperators = await nodeOperatorService.countOperators();

		// Get operators without validators
		const operatorsWithoutValidators = await nodeOperatorService.countOperatorsWithoutValidators();
		
		// Get operators with multiple validators
		const operatorsWithMultipleValidators = await nodeOperatorService.countOperatorsWithMultipleValidators();
		
		// Return stats object
		res.status(200).json({
			stats: {
				totalOperators,
				operatorsWithoutValidators,
				operatorsWithMultipleValidators
			}
		});
	} catch (error) {
		logger.error(error, "Error retrieving operator statistics");
		res.status(500).json({ error: "Failed to retrieve operator statistics" });
	}
	return;
});

// POST /api/operator - adds a new operator
/**
 * @swagger
 * /api/operator:
 *   post:
 *     summary: Create a new node operator
 *     description: Creates a new node operator registration using signature verification. The wallet address is extracted from the signature.
 *     tags: [NodeOperator]
 *     operationId: createOperator
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *                 description: ECDSA signature of the message
 *                 example: "0x..."
 *               message:
 *                 type: string
 *                 description: The message that was signed
 *                 example: "link-socials::discord=123456;x=456789;nonce=uuid;domain=sparta-dashboard.xyz;timestamp=1234567890"
 *             required:
 *               - signature
 *               - message
 *     responses:
 *       201:
 *         description: Operator created successfully. Returns the new operator.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Invalid signature or message format
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
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.post(
	"/",
	async (req: Request, res: Response) => {
		const { signature, message } = req.body || {};
		
		if (!signature || !message) {
			return res.status(400).json({
				error: "Missing required parameters: signature and message must be provided in request body",
			});
		}

		try {
			// Parse the message to extract social accounts
			const parsedMessage = parseSignedMessage(message);
			
			// Recover the address from the signature
			const recoveredAddress = await recoverMessageAddress({
				message,
				signature,
			});

			if (!recoveredAddress) {
				return res.status(400).json({
					error: "Invalid signature - could not recover address",
				});
			}

			const address = recoveredAddress.toString();

			// Validate timestamp (5 minute window)
			const messageTimestamp = parseInt(parsedMessage.timestamp);
			const now = Math.floor(Date.now() / 1000);
			if (now - messageTimestamp > 300) { // 5 minutes
				return res.status(400).json({
					error: "Signature expired",
				});
			}

			// Check if operator already exists by address
			let existingOperator = await nodeOperatorService.getOperatorByAddress(address);
			
			// Prepare socials data with pending status (simplified structure)
			const socialsData = {
				discord: parsedMessage.discord ? {
					status: 'pending' as const
				} : undefined,
				x: parsedMessage.x ? {
					status: 'pending' as const
				} : undefined
			};

			let operator: NodeOperator | undefined;
			let isNewOperator = false;

			if (existingOperator) {
				// Update existing operator with new socials using repository directly
				const repository = (nodeOperatorService as any).repository;
				const updated = await repository.update(address, {
					socials: socialsData,
					// Update IDs if provided
					...(parsedMessage.discord && { discordId: parsedMessage.discord }),
					...(parsedMessage.x && { xId: parsedMessage.x }),
					updatedAt: Date.now()
				});
				
				if (!updated) {
					return res.status(500).json({
						error: "Failed to update operator",
					});
				}
				
				operator = await nodeOperatorService.getOperatorByAddress(address);
			} else {
				// Create new operator
				operator = await nodeOperatorService.createOperator(
					address,
					parsedMessage.discord, // Set discordId if provided
					socialsData
				);
				
				// If X handle was provided, update it
				if (operator && parsedMessage.x) {
					const repository = (nodeOperatorService as any).repository;
					await repository.update(address, { xId: parsedMessage.x });
					operator = await nodeOperatorService.getOperatorByAddress(address);
				}
				
				isNewOperator = true;
			}

			if (!operator) {
				return res.status(500).json({
					error: "Failed to create/update operator",
				});
			}

			// Send Discord message if Discord social is being linked
			if (socialsData?.discord && parsedMessage.discord) {
				try {
					// Send a message via Discord webhook to the user
					const message = `🔗 **Verify Your Operator Account**

Your wallet address **${address}** is requesting to link with Discord ID: **${parsedMessage.discord}**.

To complete the verification, please use the following command in the Discord server:
\`/operator verify\`

This will verify your ownership of this Discord account and complete the linking process.

⚠️ This verification request expires in 24 hours.`;

					// Try to send the message to the Discord user
					const dmResult = await discordWebhookService.sendDirectMessage(parsedMessage.discord, message);
					if (!dmResult) {
						logger.warn({ discordId: parsedMessage.discord }, "Failed to send Discord verification DM, user may need to verify manually");
					}
				} catch (error) {
					logger.error({ error }, "Failed to send Discord verification message");
					// Continue with operator creation even if Discord message fails
				}
			}

			// Check for validators on-chain (addValidator transactions)
			// This will be done asynchronously to not block the response
			if (isNewOperator || !operator.validators || operator.validators.length === 0) {
				// Import Ethereum module dynamically to check for validators
				import("@sparta/ethereum").then(async ({ getEthereumInstance }) => {
					try {
						const ethereum = await getEthereumInstance();
						
						// Get validators added by this operator address
						const validators = await ethereum.getValidatorsAddedByAddress(address);

						if (validators.length > 0) {
							// Add validators to the operator
							for (const validatorAddress of validators) {
								await nodeOperatorService.addValidatorToOperator(address, validatorAddress);
								await validatorService.ensureValidatorExists(validatorAddress, operator.discordId);
							}
							logger.info(`Found and added ${validators.length} validators for operator ${address}`);
						}
					} catch (error) {
						logger.error({ error, address }, "Error checking for on-chain validators");
					}
				}).catch(error => {
					logger.error({ error }, "Failed to import Ethereum module");
				});
			}
			
			return res.status(201).json(operator);

		} catch (error) {
			logger.error({ error }, "Error processing operator registration");
			return res.status(400).json({
				error: "Invalid message format or signature verification failed",
			});
		}
	});

// Helper function to parse the signed message
function parseSignedMessage(message: string): {
	discord?: string;
	x?: string;
	nonce: string;
	domain: string;
	timestamp: string;
} {
	const parts = message.split("::");
	if (parts.length !== 2 || parts[0] !== "link-socials" || !parts[1]) {
		throw new Error("Invalid message format");
	}

	const params = parts[1].split(";");
	const result: any = {};

	for (const param of params) {
		const [key, value] = param.split("=");
		if (key === "discord" || key === "x") {
			result[key] = value;
		} else if (key === "nonce" || key === "domain" || key === "timestamp") {
			result[key] = value;
		}
	}

	if (!result.nonce || !result.domain || !result.timestamp) {
		throw new Error("Missing required message fields");
	}

	return result;
}

// DELETE /api/operator - deletes an operator by address
/**
 * @swagger
 * /api/operator:
 *   delete:
 *     summary: Delete an operator by wallet address
 *     description: Removes a node operator registration using their wallet address.
 *     tags: [NodeOperator]
 *     operationId: deleteOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: The wallet address of the operator to delete.
 *     responses:
 *       204:
 *         description: Operator deleted successfully (No Content).
 *       400:
 *         description: Bad Request - Missing address parameter
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
router.delete(
	"/",
	async (req: Request, res: Response) => {
		const address = req.query.address as string | undefined;
		
		if (!address) {
			return res
				.status(400)
				.json({ error: "Missing address parameter" });
		}
		
		const operatorToDelete = await nodeOperatorService.getOperatorByAddress(address);
		
		if (!operatorToDelete) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const deleted = await nodeOperatorService.deleteOperatorByAddress(address);
		if (deleted) {
			return res.status(204).send();
		} else {
			return res.status(500).json({
				error: "Failed to delete operator",
			});
		}
	});

// POST /api/operator/message - sends a message to an operator
/**
 * @swagger
 * /api/operator/message:
 *   post:
 *     summary: Send a direct message to an operator
 *     description: Sends a direct message to a node operator via Discord.
 *     tags: [NodeOperator]
 *     operationId: sendMessageToOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: The wallet address of the operator.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message content to send.
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Message sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad Request - Missing parameters or message body
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
 *         description: Internal Server Error or failed to send message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 */
router.post("/message", async (req: Request, res: Response) => {
	const address = req.query.address as string | undefined;
	const { message } = req.body;

	if (!address) {
		return res.status(400).json({ 
			error: "Missing address query parameter" 
		});
	}

	if (!message) {
		return res.status(400).json({ error: "Missing message in request body" });
	}

	try {
		const operator = await nodeOperatorService.getOperatorByAddress(address);
		if (!operator) {
			return res.status(404).json({ error: "Operator not found" });
		}

		// Check if operator has a Discord ID for messaging
		if (!operator.discordId) {
			return res.status(400).json({ 
				error: "Operator does not have a Discord ID associated. Cannot send message." 
			});
		}
		
		// Send direct message
		const dmResult = await discordWebhookService.sendMessageToUser({
			userId: operator.discordId,
			message: message
		});

		if (dmResult.success) {
			logger.info(`Direct message sent to operator address: ${address}, Discord ID: ${operator.discordId}`);
			return res.status(200).json({ 
				success: true, 
				message: "Message sent successfully to operator."
			});
		} else {
			logger.error(`Failed to send message to operator address: ${address}, Discord ID: ${operator.discordId}. Error: ${dmResult.error}`);
			return res.status(500).json({ error: dmResult.error || "Failed to send message via Discord service" });
		}

	} catch (error) {
		logger.error(error as any, `Error processing message for operator: ${address}`);
		const errorMessage = (error as any)?.message || "Internal server error while processing message";
		if (errorMessage.includes("Operator not found")) {
			return res.status(404).json({ error: errorMessage });
		}
		return res.status(500).json({ error: errorMessage });
	}
});

// PUT /api/operator - verifies a social account
/**
 * @swagger
 * /api/operator:
 *   put:
 *     summary: Verify a social account for an operator
 *     description: Verifies a social account (Discord/X) for a node operator. This is typically called from Discord after the user confirms ownership.
 *     tags: [NodeOperator]
 *     operationId: verifyOperatorSocial
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               social:
 *                 type: string
 *                 enum: [discord, x]
 *                 description: The social platform to verify
 *               id:
 *                 type: string
 *                 description: The social platform user ID
 *             required:
 *               - social
 *               - id
 *     responses:
 *       200:
 *         description: Social account verified successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 operator:
 *                   $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing parameters or invalid social platform
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
 *         description: Operator not found or social account not in pending state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorError'
 *       409:
 *         description: Conflict - Social account already verified
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
router.put("/", async (req: Request, res: Response) => {
	const { social, id } = req.body;

	// Validate required parameters
	if (!social || !id) {
		return res.status(400).json({ 
			error: "Missing required parameters: social and id are required" 
		});
	}

	// Validate social platform
	if (social !== 'discord' && social !== 'x') {
		return res.status(400).json({ 
			error: "Invalid social platform. Must be 'discord' or 'x'" 
		});
	}

	try {
		// Find all operators that have this social ID in pending state
		let operators: NodeOperator[] = [];
		
		// We need to scan all operators and check their socials
		// This is not ideal for performance, but necessary given the current data structure
		const { operators: allOperators } = await nodeOperatorService.getAllOperators();
		
		for (const operator of allOperators) {
			// Check if operator has matching social ID and pending status
			if (social === 'discord' && operator.discordId === id && 
				operator.socials?.discord?.status === 'pending') {
				operators.push(operator);
			} else if (social === 'x' && operator.xId === id && 
				operator.socials?.x?.status === 'pending') {
				operators.push(operator);
			}
		}

		if (operators.length === 0) {
			return res.status(404).json({ 
				error: `No pending ${social} verification found for ID ${id}` 
			});
		}

		// If multiple operators have the same social ID pending (shouldn't happen normally),
		// verify all of them
		let successCount = 0;
		let lastOperator: NodeOperator | undefined;

		for (const operator of operators) {
			// Update the social account status to verified
			const updateResult = await nodeOperatorService.updateSocialStatus(
				operator.address,
				social as 'discord' | 'x',
				'verified'
			);

			if (updateResult) {
				successCount++;
				lastOperator = await nodeOperatorService.getOperatorByAddress(operator.address);
				
				logger.info({
					operatorAddress: operator.address,
					social,
					socialId: id
				}, "Social account verified successfully");
			}
		}

		if (successCount === 0) {
			return res.status(500).json({ 
				error: "Failed to update social verification status" 
			});
		}

		// Check for validators associated with this operator
		if (lastOperator && (!lastOperator.validators || lastOperator.validators.length === 0)) {
			// Import Ethereum module dynamically to check for validators
			import("@sparta/ethereum").then(async ({ getEthereumInstance }) => {
				try {
					const ethereum = await getEthereumInstance();
					
					// Get validators added by this operator address
					const validators = await ethereum.getValidatorsAddedByAddress(lastOperator.address);

					if (validators.length > 0) {
						// Add validators to the operator
						for (const validatorAddress of validators) {
							await nodeOperatorService.addValidatorToOperator(lastOperator.address, validatorAddress);
							await validatorService.ensureValidatorExists(validatorAddress, lastOperator.discordId);
						}
						logger.info(`Found and added ${validators.length} validators for verified operator ${lastOperator.address}`);
					}
				} catch (error) {
					logger.error({ error, address: lastOperator.address }, "Error checking for on-chain validators after verification");
				}
			}).catch(error => {
				logger.error({ error }, "Failed to import Ethereum module");
			});
		}

		return res.status(200).json({ 
			success: true, 
			message: `${social} account verified successfully`,
			operator: lastOperator
		});

	} catch (error) {
		logger.error(error as any, `Error verifying ${social} account for ID: ${id}`);
		return res.status(500).json({ 
			error: "Internal server error while verifying social account" 
		});
	}
});

// GET /api/operator/by-socials - returns operator by social media handles
/**
 * @swagger
 * /api/operator/by-socials:
 *   get:
 *     summary: Get operator by social media handles
 *     description: Retrieves a node operator using their social media handles (Discord ID, X handle, etc.). At least one social handle must be provided.
 *     tags: [NodeOperator]
 *     operationId: getOperatorBySocials
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to retrieve.
 *       - in: query
 *         name: x
 *         schema:
 *           type: string
 *         required: false
 *         description: The X (Twitter) handle of the operator to retrieve.
 *     responses:
 *       200:
 *         description: The requested node operator with associated validators.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - No social handles provided
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
router.get("/by-socials", async (req: Request, res: Response) => {
	const discordIdQuery = req.query.discordId as string | undefined;
	const xHandleQuery = req.query.x as string | undefined;
	
	// Validate that at least one social parameter is provided
	if (!discordIdQuery && !xHandleQuery) {
		return res
			.status(400)
			.json({ error: "At least one social handle must be provided (discordId, x)" });
	}
	
	try {
		let operator: NodeOperator | undefined;
		
		// Try to find by new Discord social ID (via SocialsDiscordId GSI)
		if (discordIdQuery) {
			operator = await nodeOperatorService.getOperatorBySocial('discord', discordIdQuery);
		}

		
		// If not found by Discord (either new or legacy) and X handle provided, try to find by X handle (via SocialsXId GSI)
		if (!operator && xHandleQuery) {
			operator = await nodeOperatorService.getOperatorBySocial('x', xHandleQuery);
		}
		
		if (operator) {
			// The operator should already have validators field populated from the database
			// If not present, initialize as empty array
			const operatorWithValidators = {
				...operator,
				validators: operator.validators || []
			};
			
			res.status(200).json(operatorWithValidators);
		} else {
			res.status(404).json({ error: "Operator not found with provided social handles" });
		}
	} catch (error) {
		logger.error(error, "Error retrieving operator by social handles");
		res.status(500).json({ error: "Failed to retrieve operator by social handles" });
	}
	return;
});

export default router;
