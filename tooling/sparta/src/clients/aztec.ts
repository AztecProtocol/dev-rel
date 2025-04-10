/**
 * @fileoverview Aztec client and utilities
 * @description Provides Aztec node interaction methods via JSON-RPC
 * @module sparta/utils/aztec
 */

export class Aztec {
	private readonly rpcUrl: string;

	constructor(rpcUrl: string) {
		this.rpcUrl = rpcUrl;
	}

	static new = async () => {
		try {
			console.log("Initializing Aztec client");
			const rpcUrl = process.env.AZTEC_NODE_URL;

			if (!rpcUrl) {
				throw new Error("AZTEC_NODE_URL is not set");
			}

			return new Aztec(rpcUrl);
		} catch (error) {
			console.error("Error initializing Aztec client:", error);
			throw error;
		}
	};

	private async sendJsonRpcRequest(
		method: string,
		params: any[] = []
	): Promise<any> {
		const response = await fetch(this.rpcUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method,
				params,
				id: 67,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		if (data.error) {
			throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
		}

		return data.result;
	}

	getL2Tips = async (): Promise<string> => {
		const result = await this.sendJsonRpcRequest("node_getL2Tips");
		return result.proven.number as string;
	};

	getArchiveSiblingPath = async (blockNumber: string): Promise<any> => {
		return await this.sendJsonRpcRequest("node_getArchiveSiblingPath", [
			blockNumber,
			blockNumber,
		]);
	};
}

export const aztec = await Aztec.new();
