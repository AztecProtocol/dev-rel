/**
 * @fileoverview RPC client utilities for interacting with Aztec nodes
 * @description Provides methods for JSON-RPC communication and ENR decoding
 */

import { logger } from "./logger.js";
import { ENR } from "@chainsafe/enr";

/**
 * JSON-RPC response structure
 */
interface JsonRpcResponse {
	jsonrpc: string;
	result?: any;
	id: number;
	error?: { code: number; message: string };
}

/**
 * Result structure for validator node query
 */
interface ValidatorNodeResult {
	peerId: string;
	ip?: string;
	tcp?: number;
	udp?: number;
	error?: string;
}

/**
 * Send a JSON-RPC request to a specified endpoint
 * @param rpcUrl The RPC endpoint URL
 * @param method RPC method name
 * @param params Array of parameters to pass to the method
 * @param timeoutMs Request timeout in milliseconds (default: 5000)
 * @returns The result field from the RPC response
 */
export async function sendJsonRpcRequest(
	rpcUrl: string,
	method: string,
	params: any[] = [],
	timeoutMs: number = 30000
): Promise<any> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		const response = await fetch(rpcUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method,
				params,
				id: Math.floor(Math.random() * 1000), // Random ID
			}),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(
				`HTTP error! status: ${response.status} ${response.statusText}`
			);
		}

		const data: JsonRpcResponse = await response.json();

		if (data.error) {
			throw new Error(
				`RPC error! code: ${data.error.code}, message: ${data.error.message}`
			);
		}

		if (data.result === undefined) {
			throw new Error("RPC response missing result field.");
		}

		return data.result;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`RPC request to ${rpcUrl} timed out after ${timeoutMs}ms`);
		}
		logger.error(error, `Error in RPC call to ${method} at ${rpcUrl}`);
		throw error;
	}
}

/**
 * Decode peer ID from ENR string
 * @param enrString The ENR string to decode
 * @returns Object containing peer ID and other node info, or error
 */
export async function decodePeerIdFromENR(enrString: string): Promise<ValidatorNodeResult> {
	try {
		// Decode the ENR
		const decoded = ENR.decodeTxt(enrString);
		
		// Extract the peerId
		const peerId = await decoded.peerId();
		
		logger.info(`Successfully decoded ENR - PeerID: ${peerId.toString()}`);
		
		return {
			peerId: peerId.toString(),
			ip: decoded.ip,
			tcp: decoded.tcp,
			udp: decoded.udp,
		};
	} catch (error) {
		logger.error(error, 'Error decoding ENR');
		return {
			peerId: '',
			error: error instanceof Error ? error.message : 'Unknown error decoding ENR',
		};
	}
}

/**
 * Query a validator node for its ENR and extract peer ID
 * @param ip The IP address of the validator node
 * @param port The port of the validator node (default: 8080)
 * @returns Object containing peer ID and node info, or error details
 */
export async function queryValidatorNode(
	ip: string,
	port: number = 8080
): Promise<ValidatorNodeResult> {
	try {
		// Validate IP format (basic check)
		const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		if (!ipRegex.test(ip)) {
			return {
				peerId: '',
				error: 'Invalid IP address format. Please provide a valid IPv4 address.',
			};
		}

		// Validate port range
		if (port < 1 || port > 65535) {
			return {
				peerId: '',
				error: 'Invalid port number. Please provide a port between 1 and 65535.',
			};
		}

		const rpcUrl = `http://${ip}:${port}`;
		logger.info(`Querying validator node at ${rpcUrl} for ENR`);

		// Query the node for its ENR
		const enrResult = await sendJsonRpcRequest(rpcUrl, "node_getEncodedEnr", [], 5000);
		
		if (!enrResult || typeof enrResult !== 'string') {
			return {
				peerId: '',
				error: 'Invalid ENR response from node. The node may not be an Aztec validator.',
			};
		}

		// Decode the ENR to get peer ID
		const decodedResult = await decodePeerIdFromENR(enrResult);
		
		if (decodedResult.error) {
			return {
				peerId: '',
				error: `Failed to decode ENR: ${decodedResult.error}`,
			};
		}

		logger.info(`Successfully obtained peer ID ${decodedResult.peerId} from node ${ip}:${port}`);
		
		return {
			...decodedResult,
			ip, // Add the queried IP for reference
		};
	} catch (error) {
		logger.error(error, `Error querying validator node at ${ip}:${port}`);
		
		// Provide user-friendly error messages based on error type
		let errorMessage = 'Unknown error occurred while querying the node.';
		
		if (error instanceof Error) {
			if (error.message.includes('timeout')) {
				errorMessage = 'Connection timed out. Please check if the node is running and accessible.';
			} else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
				errorMessage = 'Cannot connect to the node. Please verify the IP address and port are correct and the node is running.';
			} else if (error.message.includes('RPC error')) {
				errorMessage = 'The node rejected the request. Please ensure it\'s an Aztec validator node.';
			} else {
				errorMessage = error.message;
			}
		}

		return {
			peerId: '',
			error: errorMessage,
		};
	}
} 