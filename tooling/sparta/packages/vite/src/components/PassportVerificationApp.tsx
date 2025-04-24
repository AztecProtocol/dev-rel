import React, { useEffect, useState } from "react";
import VerificationStep from "./VerificationStep.jsx";
import { useAppKitAccount, useDisconnect, useAppKit } from "@reown/appkit/react";
import { useAccount } from 'wagmi'
import { useSignMessage } from 'wagmi'
import axios from 'axios';

// Standard verification message - must match backend constant
const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";

interface VerificationResult {
	success?: boolean;
	inProgress?: boolean;
	message: string;
	score?: number;
	minimumScore?: number;
	details?: string;
}

interface SessionData {
	sessionId: string;
	walletConnected: boolean;
	walletAddress: string | null;
	verified: boolean;
	status: string;
	score: number | null;
	lastScoreTimestamp: number | null;
}

const PassportVerificationApp: React.FC = () => {
	// State variables
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [sessionData, setSessionData] = useState<SessionData | null>(null);
	const [verificationResult, setVerificationResult] =
		useState<VerificationResult | null>(null);

	const { isConnected } = useAppKitAccount();
	const { disconnect } = useDisconnect();
	const { open, close } = useAppKit();
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
			}
		};
		
		verifySignature();
	}, [signature]);

	return (
		<div className="container">
			<div className="card">
				<h1>Human Passport Verification</h1>
				<p>
					Connect your wallet and verify your identity to access
					exclusive Discord roles.
				</p>

				<div className="steps">
					<VerificationStep
						number={1}
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
						number={2}
						title="Sign Message"
						description="Sign a message to verify your wallet ownership and complete the verification."
						isActive={isConnected && !!address}
						isCompleted={!!signature}
						buttonText={"Sign Message"}
						showButton={isConnected && !!address}
						buttonDisabled={!address}
						onButtonClick={() => {
							signMessage({ message: VERIFICATION_MESSAGE });
						}}
					/>

					{sessionData?.verified && (
						<div className="verification-success">
							<h2>Verification Successful!</h2>
							<p>You have been successfully verified. You can now close this window and return to Discord.</p>
						</div>
					)}
				</div>

				{/* Debug info */}
				<div className="debug-info" style={{ marginTop: '30px', fontSize: '12px', color: '#888' }}>
					<h4>Debug Information</h4>
					<p>Session ID: {sessionId || 'No session ID'}</p>
					<p>Wallet Address: {address || 'Not connected'}</p>
					<p>Session Data: {sessionData ? JSON.stringify(sessionData, null, 2) : 'No data'}</p>
				</div>
			</div>
		</div>
	);
};

export default PassportVerificationApp;
