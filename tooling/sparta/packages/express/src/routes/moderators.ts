import express, { type Request, type Response, Router } from "express";
import { logger } from "@sparta/utils"; // Assuming logger is accessible
import { apiKeyMiddleware } from "../middlewares/auth.js";
import { discordWebhookService } from "@sparta/discord"; // Import Discord service

// --- Swagger Schemas ---
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *   schemas:
 *     ModeratorMessageInput:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: The message content to send.
 *         channelId:
 *           type: string
 *           description: The Discord channel ID to send the message to.
 *       required:
 *         - message
 *         - channelId
 *     ModeratorError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message describing the issue.
 */

const router: Router = express.Router();

// Apply API key middleware to all moderator routes
router.use(apiKeyMiddleware);

// POST /api/moderator/message - sends a message to a specific channel
/**
 * @swagger
 * /api/moderator/message:
 *   post:
 *     summary: Send a message to a Discord channel
 *     description: Sends a message to a specified Discord channel.
 *     tags: [Moderator]
 *     operationId: sendMessageToChannel
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModeratorMessageInput'
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
 *               $ref: '#/components/schemas/ModeratorError'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModeratorError'
 *       500:
 *         description: Internal Server Error or failed to send message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModeratorError'
 */
router.post("/message", async (req: Request, res: Response) => {
	const { message, channelId } = req.body;

	if (!message) {
		return res.status(400).json({ error: "Missing message in request body" });
	}

	if (!channelId) {
		return res.status(400).json({ error: "Missing channelId in request body" });
	}

	try {
		// Assuming discordWebhookService has a method to send a message to a specific channel
		// You might need to adjust this based on the actual implementation of discordWebhookService
		const result = await discordWebhookService.sendChannelMessage(channelId, message);

		if (result) { // sendChannelMessage returns a boolean
			logger.info(`Message sent to channel ID: ${channelId}`);
			return res.status(200).json({
				success: true,
				message: "Message sent successfully to channel.",
				// messageId: result.id // sendChannelMessage doesn't return messageId directly in this impl
			});
		} else {
			logger.error(`Failed to send message to channel ID: ${channelId}.`);
			return res.status(500).json({ error: "Failed to send message via Discord service" });
		}

	} catch (error) {
		logger.error(error as any, `Error processing message for channel: ${channelId}`);
		const errorMessage = (error as any)?.message || "Internal server error while processing message";
		return res.status(500).json({ error: errorMessage });
	}
});

export default router; 