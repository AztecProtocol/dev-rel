import express from "express";
import humanRoutes from "./human";
import userRoutes from "./users";
import apiDocs from "../../../vite/src/api-docs.json";
import swaggerUi from "swagger-ui-express";
const router = express.Router();

router.use(express.json());

router.get("/api-docs.json", (_req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.send(apiDocs);
});

router.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(apiDocs, {
		explorer: true,
		customCss: ".swagger-ui .topbar { display: none }", // Hide the top bar (optional)
	})
);

router.use("/human", humanRoutes);
router.use("/users", userRoutes);

export default router;
