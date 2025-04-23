import React, { useEffect, useState } from "react";
import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, sepolia } from "@reown/appkit/networks";

// Components
import VerificationStep from "./VerificationStep.jsx";
import StatusMessage from "./StatusMessage.jsx";

interface VerificationResult {
	success?: boolean;
	inProgress?: boolean;
	message: string;
	score?: number;
	minimumScore?: number;
	details?: string;
}

const PassportVerificationApp: React.FC = () => {
	// State variables
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [walletAddress, setWalletAddress] = useState<string | null>(null);
	const [messageToSign, setMessageToSign] = useState<string | null>(null);
	const [connection, setConnection] = useState<any>(null);
	const [appkit, setAppkit] = useState<any>(null);
	const [status, setStatus] = useState({
		message: "",
		isError: false,
		visible: false,
	});
	const [currentStep, setCurrentStep] = useState(1);
	const [verificationResult, setVerificationResult] =
		useState<VerificationResult | null>(null);
	const [isLoading, setIsLoading] = useState({ connect: false, sign: false });

	// API base URL
	const API_BASE_URL = "/internal/passport";

	// Initialize AppKit
	useEffect(() => {
		// Use the project ID from WalletConnect Cloud Dashboard
		const projectId = "d037e9da5c5c9b24cfcd94c509d88dce";

		// Configure metadata - Make sure this is complete and correctly formatted
		const metadata = {
			name: "Human Passport Verification",
			description: "Verify your identity with Human Passport",
			url: window.location.origin,
			icons: [
				"https://github.com/gitcoinco/passport/blob/main/assets/humanbound-logo.png?raw=true",
			],
		};

		try {
			// Create Wagmi Adapter with explicit configuration
			const wagmiAdapter = new WagmiAdapter({
				projectId,
				networks: [mainnet, sepolia],
			});

			// Create AppKit instance with complete configuration
			const appkitInstance = createAppKit({
				adapters: [wagmiAdapter],
				networks: [mainnet, sepolia],
				metadata,
				projectId,
			});

			console.log("AppKit instance created:", !!appkitInstance);
			setAppkit(appkitInstance);
		} catch (error) {
			console.error("Error initializing AppKit:", error);
		}
	}, []);

	// Get session ID from URL on component mount
	useEffect(() => {
		async function checkSessionValidity() {
			const urlParams = new URLSearchParams(window.location.search);
			const sid = urlParams.get("session");

			if (!sid) {
				showStatus(
					"Invalid session. Please return to Discord and try again.",
					true
				);
				return;
			}

			setSessionId(sid);

			try {
				const response = await fetch(`${API_BASE_URL}/session/${sid}`);
				const data = await response.json();

				if (!data.success) {
					showStatus(
						"Session expired or invalid. Please return to Discord and try again.",
						true
					);
					return;
				}
			} catch (error) {
				showStatus(
					"Error connecting to server. Please try again later.",
					true
				);
				console.error("Session check error:", error);
			}
		}

		checkSessionValidity();
	}, []);

	// Status message handler
	const showStatus = (message: string, isError = false) => {
		setStatus({
			message,
			isError,
			visible: true,
		});
	};

	// Connect wallet handler - Simplified version using only basic methods
	const connectWallet = async () => {
		try {
			setIsLoading({ ...isLoading, connect: true });

			if (!appkit) {
				showStatus(
					"Wallet connection library not loaded. Please refresh the page.",
					true
				);
				setIsLoading({ ...isLoading, connect: false });
				return;
			}

			// Simplified connection approach
			console.log("Opening wallet connection...");

			try {
				// Use the basic open method which should be available
				const conn = await appkit.open();
				console.log("Wallet connection response:", conn);

				// If conn exists but doesn't have accounts, try to get them directly
				if (conn) {
					// Check if we have accounts directly
					if (conn.accounts && conn.accounts.length > 0) {
						const address = conn.accounts[0];
						console.log("Connected wallet address:", address);
						setWalletAddress(address);
						setConnection(conn);

						showStatus(
							`Connected wallet: ${address.substring(
								0,
								6
							)}...${address.substring(address.length - 4)}`
						);
						setCurrentStep(2);

						// Send wallet address to server
						await connectWalletToSession(address);
						return;
					}

					showStatus(
						"Connected but no accounts found. Please try again.",
						true
					);
				} else {
					showStatus(
						"Failed to connect wallet. Please try again.",
						true
					);
				}
			} catch (error: any) {
				console.error("Wallet connection error:", error);
				showStatus(`Error connecting wallet: ${error.message}`, true);
			}
		} finally {
			setIsLoading({ ...isLoading, connect: false });
		}
	};

	// Send wallet address to server
	const connectWalletToSession = async (address: string) => {
		try {
			// Validate the address format
			if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
				showStatus(
					"Invalid Ethereum address format. Please reconnect your wallet.",
					true
				);
				return;
			}

			const response = await fetch(`${API_BASE_URL}/connect-wallet`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
					walletAddress: address,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setMessageToSign(data.message);
			} else {
				showStatus(`Error: ${data.error}`, true);
			}
		} catch (error) {
			showStatus(
				"Error connecting to server. Please try again later.",
				true
			);
			console.error("API error:", error);
		}
	};

	// Sign message handler
	const signMessage = async () => {
		try {
			if (!messageToSign || !connection || !walletAddress) {
				showStatus(
					"Unable to sign message. Please reconnect your wallet.",
					true
				);
				return;
			}

			setIsLoading({ ...isLoading, sign: true });
			showStatus("Please approve the signature request in your wallet.");

			// Sign the message using AppKit
			const signResult = await appkit.request({
				method: "personal_sign",
				params: [messageToSign, walletAddress],
			});

			if (signResult) {
				setCurrentStep(3);

				// Send signature to server
				await verifySignature(signResult);
			} else {
				showStatus("Failed to sign message. Please try again.", true);
			}
		} catch (error: any) {
			showStatus(`Error signing message: ${error.message}`, true);
			console.error("Signing error:", error);
		} finally {
			setIsLoading({ ...isLoading, sign: false });
		}
	};

	// Send signature to server
	const verifySignature = async (signature: string) => {
		try {
			showStatus("Verifying signature and checking Passport score...");

			await fetch(`${API_BASE_URL}/verify-signature`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
					signature,
				}),
			});

			// Check verification status
			await checkVerificationStatus();
		} catch (error) {
			showStatus(
				"Error verifying signature. Please try again later.",
				true
			);
			console.error("Verification error:", error);
			setVerificationResult({
				success: false,
				message: "Verification failed due to server error.",
			});
		}
	};

	// Check verification status
	const checkVerificationStatus = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/status/${sessionId}`);
			const data = await response.json();

			if (!data.success) {
				showStatus(`Error: ${data.error}`, true);
				setVerificationResult({
					success: false,
					message: "Verification status check failed.",
				});
				return;
			}

			// Handle different verification statuses
			if (data.verified && data.roleAssigned) {
				showStatus(
					"Verification successful! Your Discord role has been assigned.",
					false
				);
				setVerificationResult({
					success: true,
					message: "Verification Complete",
					score: data.score,
					details:
						"The verified role has been assigned to your Discord account. You can now close this window and return to Discord.",
				});
			} else if (data.verified) {
				showStatus(
					"Verification successful, but role assignment failed.",
					true
				);
				setVerificationResult({
					success: false,
					message: "Passport Verified",
					score: data.score,
					details:
						"However, we couldn't assign the role to your Discord account. Please contact an administrator for assistance.",
				});
			} else if (data.score !== undefined) {
				showStatus(
					`Verification failed. Your score (${data.score}) is below the required threshold (${data.minimumRequiredScore}).`,
					true
				);
				setVerificationResult({
					success: false,
					message: "Score Too Low",
					score: data.score,
					minimumScore: data.minimumRequiredScore,
					details:
						"Try connecting more verified accounts to your Passport to increase your score and try again.",
				});
			} else {
				showStatus("Verification in progress. Please wait...");
				setVerificationResult({
					inProgress: true,
					message: "Verification in progress...",
				});

				// Poll for status updates
				setTimeout(checkVerificationStatus, 5000);
			}
		} catch (error) {
			showStatus(
				"Error checking verification status. Please try again later.",
				true
			);
			console.error("Status check error:", error);
		}
	};

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
						isActive={currentStep === 1}
						isCompleted={currentStep > 1}
						buttonText={
							isLoading.connect
								? "Connecting..."
								: "Connect Wallet"
						}
						onButtonClick={connectWallet}
						showButton={currentStep === 1}
						buttonDisabled={isLoading.connect || !sessionId}
						isLoading={isLoading.connect}
					/>

					<VerificationStep
						number={2}
						title="Sign Message"
						description="Sign a message to verify your wallet ownership and complete the verification."
						isActive={currentStep === 2}
						isCompleted={currentStep > 2}
						buttonText={
							isLoading.sign ? "Signing..." : "Sign Message"
						}
						onButtonClick={signMessage}
						showButton={currentStep === 2}
						buttonDisabled={isLoading.sign || !messageToSign}
						isLoading={isLoading.sign}
					/>

					<VerificationStep
						number={3}
						title="Verification"
						description="We'll check your Human Passport score and assign your role if eligible."
						isActive={currentStep === 3}
						isCompleted={false}
						showButton={false}
						result={
							verificationResult as VerificationResult | undefined
						}
					/>
				</div>

				{status.visible && (
					<StatusMessage
						message={status.message}
						isError={status.isError}
					/>
				)}
			</div>
		</div>
	);
};

export default PassportVerificationApp;
