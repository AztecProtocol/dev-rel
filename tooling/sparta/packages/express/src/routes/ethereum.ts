/**
 * @fileoverview Ethereum blockchain API routes
 * @description Provides endpoints for retrieving Ethereum rollup state and validator information
 * @module sparta/express/routes
 */

import { Router } from "express";
import { logger } from "@sparta/utils/logger";
import { getEthereumInstance } from "@sparta/ethereum";
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
 *     EthereumResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: true
 *         data:
 *           type: array
 *           description: Array of data returned from the endpoint
 *           items:
 *             type: string
 *           example: ["0x1234567890abcdef1234567890abcdef12345678", "0xabcdef1234567890abcdef1234567890abcdef12"]
 *       required:
 *         - success
 *         - data
 *     RollupStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             pendingBlockNum:
 *               type: string
 *               description: Current pending block number
 *               example: "123456"
 *             provenBlockNum:
 *               type: string
 *               description: Current proven block number
 *               example: "123450"
 *             validators:
 *               type: array
 *               description: List of validator addresses
 *               items:
 *                 type: string
 *             forwardedValidators:
 *               type: array
 *               description: List of forwarded validator addresses
 *               items:
 *                 type: string
 *             committee:
 *               type: array
 *               description: Current committee members
 *               items:
 *                 type: string
 *             forwardedCommittee:
 *               type: array
 *               description: Forwarded committee members
 *               items:
 *                 type: string
 *             archive:
 *               type: array
 *               description: Archive node addresses
 *               items:
 *                 type: string
 *             currentEpoch:
 *               type: string
 *               description: Current epoch number
 *               example: "42"
 *             currentSlot:
 *               type: string
 *               description: Current slot number
 *               example: "1024"
 *             proposerNow:
 *               type: string
 *               description: Current proposer address
 *               example: "0x1234567890abcdef1234567890abcdef12345678"
 *       required:
 *         - success
 *         - data
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Always false for error responses
 *           example: false
 *         error:
 *           type: string
 *           description: Error message describing what went wrong
 *           example: "Failed to retrieve rollup status"
 *       required:
 *         - success
 *         - error
 */

const router = Router();

// Apply API key middleware to all Ethereum routes
router.use(apiKeyMiddleware);

/**
 * @swagger
 * /api/ethereum/rollup/committee:
 *   get:
 *     summary: Get current epoch committee
 *     description: Retrieves the list of committee members for the current epoch
 *     tags: [Ethereum]
 *     operationId: getCurrentEpochCommittee
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved committee members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EthereumResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error occurred while retrieving committee data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/rollup/committee", async (_req, res) => {
	try {
		const ethereum = await getEthereumInstance();
		const rollup = ethereum.getRollup();
		const committee = await rollup.read.getCurrentEpochCommittee();

		return res.status(200).json({
			success: true,
			data: committee,
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Error retrieving committee data"
		);
		return res.status(500).json({
			success: false,
			error: "Failed to retrieve committee data",
		});
	}
});

/**
 * @swagger
 * /api/ethereum/rollup/validators:
 *   get:
 *     summary: Get all validators
 *     description: Retrieves the list of all attesters (validators) in the rollup system
 *     tags: [Ethereum]
 *     operationId: getAllValidatorsOnChain
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved validators
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EthereumResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error occurred while retrieving validators data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/rollup/validators", async (_req, res) => {
	try {
		const ethereum = await getEthereumInstance();
		const rollup = ethereum.getRollup();
		const validators = await rollup.read.getAttesters();

		return res.status(200).json({
			success: true,
			data: validators,
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Error retrieving validators data"
		);
		return res.status(500).json({
			success: false,
			error: "Failed to retrieve validators data",
		});
	}
});

/**
 * @swagger
 * /api/ethereum/rollup/status:
 *   get:
 *     summary: Get comprehensive rollup status
 *     description: Retrieves complete information about the rollup's current state including block numbers, validators, committee members, and other chain data
 *     tags: [Ethereum]
 *     operationId: getRollupStatus
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved rollup status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RollupStatusResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error occurred while retrieving rollup status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/rollup/status", async (_req, res) => {
	try {
		const ethereum = await getEthereumInstance();

		// Get main chain info from the Ethereum instance directly
		const chainInfo = await ethereum.getRollupInfo();

		console.log(chainInfo);
		return res.status(200).json({
			success: true,
			data: {
				pendingBlockNum: chainInfo.pendingBlockNum.toString(),
				provenBlockNum: chainInfo.provenBlockNum.toString(),
				validators: chainInfo.validators,
				committee: chainInfo.committee,
				currentEpoch: chainInfo.currentEpoch.toString(),
				currentSlot: chainInfo.currentSlot.toString(),
				proposerNow: chainInfo.proposerNow,
			},
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Error retrieving rollup status"
		);
		return res.status(500).json({
			success: false,
			error: "Failed to retrieve rollup status",
		});
	}
});

export default router;
