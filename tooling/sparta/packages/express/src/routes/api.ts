import express from "express";
import apiDocs from "@sparta/utils/openapi/api-docs.json";
import swaggerUi from "swagger-ui-express";
import operatorRouter from "./operators";
import ethereumRoutes from "./ethereum";

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

router.use("/operator", operatorRouter);
router.use("/ethereum", ethereumRoutes);

export default router;
