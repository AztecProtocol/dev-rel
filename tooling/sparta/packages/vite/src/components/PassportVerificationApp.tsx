import React from "react";
import { usePassportVerification } from "../hooks/usePassportVerification";
import { Button } from "./Button";
import Spinner from "./Spinner";

// Type interfaces for component props
interface ConnectWalletStepProps {
	onConnect: () => void;
	sessionId: string | null;
}

interface InsufficientScoreStepProps {
	userScore: number | null;
	minimumScore: number;
}

interface SignMessageStepProps {
	userScore: number | null;
	onSign: () => void;
	isSigning: boolean;
	isVerified: boolean;
}

interface LoadingStepProps {
	message?: string;
}

// New component for wallet connection step
const ConnectWalletStep: React.FC<ConnectWalletStepProps> = ({ onConnect, sessionId }) => (
	<div className="step">
		<h2>Connect Wallet</h2>
		<p>Connect your Ethereum wallet to begin.</p>
		<Button 
			variant="purple" 
			onClick={onConnect} 
			disabled={!sessionId}
		>
			Connect Wallet
		</Button>
	</div>
);

// New component for insufficient score state
const InsufficientScoreStep: React.FC<InsufficientScoreStepProps> = ({ userScore, minimumScore }) => (
	<div className="step">
		<h2 style={{ color: 'var(--error-color)' }}>Verification Failed</h2>
		<p>Your Human Passport score ({userScore ?? 'N/A'}) did not meet the minimum requirement ({minimumScore}).</p>
		<p className="mt-2">Improve your score and try again.</p>
		<Button
			variant="purple"
			className="mt-4"
			onClick={() => window.open('https://app.passport.xyz', '_blank')}
		>
			Go to Gitcoin Dashboard
		</Button>
	</div>
);

// New component for signature step
const SignMessageStep: React.FC<SignMessageStepProps> = ({ userScore, onSign, isSigning, isVerified }) => (
	<div className="step">
		<h2>{isVerified ? "" : "Sign Message"}</h2>
		
		{isVerified ? (
			<div className="verification-success">
				<h2>Verification Successful!</h2>
				<p>You have been successfully verified. This window will close automatically.</p>
			</div>
		) : (
			<>
				<p>Your score is {userScore}. Sign the message to verify wallet ownership.</p>
				<Button 
					variant="purple" 
					onClick={onSign} 
					disabled={isSigning}
				>
					{isSigning ? (
						<>
							<Spinner /> <span className="ml-2">Signing...</span>
						</>
					) : (
						"Sign Message"
					)}
				</Button>
			</>
		)}
	</div>
);

// Loading component
const LoadingStep: React.FC<LoadingStepProps> = ({ message = "Checking your Human Passport score..." }) => (
	<div className="step">
		<div className="flex items-center justify-center">
			<Spinner /> 
			<span className="ml-2">{message}</span>
		</div>
	</div>
);

// Main component
const PassportVerificationApp: React.FC = () => {
	const {
		sessionId,
		userScore,
		isScoreSufficient,
		scoreCheckComplete,
		scoreCheckError,
		isSigning,
		isVerified,
		isConnected,
		address,
		connectWallet,
		handleSignMessage,
		minimumScore,
	} = usePassportVerification();

	// Check if the initial session ID load failed
	if (sessionId === null && scoreCheckError) {
		return (
			<div className="container">
				<div className="card">
					<h1 style={{ color: 'var(--error-color)' }}>Initialization Error</h1>
					<p>{scoreCheckError}</p>
					<p className="mt-2">Please ensure you accessed this page using the link provided in Discord.</p>
				</div>
			</div>
		);
	}

	// Determine which component to render based on the current state
	const renderCurrentStep = () => {
		// Not connected - show connect wallet step
		if (!isConnected || !address) {
			return <ConnectWalletStep onConnect={connectWallet} sessionId={sessionId} />;
		}
		
		// Connected but score check in progress - show loading
		if (!scoreCheckComplete && !scoreCheckError) {
			return <LoadingStep />;
		}
		
		// Error checking score
		if (scoreCheckError) {
			return (
				<div className="step">
					<h2 style={{ color: 'var(--error-color)' }}>Verification Error</h2>
					<p style={{ color: 'var(--error-color)' }}>Error: {scoreCheckError}</p>
				</div>
			);
		}
		
		// Score is insufficient
		if (isScoreSufficient === false) {
			return <InsufficientScoreStep userScore={userScore} minimumScore={minimumScore} />;
		}
		
		// Score is sufficient - show sign message step
		return (
			<SignMessageStep 
				userScore={userScore} 
				onSign={handleSignMessage} 
				isSigning={isSigning} 
				isVerified={isVerified}
			/>
		);
	};

	return (
		<div className="container">
			<div className="card">
				<h1>Human Passport Verification</h1>
				
				{renderCurrentStep()}
			</div>
		</div>
	);
};

export default PassportVerificationApp;
