import { JSONRPCServer } from "json-rpc-2.0";
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const server = new JSONRPCServer();

server.addMethod("getSqrt", async (params) => {
	const values = params[0].Array.map(({ inner }) => {
		return { inner: `${Math.sqrt(parseInt(inner, 16))}` };
	});
	return { values: [{ Array: values }] };
});

app.post("/", (req, res) => {
	const jsonRPCRequest = req.body;
	server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
		if (jsonRPCResponse) {
			res.json(jsonRPCResponse);
		} else {
			res.sendStatus(204);
		}
	});
});

app.listen(5555);
