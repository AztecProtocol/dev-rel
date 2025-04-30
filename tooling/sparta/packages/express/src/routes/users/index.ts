import express from "express";
import humanRoutes from "./human";
import userRoutes from "./users";

const router = express.Router();

// Mount the human routes at /human
router.use("/human", humanRoutes);

// Mount the user routes directly at the root level
router.use("/", userRoutes);

export default router;
