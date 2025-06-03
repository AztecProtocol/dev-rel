import express, { type Request, type Response, Router } from "express";
import { nodeOperatorService } from "../domain/operators/service"; // Adjust path if necessary
import { logger } from "@sparta/utils"; // Assuming logger is accessible
import { discordWebhookService } from "@sparta/discord"; // Import Discord service
import { validatorService } from "../domain/validators/service";
import { discordService } from "@sparta/discord"; // Import Discord service for username fetching

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
 *     description: Retrieves a specific node operator using their Discord ID.
 *     tags: [NodeOperator]
 *     operationId: getOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to retrieve.
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
	
	if (!discordId) {
		return res
			.status(400)
			.json({ error: "Missing discordId parameter" });
	}
	
	const operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
	
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
 *                     totalOperators:
 *                       type: number
 *                       description: Total number of registered operators.
 *                       example: 42
 *                     operatorsWithoutValidators:
 *                       type: object
 *                       description: Counts of operators without validators.
 *                       properties:
 *                         approved:
 *                           type: number
 *                           description: Count of approved operators without validators.
 *                           example: 10
 *                         all:
 *                           type: number
 *                           description: Count of all operators without validators.
 *                           example: 15
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

		// Get operators without validators (both approved and all)
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
 *     description: Registers a new node operator using their Discord ID. The Discord username will be automatically fetched from Discord API.
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
 *         description: The Discord user ID. Required for creating a new operator.
 *     responses:
 *       201:
 *         description: Node operator created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NodeOperator'
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
		const discordId = req.query.discordId as string | undefined;
		
		if (!discordId) {
			return res.status(400).json({
				error: "Missing required parameter: discordId must be provided as a query parameter",
			});
		}

		// Check if operator already exists by Discord ID (primary key lookup)
		const existingOperator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		if (existingOperator) {
			return res.status(409).json({
				error: "Operator with this Discord ID already exists",
			});
		}

		// Create the operator with Discord ID as primary key and username for GSI
		const newOperator = await nodeOperatorService.createOperator(
			discordId,
			true // Set isApproved to true by default
		);

		if (!newOperator) {
			return res.status(500).json({
				error: "Failed to create operator",
			});
		}

		return res.status(201).json(newOperator);
	});

// DELETE /api/operator - deletes an operator by discordId
/**
 * @swagger
 * /api/operator:
 *   delete:
 *     summary: Delete an operator by Discord ID
 *     description: Removes a node operator registration using their Discord ID.
 *     tags: [NodeOperator]
 *     operationId: deleteOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to delete.
 *     responses:
 *       204:
 *         description: Operator deleted successfully (No Content).
 *       400:
 *         description: Bad Request - Missing discordId parameter
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
		
		if (!discordId) {
			return res
				.status(400)
				.json({ error: "Missing discordId parameter" });
		}
		
		const operatorToDelete = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operatorToDelete) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const deleted = await nodeOperatorService.deleteOperatorByDiscordId(discordId);
		if (deleted) {
			return res.status(204).send();
		} else {
			return res.status(500).json({
				error: "Failed to delete operator",
			});
		}
	});


// PUT /api/operator/approve - approves an operator
/**
 * @swagger
 * /api/operator/approve:
 *   put:
 *     summary: Approve a node operator
 *     description: Approves a node operator using their Discord ID.
 *     tags: [NodeOperator]
 *     operationId: approveOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to approve.
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
		
		if (!discordId) {
			return res
				.status(400)
				.json({ error: "Missing discordId parameter" });
		}
		
		// Find the operator
		const operatorToApprove = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operatorToApprove) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		if (operatorToApprove.isApproved) {
			return res.status(400).json({
				error: "Operator is already approved",
			});
		}

		const updated = await nodeOperatorService.updateApprovalStatus(
			discordId,
			true
		);

		if (updated) {
			// Fetch the updated operator to return
			const updatedOperator =
				await nodeOperatorService.getOperatorByDiscordId(discordId);
			return res.status(200).json(updatedOperator);
		} else {
			return res.status(500).json({
				error: "Failed to approve operator",
			});
		}
	});

// DELETE /api/operator/approve - unapproves an operator
/**
 * @swagger
 * /api/operator/approve:
 *   delete:
 *     summary: Unapprove a node operator
 *     description: Unapproves a node operator using their Discord ID.
 *     tags: [NodeOperator]
 *     operationId: unapproveOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to unapprove.
 *     responses:
 *       200:
 *         description: Operator unapproved successfully. Returns the updated operator.
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
router.delete(
	"/approve",
	async (req: Request, res: Response) => {
		const discordId = req.query.discordId as string | undefined;
		
		if (!discordId) {
			return res
				.status(400)
				.json({ error: "Missing discordId parameter" });
		}
		
		// Find the operator
		const operatorToUnapprove = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operatorToUnapprove) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const updated = await nodeOperatorService.updateApprovalStatus(
			discordId,
			false
		);

		if (updated) {
			// Fetch the updated operator to return
			const updatedOperator =
				await nodeOperatorService.getOperatorByDiscordId(discordId);
			return res.status(200).json(updatedOperator);
		} else {
			return res.status(500).json({
				error: "Failed to unapprove operator",
			});
		}
	});

// DELETE /api/operator/slashed - removes the wasSlashed flag from an operator
/**
 * @swagger
 * /api/operator/slashed:
 *   delete:
 *     summary: Remove slashed status from a node operator
 *     description: Removes the wasSlashed flag from a node operator using their Discord ID.
 *     tags: [NodeOperator]
 *     operationId: unslashOperator
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator to remove slashed status from.
 *     responses:
 *       200:
 *         description: Slashed status removed successfully. Returns the updated operator.
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
router.delete(
	"/slashed",
	async (req: Request, res: Response) => {
		const discordId = req.query.discordId as string | undefined;
		
		if (!discordId) {
			return res
				.status(400)
				.json({ error: "Missing discordId parameter" });
		}
		
		// Find the operator
		const operatorToUnslash = await nodeOperatorService.getOperatorByDiscordId(discordId);
		
		if (!operatorToUnslash) {
			return res.status(404).json({
				error: "Operator not found",
			});
		}

		const updated = await nodeOperatorService.updateSlashedStatus(
			discordId,
			false
		);

		if (updated) {
			// Fetch the updated operator to return
			const updatedOperator =
				await nodeOperatorService.getOperatorByDiscordId(discordId);
			return res.status(200).json(updatedOperator);
		} else {
			return res.status(500).json({
				error: "Failed to remove slashed status from operator",
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
 *         name: discordId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Discord ID of the operator.
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
	const discordId = req.query.discordId as string | undefined;
	const { message } = req.body;

	if (!discordId) {
		return res.status(400).json({ 
			error: "Missing discordId query parameter" 
		});
	}

	if (!message) {
		return res.status(400).json({ error: "Missing message in request body" });
	}

	try {
		const operator = await nodeOperatorService.getOperatorByDiscordId(discordId);
		if (!operator) {
			return res.status(404).json({ error: "Operator not found" });
		}
		
		// Send direct message
		const dmResult = await discordWebhookService.sendMessageToUser({
			userId: discordId,
			message: message
		});

		if (dmResult.success) {
			logger.info(`Direct message sent to operator Discord ID: ${discordId}`);
			return res.status(200).json({ 
				success: true, 
				message: "Message sent successfully to operator."
			});
		} else {
			logger.error(`Failed to send message to operator Discord ID: ${discordId}. Error: ${dmResult.error}`);
			return res.status(500).json({ error: dmResult.error || "Failed to send message via Discord service" });
		}

	} catch (error) {
		logger.error(error as any, `Error processing message for operator: ${discordId}`);
		const errorMessage = (error as any)?.message || "Internal server error while processing message";
		if (errorMessage.includes("Operator not found")) {
			return res.status(404).json({ error: errorMessage });
		}
		return res.status(500).json({ error: errorMessage });
	}
});

export default router;
