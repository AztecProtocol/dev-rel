/**
 * @fileoverview API routes for User management
 * @description Express routes for managing user profiles after they've proven they're human
 * @module sparta/express/routes/users
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { logger } from "@sparta/utils/index.js";
import { extendedDynamoDB } from "../db/userRepository.js";
import { apiKeyMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// HumanPassport interface - specific to human verification 
export interface HumanPassport {
  status: string;               // Current status of verification
  score?: number | null;        // Passport score if verification completed
  lastVerificationTime?: number | null; // When they last completed verification
  verificationId?: string | null; // ID used for the verification process
  interactionToken?: string | null; // Discord interaction token for UI updates
}

// User interface - Comprehensive model for storing users
export interface User {
  discordUserId: string;        // Primary identifier - Discord user ID
  discordUsername: string;      // Discord username 
  walletAddress?: string | null; // Ethereum address (verified through passport)
  role?: string | null;         // User role within the system
  humanPassport?: HumanPassport | null; // Human verification data
  createdAt: number;            // Timestamp when user was created
  updatedAt: number;            // Timestamp when user was last updated
}

// Add the User type to DynamoDB utility
declare module "@sparta/utils/dynamo-db" {
  interface DynamoDBUtils {
    createUser(user: User): Promise<boolean>;
    getUser(discordUserId: string): Promise<User | null>;
    getUserByVerificationId(verificationId: string): Promise<User | null>; // Get user by verification ID
    getUserByWalletAddress(walletAddress: string): Promise<User | null>;
    getAllUsers(): Promise<User[]>;
    updateUser(discordUserId: string, updates: Partial<User>): Promise<boolean>;
    deleteUser(discordUserId: string): Promise<boolean>;
  }
}

// Apply API key middleware to all user routes
router.use(apiKeyMiddleware);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Success status
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await extendedDynamoDB.getAllUsers();
    
    return res.status(200).json({
      success: true,
      users: users
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Error retrieving all users");
    
    return res.status(500).json({
      success: false,
      error: "Server error while retrieving users"
    });
  }
});

/**
 * @swagger
 * /api/users/discord/{discordUserId}:
 *   get:
 *     summary: Get a specific user by Discord user ID
 *     description: Retrieve a user by their Discord user ID
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: discordUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: Discord user ID
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Success status
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/discord/:discordUserId", async (req: Request, res: Response) => {
  try {
    const { discordUserId } = req.params;
    
    if (!discordUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing discordUserId parameter"
      });
    }
    
    const user = await extendedDynamoDB.getUser(discordUserId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      user: user
    });
  } catch (error: any) {
    logger.error({ error: error.message, discordUserId: req.params.discordUserId }, "Error retrieving user");
    
    return res.status(500).json({
      success: false,
      error: "Server error while retrieving user"
    });
  }
});

/**
 * @swagger
 * /api/users/wallet/{walletAddress}:
 *   get:
 *     summary: Get a user by wallet address
 *     description: Retrieve a user by their Ethereum wallet address
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum wallet address
 *     responses:
 *       200:
 *         description: User profile or "wallet not registered" if address isn't used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Success status
 *                 isRegistered:
 *                   type: boolean
 *                   description: Whether the wallet is registered
 *                 message:
 *                   type: string
 *                   description: Informational message
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Bad request - Missing wallet address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/wallet/:walletAddress", async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing walletAddress parameter"
      });
    }
    
    // Check if this wallet is already registered to another user
    const existingUser = await extendedDynamoDB.getUserByWalletAddress(walletAddress);
    
    if (!existingUser) {
      return res.status(200).json({
        success: true,
        isRegistered: false,
        message: "Wallet address is not registered to any user"
      });
    }
    
    return res.status(200).json({
      success: true,
      isRegistered: true,
      user: existingUser
    });
  } catch (error: any) {
    logger.error({ error: error.message, walletAddress: req.params.walletAddress }, "Error checking wallet address");
    
    return res.status(500).json({
      success: false,
      error: "Server error while checking wallet address"
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user profile
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discordUserId
 *               - discordUsername
 *             properties:
 *               discordUserId:
 *                 type: string
 *                 description: Discord user ID
 *               discordUsername:
 *                 type: string
 *                 description: Discord username
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address
 *               role:
 *                 type: string
 *                 description: User role
 *               humanPassport:
 *                 type: object
 *                 description: Human passport verification data
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request - Missing required fields or wallet already in use
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       500:
 *         description: Server error
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { discordUserId, discordUsername, walletAddress, role, humanPassport } = req.body;
    
    // Validate required fields
    if (!discordUserId || !discordUsername) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: discordUserId and discordUsername are required"
      });
    }
    
    // Check if this Discord user already exists
    const existingUser = await extendedDynamoDB.getUser(discordUserId);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this Discord ID already exists",
        existingUser
      });
    }
    
    // Check if wallet address is already in use by another user (if provided)
    if (walletAddress) {
      const existingWallet = await extendedDynamoDB.getUserByWalletAddress(walletAddress);
      if (existingWallet) {
        return res.status(400).json({
          success: false,
          error: "This wallet address is already registered to another Discord user",
          existingWallet
        });
      }
    }
    
    // Create new user
    const timestamp = Date.now();
    const newUser: User = {
      discordUserId,
      discordUsername,
      walletAddress: walletAddress || null,
      role: role || null,
      humanPassport: humanPassport || null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    const created = await extendedDynamoDB.createUser(newUser);
    
    if (!created) {
      return res.status(500).json({
        success: false,
        error: "Failed to create user"
      });
    }
    
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: newUser
    });
  } catch (error: any) {
    logger.error({ error: error.message, body: req.body }, "Error creating user");
    
    return res.status(500).json({
      success: false,
      error: "Server error while creating user"
    });
  }
});

/**
 * @swagger
 * /api/users/discord/{discordUserId}:
 *   put:
 *     summary: Update a user by Discord user ID
 *     description: Update an existing user's information
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: discordUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: Discord user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discordUsername:
 *                 type: string
 *                 description: Discord username
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address
 *               role:
 *                 type: string
 *                 description: User role
 *               humanPassport:
 *                 type: object
 *                 description: Human passport verification data
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request or wallet already in use
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put("/discord/:discordUserId", async (req: Request, res: Response) => {
  try {
    const { discordUserId } = req.params;
    const updates = req.body;
    
    if (!discordUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing discordUserId parameter"
      });
    }
    
    // Don't allow updating the discordUserId
    if (updates.discordUserId) {
      delete updates.discordUserId;
    }
    
    // Find the user
    const user = await extendedDynamoDB.getUser(discordUserId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // If trying to update the wallet address, check if it's already in use
    if (updates.walletAddress && updates.walletAddress !== user.walletAddress) {
      const existingWallet = await extendedDynamoDB.getUserByWalletAddress(updates.walletAddress);
      
      if (existingWallet && existingWallet.discordUserId !== discordUserId) {
        return res.status(400).json({
          success: false,
          error: "This wallet address is already registered to another Discord user",
          existingWallet
        });
      }
    }
    
    // Update timestamp
    updates.updatedAt = Date.now();
    
    // Update the user
    const updated = await extendedDynamoDB.updateUser(discordUserId, updates);
    
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: "Failed to update user"
      });
    }
    
    // Get the updated user
    const updatedUser = await extendedDynamoDB.getUser(discordUserId);
    
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error: any) {
    logger.error({ error: error.message, discordUserId: req.params.discordUserId }, "Error updating user");
    
    return res.status(500).json({
      success: false,
      error: "Server error while updating user"
    });
  }
});

/**
 * @swagger
 * /api/users/discord/{discordUserId}:
 *   delete:
 *     summary: Delete a user by Discord user ID
 *     description: Delete a user by their Discord user ID
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: discordUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: Discord user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete("/discord/:discordUserId", async (req: Request, res: Response) => {
  try {
    const { discordUserId } = req.params;
    
    if (!discordUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing discordUserId parameter"
      });
    }
    
    // Check if user exists
    const user = await extendedDynamoDB.getUser(discordUserId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Delete the user
    const deleted = await extendedDynamoDB.deleteUser(discordUserId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete user"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error: any) {
    logger.error({ error: error.message, discordUserId: req.params.discordUserId }, "Error deleting user");
    
    return res.status(500).json({
      success: false,
      error: "Server error while deleting user"
    });
  }
});

/**
 * @swagger
 * /api/users/verification/{verificationId}:
 *   get:
 *     summary: Get a user by verification ID
 *     description: Retrieve a user by their Human Passport verification ID
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Human Passport verification ID
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Success status
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Bad request - Missing verification ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found with this verification ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/verification/:verificationId", async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    
    if (!verificationId) {
      return res.status(400).json({
        success: false,
        error: "Missing verificationId parameter"
      });
    }
    
    const user = await extendedDynamoDB.getUserByVerificationId(verificationId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found with this verification ID"
      });
    }
    
    return res.status(200).json({
      success: true,
      user: user
    });
  } catch (error: any) {
    logger.error({ error: error.message, verificationId: req.params.verificationId }, "Error retrieving user by verification ID");
    
    return res.status(500).json({
      success: false,
      error: "Server error while retrieving user"
    });
  }
});

export default router;
