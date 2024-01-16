import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import project from "../circuit/target/project.json" assert { type: "json" };
import { JSONRPCClient } from "json-rpc-2.0";

const client = new JSONRPCClient((jsonRPCRequest) => {
	return fetch("http://localhost:5555", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(jsonRPCRequest),
	}).then((response) => {
		if (response.status === 200) {
			return response
				.json()
				.then((jsonRPCResponse) => client.receive(jsonRPCResponse));
		} else if (jsonRPCRequest.id !== undefined) {
			return Promise.reject(new Error(response.statusText));
		}
	});
});

const oracleResolver = async (name, input) => {
	const oracleReturn = await client.request(name, [
		{ Array: input[0].map((i) => ({ inner: i.toString("hex") })) },
	]);
	return [oracleReturn.values[0].Array.map((x) => x.inner)];
};

async function main() {
	const backend = new BarretenbergBackend(project);
	const noir = new Noir(project, backend);

	const input = { input: [4, 16] };
	const proof = await noir.generateFinalProof(input, oracleResolver);
	console.log(proof);
}

main();
