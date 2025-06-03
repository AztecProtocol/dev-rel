import express from "express";
import apiDocs from "@sparta/utils/openapi/api-docs.json";
import swaggerUi from "swagger-ui-express";
import operatorRouter from "./operators";
import ethereumRoutes from "./ethereum";
import validatorRouter from "./validators";
import { apiKeyMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.use(express.json());

router.get("/api-docs.json", (_req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.send(apiDocs);
});

// Modify the API docs to use the correct server URL
const modifiedApiDocs = JSON.parse(JSON.stringify(apiDocs));
const apiUrl = process.env.API_URL || `${process.env.API_PROTOCOL || 'http'}://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '3000'}`;

if (modifiedApiDocs.servers && modifiedApiDocs.servers.length > 0) {
	modifiedApiDocs.servers[0].variables.serverUrl.default = apiUrl;
}

router.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(modifiedApiDocs, {
		explorer: true,
		customCss: ".swagger-ui .topbar { display: none }", // Hide the top bar (optional)
	})
);

router.use(apiKeyMiddleware);
router.use("/operator", operatorRouter);
router.use("/validator", validatorRouter);
router.use("/ethereum", ethereumRoutes);
export default router;
