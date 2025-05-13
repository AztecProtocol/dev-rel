import express, { type Request, type Response, Router } from "express";
import { nodeOperatorService } from "../domain/operators/service"; // Adjust path if necessary
import { logger } from "@sparta/utils"; // Assuming logger is accessible
import { apiKeyMiddleware } from "../middlewares/auth.js";

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
 *         description: The requested node operator.
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
		res.status(200).json(operator);
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
 *                     # Future stats can be added here
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
		// Get current stats
		const totalCount = await nodeOperatorService.countOperators();
		
		// Return stats object that can be expanded with more metrics in the future
		res.status(200).json({
			stats: {
				totalCount
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discordId:
 *                 type: string
 *                 description: The Discord user ID.
 *               walletAddress:
 *                 type: string
 *                 description: The Ethereum wallet address.
 *               discordUsername:
 *                 type: string
 *                 description: The Discord username.
 *             required:
 *               - discordId
 *               - walletAddress
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
		const { discordId, walletAddress, discordUsername } = req.body;
		if (!discordId || !walletAddress) {
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: The new wallet address.
 *             required:
 *               - walletAddress
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
		const { walletAddress } = req.body;
		
		if (!discordId && !discordUsername) {
			return res.status(400).json({ 
				error: "Missing discordId or discordUsername query parameter" 
			});
		}
		
		if (!walletAddress) {
			return res.status(400).json({ 
				error: "Request must include walletAddress to update" 
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

export default router;
