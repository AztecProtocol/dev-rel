import React, { useEffect, useState } from "react";
import VerificationStep from "./VerificationStep.jsx";
import {
	useAppKit,
	useAppKitAccount,
	// useDisconnect, // Unused
} from "@reown/appkit/react";
import { useAccount } from 'wagmi';
import { useSignMessage } from 'wagmi'
import axios from 'axios';
// import { VERIFICATION_MESSAGE, type SessionData } from "@sparta/utils"; // REMOVED - Using local definitions for now

// Standard verification message - must match backend constant
const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord"; // UNCOMMENTED

interface SessionData { // UNCOMMENTED
	sessionId: string;
	walletConnected: boolean;
	walletAddress: string | null;
	verified: boolean;
	status: string;
	score: number | null;
	lastScoreTimestamp: number | null;
} // UNCOMMENTED

const PassportVerificationApp: React.FC = () => {
	// State variables
	// const [isLoading, setIsLoading] = useState(false);
	// const [error, setError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [sessionData, setSessionData] = useState<SessionData | null>(null);
	const [isSigning, setIsSigning] = useState<boolean>(false); // Added state for signing process
	// const [verificationResult, _setVerificationResult] = useState<VerificationResult | null>(null); // State unused

	const { isConnected } = useAppKitAccount();
	// const { disconnect } = useDisconnect(); // Unused
	const { open /*, close */ } = useAppKit(); // close unused
	const { address } = useAccount();
	const { data: signature, signMessage } = useSignMessage();

	// API base URL
	const API_BASE_URL = `${import.meta.env.VITE_API_HOST}:${import.meta.env.VITE_API_PORT}/api`;

	// Get session ID from URL
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const session = urlParams.get('sessionId');
		if (session) {
			setSessionId(session);
		}
	}, []);

	// Fetch session data when sessionId is available
	useEffect(() => {
		const fetchSessionData = async () => {
			if (!sessionId) return;
			
			try {
				const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
				if (response.data.success) {
					setSessionData(response.data);
				} else {
					console.error("Error fetching session data:", response.data.error);
				}
			} catch (error) {
				console.error("Error connecting to verification server:", error);
			}
		};
		
		fetchSessionData();
	}, [sessionId]);

	// Add debug logging
	useEffect(() => {
		console.log("API Base URL:", API_BASE_URL);
		console.log("Environment variables:", {
			host: import.meta.env.VITE_API_HOST,
			port: import.meta.env.VITE_API_PORT
		});
		
		if (address) {
			console.log("Connected wallet address:", address);
		}
	}, [address]);

	useEffect(() => {
		const verifySignature = async () => {
			if (!signature || !sessionId) return;
			
			// Keep isSigning true until verification attempt completes
			try {
				console.log("Verifying your signature for session:", sessionId);
				const response = await axios.post(`${API_BASE_URL}/verify`, {
					signature,
				}, {
					params: { sessionId }
				});
				
				const data = response.data;
				console.log("Signature verification response:", data);

				// Refresh session data after verification to update UI
				const sessionResponse = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
				if (sessionResponse.data.success) {
					setSessionData(sessionResponse.data);
				}
			} catch (error) {
				console.error("Error verifying signature:", error);
				console.log("Error connecting to verification server. Please try again later.", true);
			} finally {
				setIsSigning(false); // Set loading false after verification attempt (success or error)
			}
		};
		
		verifySignature();
	}, [signature, sessionId, API_BASE_URL]); // Added dependencies

	// Effect to auto-close window after successful verification
	useEffect(() => {
		let timer: NodeJS.Timeout | number | undefined;
		if (sessionData?.verified) {
			console.log("Verification successful, closing window in 5 seconds...");
			timer = setTimeout(() => {
				window.close();
			}, 5000); // 5 seconds delay
		}

		// Cleanup function to clear the timeout if the component unmounts
		// or if verification status changes before the timeout completes
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [sessionData?.verified]); // Dependency array ensures this runs when verified status changes

	return (
		<div className="container">
			<div className="card">
				<h1>Human Passport Verification</h1>
				<p>
					Connect your wallet and verify your identity to access
					exclusive Discord roles.
				</p>

				{/* Removed conditional rendering - Steps always shown, content changes */} 
				<div className="steps">
					<VerificationStep
						title="Connect Wallet"
						description="Connect your Ethereum wallet to begin the verification process."
						isActive={!isConnected || !address}
						isCompleted={isConnected && !!address}
						buttonText={"Connect Wallet"}
						onButtonClick={open}
						showButton={!isConnected || !address}
						buttonDisabled={!sessionId}
					/>

					<VerificationStep
						title="Sign Message"
						description="Sign a message to verify your wallet ownership and complete the verification."
						isActive={isConnected && !!address && !(sessionData?.verified ?? false)} // Active until verified
						isCompleted={sessionData?.verified ?? false} // Completed when verified
						buttonText={"Sign Message"}
						showButton={isConnected && !!address} // Button shown when wallet connected
						buttonDisabled={!address || isSigning || !!signature} 
						isLoading={isSigning} 
						onButtonClick={() => {
							setIsSigning(true); 
							signMessage({ message: VERIFICATION_MESSAGE }, {
								onSuccess: (data) => {
									console.log("Signed message successfully:", data);
								},
								onError: (error) => {
									console.error("Error signing message:", error);
									setIsSigning(false); 
								}
							});
						}}
						// Pass the success message as completed content
						completedContent={(
							<div className="verification-success">
								<h2>✓ Verification Successful!</h2> {/* Added checkmark */} 
								<p>You have been successfully verified. You can now close this window and return to Discord.</p>
							</div>
						)}
					/>
				</div>
			</div>
		</div>
	);
};

export default PassportVerificationApp;
