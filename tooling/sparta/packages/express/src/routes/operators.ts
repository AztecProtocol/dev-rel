import express, { type Request, type Response, Router } from "express";
import { nodeOperatorService } from "../domain/operators/service"; // Adjust path if necessary
import { validatorService, type Validator } from "../domain/validators/service"; // Add import for validator service
import { logger } from "@sparta/utils"; // Assuming logger is accessible
import { apiKeyMiddleware } from "../middlewares/auth.js";
import { getEthereumInstance } from "@sparta/ethereum"; // Add import for ethereum
import { discordWebhookService } from "@sparta/discord"; // Import Discord service
import { CHANNELS } from "@sparta/utils/const/channels"; // Import CHANNELS

// --- Swagger Schemas ---
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
 *         discordId:
 *           type: string
 *           description: The Discord user ID of the node operator.
 *           example: "123456789012345678"
 *         walletAddress:
 *           type: string
 *           description: The Ethereum wallet address associated with the node operator.
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *         discordUsername:
 *           type: string
 *           description: The Discord username of the node operator.
 *           example: "user#1234"
 *         createdAt:
 *           type: number
 *           description: Timestamp (milliseconds since epoch) when the operator was created.
 *           example: 1678886400000
 *         updatedAt:
 *           type: number
 *           description: Timestamp (milliseconds since epoch) when the operator was last updated.
 *           example: 1678887400000
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
 *         - discordId
 *         - walletAddress
 *         - createdAt
 *         - updatedAt
 *     OperatorInput:
 *       type: object
 *       properties:
 *         discordId:
 *           type: string
 *           description: The Discord user ID.
 *         walletAddress:
 *           type: string
 *           description: The Ethereum wallet address.
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *       required:
 *         - discordId
 *         - walletAddress
 *     OperatorUpdateInput:
 *       type: object
 *       properties:
 *         walletAddress:
 *           type: string
 *           description: The new Ethereum wallet address.
 *           example: "0xabcdef1234567890abcdef1234567890abcdef12"
 *       required:
 *         - walletAddress
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
 *         walletAddress:
 *           type: string
 *           description: The Ethereum wallet address associated with the node operator.
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

// Apply API key middleware to all operator routes
router.use(apiKeyMiddleware);

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
	const { operators, nextPageToken } = await nodeOperatorService.getAllOperators(pageToken);
	res.status(200).json({ operators, nextPageToken });
	return;
});

// GET /api/operator with query parameters - returns a specific operator
/**
 * @swagger
 * /api/operator:
 *   get:
 *     summary: Get a specific node operator
 *     description: Retrieves a specific node operator using either their Discord ID or username.
 *     tags: [NodeOperator]
 *     operationId: getOperator
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
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to retrieve.
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
	const discordId = req.query.discordId as string | undefined;
	const discordUsername = req.query.discordUsername as string | undefined;
	
	if (!discordId && !discordUsername) {
		return res
			.status(400)
			.json({ error: "Missing discordId or discordUsername parameter" });
	}
	
	let operator: any = undefined;
	
	if (discordId) {
		operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
	} else if (discordUsername) {
		operator = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
	}
	
	if (operator) {
		// Fetch validators associated with this operator
		const validators = await validatorService.getValidatorsByNodeOperator(operator.discordId);
		
		// Add validators to the operator response
		const operatorWithValidators = {
			...operator,
			validators
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
 *                     totalCount:
 *                       type: number
 *                       description: Total number of registered operators.
 *                       example: 42
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
		// Get all operators
		let allOperators = await nodeOperatorService.getAllOperators();
		let operators = allOperators.operators;
		while(allOperators.nextPageToken){
			allOperators = await nodeOperatorService.getAllOperators(allOperators.nextPageToken);
			operators = operators.concat(allOperators.operators);
		}

		const approvedWithZeroValidators = [];
		for (const operator of operators) {
			if (operator.isApproved) {
				const validators = await validatorService.getValidatorsByNodeOperator(operator.discordId);
				if (validators.length === 0) {
					approvedWithZeroValidators.push(operator);
				}
			}
		}
		
		// Return stats object that can be expanded with more metrics in the future
		res.status(200).json({
			stats: {
				totalOperators: operators.length,
				approvedOperatorsWithZeroValidators: approvedWithZeroValidators.length,
				// Future stats can be added here
			}
		});
	} catch (error) {
		logger.error(error, "Error retrieving operator statistics");
		res.status(500).json({ error: "Failed to retrieve operator statistics" });
	}
	return;
});

// GET /api/operator/address/:address - returns the operator by address
/**
 * @swagger
 * /api/operator/address/{address}:
 *   get:
 *     summary: Get operator by wallet address
 *     description: Retrieves a specific node operator using their wallet address.
 *     tags: [NodeOperator]
 *     operationId: getOperatorByAddress
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: The wallet address of the operator to retrieve.
 *     responses:
 *       200:
 *         description: The requested node operator.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing or invalid address parameter
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
router.get(
	"/address/:address",
	async (req: Request, res: Response) => {
		const { address } = req.params;
		if (!address) {
			return res.status(400).json({ error: "Missing address parameter" });
		}
		// Basic address validation (can be improved)
		if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
			return res
				.status(400)
				.json({ error: "Invalid wallet address format" });
		}
		const operator = await nodeOperatorService.getOperatorByAddress(
			address
		);
		if (operator) {
			res.status(200).json(operator);
		} else {
			res.status(404).json({ error: "Operator not found" });
		}
		return;
	});

// POST /api/operator - adds a new operator
/**
 * @swagger
 * /api/operator:
 *   post:
 *     summary: Create a new node operator
 *     description: Registers a new node operator with their Discord ID and wallet address.
 *     tags: [NodeOperator]
 *     operationId: createOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord user ID.
 *       - in: query
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: The Ethereum wallet address.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord username.
 *     responses:
 *       201:
 *         description: Node operator created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing or invalid body parameters
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
 *       409:
 *         description: Conflict - Operator with this Discord ID already exists
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
		const discordId = req.query.discordId as string;
		const walletAddress = req.query.walletAddress as string;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		if (!discordId || !walletAddress || !discordUsername) {
			return res.status(400).json({
				error: "Missing discordId or walletAddress parameter",
			});
		}

		// Check if operator exists first
		const existingOperator =
			await nodeOperatorService.getOperatorByDiscordId(discordId);
		if (existingOperator) {
			return res.status(409).json({
				error: "Operator with this Discord ID already exists",
			});
		}

		// If discord username is provided, check if it already exists
		if (discordUsername) {
			const existingOperatorByUsername = 
				await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (existingOperatorByUsername) {
				return res.status(409).json({
					error: "Operator with this Discord username already exists",
				});
			}
		}

		const newOperator = await nodeOperatorService.createOperator(
			discordId,
			walletAddress,
			discordUsername,
			false
		);

		if (!newOperator) {
			return res.status(500).json({
				error: "Failed to create operator",
			});
		}

		return res.status(201).json(newOperator);
	});

// DELETE /api/operator - deletes an operator by discordId or discordUsername
/**
 * @swagger
 * /api/operator:
 *   delete:
 *     summary: Delete an operator by Discord ID or username
 *     description: Removes a node operator registration using either their Discord ID or username.
 *     tags: [NodeOperator]
 *     operationId: deleteOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to delete.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to delete.
 *     responses:
 *       204:
 *         description: Operator deleted successfully (No Content).
 *       400:
 *         description: Bad Request - Missing discordId or discordUsername parameter
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
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		if (!discordId && !discordUsername) {
			return res
				.status(400)
				.json({ error: "Missing discordId or discordUsername parameter" });
		}
		
		let operatorToDelete: any = undefined;
		let idToDelete: string | undefined = discordId;
		
		if (discordId) {
			operatorToDelete = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operatorToDelete = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operatorToDelete) {
				idToDelete = operatorToDelete.discordId;
			}
		}
		
		if (!operatorToDelete || !idToDelete) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const deleted = await nodeOperatorService.deleteOperatorByDiscordId(idToDelete);
		if (deleted) {
			return res.status(204).send();
		} else {
			return res.status(500).json({
				error: "Failed to delete operator",
			});
		}
	});

// PUT /api/operator - updates the operator with a new wallet
/**
 * @swagger
 * /api/operator:
 *   put:
 *     summary: Update operator's wallet address
 *     description: Updates the wallet address for a specific node operator using their Discord ID or username.
 *     tags: [NodeOperator]
 *     operationId: updateOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to update.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to update.
 *       - in: query
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: The new wallet address.
 *     responses:
 *       200:
 *         description: Operator updated successfully. Returns the updated operator.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing parameters
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
router.put(
	"/",
	async (req: Request, res: Response) => {
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		const walletAddress = req.query.walletAddress as string;
		
		if (!discordId && !discordUsername) {
			return res.status(400).json({ 
				error: "Missing discordId or discordUsername query parameter" 
			});
		}
		
		if (!walletAddress) {
			return res.status(400).json({ 
				error: "Missing walletAddress query parameter" 
			});
		}
		
		let operatorToUpdate: any = undefined;
		let idToUpdate: string | undefined = discordId;
		
		// Find the operator
		if (discordId) {
			operatorToUpdate = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operatorToUpdate = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operatorToUpdate) {
				idToUpdate = operatorToUpdate.discordId;
			}
		}
		
		if (!operatorToUpdate || !idToUpdate) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}
		
		// Update wallet address
		const updated = await nodeOperatorService.updateOperatorWallet(
			idToUpdate,
			walletAddress
		);
		
		if (!updated) {
			return res.status(500).json({
				error: "Failed to update operator wallet",
			});
		}

		// Fetch the updated operator to return
		const updatedOperator = await nodeOperatorService.getOperatorByDiscordId(idToUpdate);
		return res.status(200).json(updatedOperator);
	});

// PUT /api/operator/approve - approves an operator
/**
 * @swagger
 * /api/operator/approve:
 *   put:
 *     summary: Approve a node operator
 *     description: Approves a node operator using their Discord ID or username.
 *     tags: [NodeOperator]
 *     operationId: approveOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator to approve.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator to approve.
 *     responses:
 *       200:
 *         description: Operator approved successfully. Returns the updated operator.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
 *       400:
 *         description: Bad Request - Missing parameters
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
router.put(
	"/approve",
	async (req: Request, res: Response) => {
		const discordId = req.query.discordId as string | undefined;
		const discordUsername = req.query.discordUsername as string | undefined;
		
		if (!discordId && !discordUsername) {
			return res
				.status(400)
				.json({ error: "Missing discordId or discordUsername parameter" });
		}
		
		let operatorToApprove: any = undefined;
		let idToApprove: string | undefined = discordId;
		
		// Find the operator
		if (discordId) {
			operatorToApprove = await nodeOperatorService.getOperatorByDiscordId(discordId);
		} else if (discordUsername) {
			operatorToApprove = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operatorToApprove) {
				idToApprove = operatorToApprove.discordId;
			}
		}
		
		if (!operatorToApprove || !idToApprove) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const updated = await nodeOperatorService.updateApprovalStatus(
			idToApprove,
			true
		);

		if (updated) {
			// Fetch the updated operator to return
			const updatedOperator =
				await nodeOperatorService.getOperatorByDiscordId(idToApprove);
			return res.status(200).json(updatedOperator);
		} else {
			return res.status(500).json({
				error: "Failed to approve operator",
			});
		}
	});

// GET /api/operator/validators - returns all validators
/**
 * @swagger
 * /api/operator/validators:
 *   get:
 *     summary: Get all validators
 *     description: Retrieves a list of all validators in the system.
 *     tags: [NodeOperator]
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
		
		// Get total validators count without loading all records
		const totalValidatorsCount = await validatorService.countValidators();
		
		// Log for debugging
		logger.info(`Retrieved ${blockchainValidators.length} validators from blockchain and ${totalValidatorsCount} validators in database`);
		
		// Process blockchain validators in batches to check against database
		const BATCH_SIZE = 100;
		let validatorsWithOperators: string[] = [];
		
		// Process blockchain validators in batches to avoid loading all records at once
		for (let i = 0; i < blockchainValidators.length; i += BATCH_SIZE) {
			const batch = blockchainValidators.slice(i, i + BATCH_SIZE);
			logger.info(`Processing blockchain validators batch ${i/BATCH_SIZE + 1}, size: ${batch.length}`);
			
			// Check each validator in batch
			for (const address of batch) {
				// Check if this blockchain validator exists in our database
				const dbValidator = await validatorService.getValidatorByAddress(address);
				if (dbValidator) {
					validatorsWithOperators.push(address);
				}
			}
			
			logger.info(`Found ${validatorsWithOperators.length} validators with operators so far`);
		}
		
		// Log for debugging
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

// GET /api/operator/validator - returns a specific validator by address
/**
 * @swagger
 * /api/operator/validator:
 *   get:
 *     summary: Get validator information
 *     description: Retrieves validator information either by validator address or by operator (discordId/username).
 *     tags: [NodeOperator]
 *     operationId: getValidator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: false
 *         description: The wallet address of the validator to retrieve.
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
router.get("/validator", async (req, res) => {
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
		
		// Get Ethereum instance to access validators
		const ethereum = await getEthereumInstance();
		const rollupInfo = await ethereum.getRollupInfo();
		
		// Case 1: Lookup by validator address
		if (address) {
			// Check if address is a known validator
			if (!rollupInfo.validators.includes(address)) {
				// Try case-insensitive check before failing
				const foundValidator = rollupInfo.validators.find(v => 
					v.toLowerCase() === address.toLowerCase()
				);
				
				if (!foundValidator) {
					return res.status(404).json({ error: "Validator not found" });
				}
			}
			
			// Find if this validator is associated with an operator
			// The validatorRepository.findByAddress method now handles case-insensitive search with pagination
			let dbValidator = await validatorService.getValidatorByAddress(address);
			
			if (dbValidator) {
				logger.info(`Found validator in database for address: ${address}`);
			} else {
				logger.info(`No validator found in database for address: ${address}`);
			}
			
			// Get operator info if validator has an associated operator
			let operatorInfo = null;
			if (dbValidator) {
				operatorInfo = await nodeOperatorService.getOperatorByDiscordId(dbValidator.nodeOperatorId);
			}
			
			return res.status(200).json({
				success: true,
				data: {
					address,
					operatorId: dbValidator ? dbValidator.nodeOperatorId : null,
					operatorInfo: operatorInfo || null,
					stats: {
						totalValidators: rollupInfo.validators.length,
					},
				},
			});
		}
		
		// Case 2: Lookup by operator (discordId or discordUsername)
		// Determine the operator's Discord ID
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
				operatorId: validator.nodeOperatorId,
				isActive: isInRollup, // Whether the validator is active in the rollup
			};
		});
		
		return res.status(200).json({
			success: true,
			data: {
				operator: operator,
				validators: validatorDetails,
				stats: {
					totalValidators: rollupInfo.validators.length,
					operatorValidators: validators.length,
				},
			},
		});
	} catch (error) {
		logger.error(error, "Error retrieving validator");
		res.status(500).json({ error: "Failed to retrieve validator" });
	}
	return;
});

// POST /api/operator/validator - adds a new validator
/**
 * @swagger
 * /api/operator/validator:
 *   post:
 *     summary: Add a new validator
 *     description: Adds a new validator and associates it with an operator.
 *     tags: [NodeOperator]
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
router.post("/validator", async (req, res) => {
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
		
		// Get Ethereum instance and add validator to rollup
		const ethereum = await getEthereumInstance();
		if (!skipOnChain) {
			await ethereum.addValidator(validatorAddress);
		}
		
		// Add the validator to the operator in the database
		await nodeOperatorService.addValidatorToOperator(operatorId, validatorAddress);
		
		// Get the validator count for this operator
		const operatorValidators = await validatorService.getValidatorsByNodeOperator(operatorId);
		
		// Get the updated validators count for stats
		const rollupInfo = await ethereum.getRollupInfo();
		
		return res.status(201).json({
			success: true,
			data: {
				address: validatorAddress,
				operatorId: operatorId,
				operatorInfo: operator,
				stats: {
					totalValidators: rollupInfo.validators.length,
					operatorValidators: operatorValidators.length,
				},
			},
		});
	} catch (error: any) {
		logger.error(error.message, "Error adding validator");
		res.status(500).json({ error: error.message });
	}
	return;
});

// PUT /api/operator/validator - updates a validator's associated operator
/**
 * @swagger
 * /api/operator/validator:
 *   put:
 *     summary: Update validator's operator
 *     description: Transfers a validator from one operator to another.
 *     tags: [NodeOperator]
 *     operationId: updateValidator
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validatorAddress:
 *                 type: string
 *                 description: The validator address to transfer.
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *               fromDiscordId:
 *                 type: string
 *                 description: The Discord ID of the current operator.
 *                 example: "123456789012345678"
 *               toDiscordId:
 *                 type: string
 *                 description: The Discord ID of the new operator to transfer to.
 *                 example: "987654321098765432"
 *             required:
 *               - validatorAddress
 *               - fromDiscordId
 *               - toDiscordId
 *     responses:
 *       200:
 *         description: Validator transferred successfully.
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
router.put("/validator", async (req, res) => {
	try {
		const { validatorAddress, fromDiscordId, toDiscordId } = req.body;
		
		// Validate input parameters
		if (!validatorAddress || !fromDiscordId || !toDiscordId) {
			return res.status(400).json({
				error: "Missing required parameters",
			});
		}
		
		// Basic address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			return res.status(400).json({
				error: "Invalid validator address format",
			});
		}
		
		// Check if operators exist
		const fromOperator = await nodeOperatorService.getOperatorByDiscordId(fromDiscordId);
		const toOperator = await nodeOperatorService.getOperatorByDiscordId(toDiscordId);
		
		if (!fromOperator) {
			return res.status(404).json({
				error: "Source operator not found",
			});
		}
		
		if (!toOperator) {
			return res.status(404).json({
				error: "Destination operator not found",
			});
		}
		
		// Check if the validator exists in the database
		const validator = await validatorService.getValidatorByAddress(validatorAddress);
		
		if (!validator) {
			return res.status(404).json({
				error: "Validator not found in the database",
			});
		}
		
		// Check if the validator is associated with the fromOperator
		if (validator.nodeOperatorId !== fromDiscordId) {
			return res.status(404).json({
				error: "Validator not found for the source operator",
			});
		}
		
		// Get Ethereum instance to verify the validator exists
		const ethereum = await getEthereumInstance();
		const rollupInfo = await ethereum.getRollupInfo();
		
		if (!rollupInfo.validators.includes(validatorAddress)) {
			return res.status(404).json({
				error: "Validator not found in the rollup",
			});
		}
		
		// Update the validator to be associated with the new operator
		await validatorService.updateValidatorOperator(validatorAddress, toDiscordId);
		
		// Get validator counts for both operators
		const fromOperatorValidators = await validatorService.getValidatorsByNodeOperator(fromDiscordId);
		const toOperatorValidators = await validatorService.getValidatorsByNodeOperator(toDiscordId);
		
		return res.status(200).json({
			success: true,
			data: {
				address: validatorAddress,
				operatorId: toDiscordId,
				previousOperatorId: fromDiscordId,
				stats: {
					totalValidators: rollupInfo.validators.length,
					sourceOperatorValidators: fromOperatorValidators.length,
					destinationOperatorValidators: toOperatorValidators.length,
				},
			},
		});
	} catch (error) {
		logger.error(error, "Error transferring validator");
		res.status(500).json({ error: "Failed to transfer validator" });
	}
	return;
});

// DELETE /api/operator/validator - removes a validator from an operator
/**
 * @swagger
 * /api/operator/validator:
 *   delete:
 *     summary: Remove a validator
 *     description: Removes a validator from an operator's list of validators.
 *     tags: [NodeOperator]
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
router.delete("/validator", async (req, res) => {
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
 *         name: discordId
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord ID of the operator.
 *       - in: query
 *         name: discordUsername
 *         schema:
 *           type: string
 *         required: false
 *         description: The Discord username of the operator.
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
 *               validatorAddress:
 *                 type: string
 *                 nullable: true
 *                 description: Optional. The validator address associated with this message, for context.
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *               parentChannelId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional. For development/testing only. Overrides the default parent channel ID for thread creation.
 *                 example: "1329081299490570296"
 *               threadName:
 *                 type: string
 *                 nullable: true
 *                 description: Optional. A custom name for the Discord thread. If not provided, a name will be generated.
 *                 example: "Urgent Alert for Validator X"
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
	const discordId = req.query.discordId as string | undefined;
	const discordUsername = req.query.discordUsername as string | undefined;
	const { message, parentChannelId: devParentChannelId, threadName: customThreadName } = req.body;

	if (!discordId && !discordUsername) {
		return res.status(400).json({ 
			error: "Missing discordId or discordUsername query parameter" 
		});
	}

	if (!message) {
		return res.status(400).json({ error: "Missing message in request body" });
	}

	let operator: any = undefined;
	let targetDiscordId: string | undefined = discordId;
	let operatorUsername: string | undefined = discordUsername;

	try {
		if (discordId) {
			operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
			if (!operator) {
				return res.status(404).json({ error: "Operator not found by ID" });
			}
			targetDiscordId = operator.discordId; // Ensure we have the canonical ID
			operatorUsername = operator.discordUsername;
		} else if (discordUsername) { // discordUsername is provided, discordId is not
			operator = await nodeOperatorService.getOperatorByDiscordUsername(discordUsername);
			if (operator) {
				targetDiscordId = operator.discordId;
				operatorUsername = operator.discordUsername; // Ensure we have the canonical username
			} else {
				return res.status(404).json({ error: "Operator not found by username" });
			}
		}
		
		if (!targetDiscordId) { // Should be caught by above, but as a safeguard
			return res.status(404).json({ error: "Operator target Discord ID could not be determined" });
		}

		// Construct thread name
		let threadName = customThreadName || `Alert for ${operatorUsername}`;
		
		const isDevelopment = process.env.NODE_ENV === 'development';
		let targetParentChannelId: string;

		if (isDevelopment) {
			targetParentChannelId = devParentChannelId || CHANNELS.BOT_TEST.id;
			logger.info(`Development mode: Using parentChannelId: ${targetParentChannelId}`);
		} else {
			targetParentChannelId = CHANNELS.OPERATORS_START_HERE.id;
			// Optionally log if devParentChannelId was provided in prod but ignored
			if (devParentChannelId) {
				logger.warn(`Production mode: Ignoring devParentChannelId '${devParentChannelId}'. Using default OPERATORS_START_HERE.`);
			}
		}
		
		// Create private thread and send message
		const threadResult = await discordWebhookService.createPrivateThreadWithInitialMessage({
			parentChannelId: targetParentChannelId,
			userToInviteAndMention: targetDiscordId,
			threadName: threadName,
			initialMessage: message,
			autoArchiveDurationMinutes: 1440, // 1 day
			reason: "Validator status alert notification"
		});

		if (threadResult.success) {
			logger.info(`Private thread created and message sent for operator Discord ID: ${targetDiscordId}. Thread ID: ${threadResult.threadId}`);
			return res.status(200).json({ 
				success: true, 
				message: "Message sent successfully in a new private thread.",
				threadId: threadResult.threadId 
			});
		} else {
			logger.error(`Failed to create thread or send message for operator Discord ID: ${targetDiscordId}. Error: ${threadResult.error}`);
			return res.status(500).json({ error: threadResult.error || "Failed to send message via Discord service" });
		}

	} catch (error) {
		logger.error(error as any, `Error processing message for operator: ${targetDiscordId || discordUsername}`);
		const errorMessage = (error as any)?.message || "Internal server error while processing message";
		if (errorMessage.includes("Operator not found")) {
			return res.status(404).json({ error: errorMessage });
		}
		return res.status(500).json({ error: errorMessage });
	}
});

export default router;
