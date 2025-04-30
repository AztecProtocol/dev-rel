import { useState, useEffect, useContext } from "react";
import { useSignMessage } from "wagmi";
import { VERIFICATION_MESSAGE } from "@sparta/utils";
import { ApiContext } from "../contexts/apiContext";
import type { Components } from "@sparta/utils/openapi/types";

// Re-define state types needed within this hook
type SignState =
	| "idle"
	| "signing"
	| "verifying"
	| "success"
	| "error"
	| "cancelled";

// Define specific response types using generated schemas
type VerifyResponseType = Components.Schemas.VerifyResponse;

interface UseSignatureVerificationProps {
	verificationId?: string;
	isEnabled: boolean; // Control when the hook should run
}

interface UseSignatureVerificationReturn {
	signState: SignState;
	verificationMessage: string | null;
	isLoading: boolean; // Combined loading state for signing/verifying
	error: string | null; // Specific error from signing/verification
	sign: () => void; // Function to initiate signing
	reset: () => void; // Function to reset the hook state
}

/**
 * Hook to manage the signature process for verification.
 */
export function useSignatureVerification({
	verificationId,
	isEnabled,
}: UseSignatureVerificationProps): UseSignatureVerificationReturn {
	const [signState, setSignState] = useState<SignState>("idle");
	const [verificationMessage, setVerificationMessage] = useState<
		string | null
	>(null);
	const [internalError, setInternalError] = useState<string | null>(null);
	const { signMessage, data: signData, error: signError } = useSignMessage();
	const client = useContext(ApiContext);

	// Effect to detect signature cancellation
	useEffect(() => {
		if (signError && signState === "signing") {
			console.warn("Signature cancelled or failed:", signError);
			setSignState("cancelled");
			setVerificationMessage("Cancelled signing. Please try again.");
			setInternalError(signError.message ?? "Signing cancelled by user.");
		}
	}, [signError, signState]);

	// Effect to call verify endpoint once signature is available
	useEffect(() => {
		const verifySignature = async () => {
			if (
				signData &&
				signState === "signing" && // Only proceed if we were waiting for signature
				verificationId &&
				client
			) {
				try {
					setSignState("verifying");
					setVerificationMessage("Verifying signature...");
					setInternalError(null);

					const response = await client.verifySignature(
						null, // Query parameters (none needed here)
						{
							// Request Body (data argument)
							signature: signData,
							verificationId: verificationId,
						}
					);

					if (response.status === 200) {
						const responseData =
							response.data as VerifyResponseType;
						setSignState("success");
						setVerificationMessage(
							responseData.message || // Access typed property
								"Verification successful! This modal will close shortly."
						);
					} else {
						setSignState("error");
						// Assuming error response also has a message property based on Error schema
						const errorData =
							response.data as unknown as Components.Schemas.Error;
						const errMsg =
							errorData?.error ||
							"Verification failed. Please try again.";
						setVerificationMessage(errMsg);
						setInternalError(errMsg);
					}
				} catch (error) {
					console.error("Error verifying signature:", error);
					setSignState("error");
					const errMsg =
						error instanceof Error
							? error.message
							: "An error occurred during verification.";
					setVerificationMessage(`${errMsg} Please try again.`);
					setInternalError(errMsg);
				}
			}
		};

		verifySignature();
		// Explicitly depend on client, signData, signState, verificationId
	}, [signData, signState, verificationId, client]);

	const sign = () => {
		if (!client) {
			console.error("API client is not available for signing.");
			setSignState("error");
			setVerificationMessage(
				"API client failed to initialize. Please refresh."
			);
			setInternalError("API client not available.");
			return;
		}
		if (!verificationId) {
			console.error("Missing verificationId for signing.");
			setSignState("error");
			setVerificationMessage(
				"Cannot sign message: verification ID is missing."
			);
			setInternalError("Missing verificationId.");
			return;
		}

		setSignState("signing");
		setVerificationMessage("Waiting for signature...");
		setInternalError(null);

		// Trigger the signature request
		signMessage({ message: VERIFICATION_MESSAGE });
	};

	const reset = () => {
		setSignState("idle");
		setVerificationMessage(null);
		setInternalError(null);
		// Note: We don't reset signData or signError from useSignMessage here,
		// as they are managed externally by wagmi. New signing attempts will overwrite them.
	};

	// Effect to reset state if hook is disabled or verificationId changes
	useEffect(() => {
		if (!isEnabled) {
			reset();
		}
	}, [isEnabled, verificationId]);

	return {
		signState,
		verificationMessage,
		isLoading: signState === "signing" || signState === "verifying",
		error: internalError, // Return the captured error message
		sign,
		reset,
	};
}
