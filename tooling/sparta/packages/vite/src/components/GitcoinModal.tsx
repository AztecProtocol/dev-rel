import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useSignatureVerification } from "../hooks/useSignatureVerification";
import { useGetScore } from "../hooks/useGetScore";
import { LoadingSpinner } from "./spinner";

interface GitcoinModalProps {
	isOpen: boolean;
	onClose: () => void;
	verificationId?: string;
	discordUserId?: string;
}

function GitcoinModal({ isOpen, onClose, verificationId }: GitcoinModalProps) {
	const { address } = useAccount();

	// --- Hooks ---

	const {
		scoreData,
		verificationStatus,
		isLoading: isScoreLoading,
		error: scoreError,
		fetchScore,
	} = useGetScore({
		address,
		verificationId,
		isEnabled: isOpen,
	});

	const {
		signState,
		verificationMessage: signVerificationMessage,
		isLoading: isSigningLoading,
		sign,
		reset: resetSignState,
	} = useSignatureVerification({
		verificationId,
		isEnabled: isOpen,
	});

	// --- Effects ---

	useEffect(() => {
		if (!isOpen) {
			resetSignState();
		}
	}, [isOpen, resetSignState]);

	useEffect(() => {
		let timeoutId: NodeJS.Timeout | null = null;
		if (signState === "success") {
			timeoutId = setTimeout(() => {
				onClose();
			}, 10000);
		}
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [signState, onClose]);

	// --- Event Handlers ---

	const handleCheckScore = async () => {
		if (!address || !verificationId) {
			console.error(
				"Missing required parameters: address or verificationId"
			);
			return;
		}
		await fetchScore();
	};

	const handleSign = () => {
		sign();
	};

	const handleImproveScore = () => {
		window.open("https://passport.gitcoin.co", "_blank");
		onClose();
	};

	const handleForceProceed = () => {
		sign();
	};

	// --- Render Logic ---

	const buttonBaseClass =
		"text-white px-6 py-3 rounded font-semibold transition-colors duration-200 w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed";
	const cardClass =
		"bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center";

	if (!isOpen) return null;

	const renderStatusMessage = () => {
		if (isScoreLoading || scoreError || verificationStatus === "idle") {
			return null;
		}

		switch (verificationStatus) {
			case "new_user_invalid":
				return "Your score doesn't meet the minimum requirement.";
			case "new_user_valid":
				return "Your score is sufficient! Sign the message to get your Discord role.";
			case "existent_user_invalid":
				return "This wallet doesn't meet the minimum score. Proceeding will replace your verified wallet and may result in role removal.";
			case "existent_user_valid":
				return "This wallet meets the score requirement. Proceeding will update your connected wallet.";
			default:
				return null;
		}
	};

	const getStatusMessageBgColor = () => {
		switch (verificationStatus) {
			case "new_user_invalid":
			case "existent_user_invalid":
				return "bg-yellow-100 text-yellow-800";
			case "new_user_valid":
			case "existent_user_valid":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const renderPrimaryButton = () => {
		if (isScoreLoading) {
			return <LoadingSpinner text="Checking score..." />;
		}
		if (isSigningLoading) {
			const loadingText =
				signState === "signing"
					? "Waiting for signature..."
					: "Verifying signature...";
			return <LoadingSpinner text={loadingText} />;
		}

		if (signState === "success") {
			return (
				<div className="flex justify-center items-center bg-green-100 text-green-700 px-6 py-3 rounded w-full text-lg">
					✓ Verification Complete
				</div>
			);
		}
		if (signState === "error" || signState === "cancelled") {
			return (
				<button
					onClick={handleSign}
					className={`${buttonBaseClass} ${
						signState === "error"
							? "bg-red-500 hover:bg-red-600"
							: "bg-yellow-500 hover:bg-yellow-600"
					}`}
				>
					Try Signing Again
				</button>
			);
		}

		if (signState === "idle") {
			if (scoreError) {
				return (
					<button
						onClick={handleCheckScore}
						className={`${buttonBaseClass} bg-red-500 hover:bg-red-600`}
					>
						Retry Score Check
					</button>
				);
			}

			switch (verificationStatus) {
				case "new_user_invalid":
					return (
						<button
							onClick={handleImproveScore}
							className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
						>
							Improve Score on Gitcoin
						</button>
					);
				case "new_user_valid":
					return (
						<button
							onClick={handleSign}
							className={`${buttonBaseClass} bg-green-500 hover:bg-green-600`}
						>
							Sign Message & Verify
						</button>
					);
				case "existent_user_invalid":
					return (
						<div className="flex gap-2 w-full">
							<button
								onClick={handleForceProceed}
								className={`${buttonBaseClass} bg-red-500 hover:bg-red-600 flex-1`}
							>
								Proceed Anyway
							</button>
							<button
								onClick={handleImproveScore}
								className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600 flex-1`}
							>
								Improve Score
							</button>
						</div>
					);
				case "existent_user_valid":
					return (
						<button
							onClick={handleSign}
							className={`${buttonBaseClass} bg-green-500 hover:bg-green-600`}
						>
							Update Wallet & Verify
						</button>
					);
				case "idle":
				default:
					return (
						<button
							onClick={handleCheckScore}
							className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
							disabled={!address || !verificationId}
						>
							Check Score & Verify
						</button>
					);
			}
		}

		console.warn("RenderPrimaryButton: Reached unexpected fallback state.");
		return null;
	};

	const primaryButtonContainerHeightClass =
		verificationStatus === "existent_user_invalid" && signState === "idle"
			? "h-auto"
			: "h-12";

	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
			<div className={cardClass}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-gray-800">
						Gitcoin Passport
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
						disabled={signState === "success"}
					>
						✕
					</button>
				</div>

				<div className="w-16 h-1 bg-blue-500 my-4 mx-auto rounded"></div>
				<p className="text-gray-600 mb-8">
					Verify your Gitcoin Passport score
				</p>

				{scoreData && !isScoreLoading && !scoreError && (
					<div className="mb-6 p-3 bg-gray-100 rounded-md">
						<p className="text-sm text-gray-700">
							Your score:{" "}
							<span className="font-bold">{scoreData.score}</span>
							<br />
							Required:{" "}
							<span className="font-bold">
								{scoreData.minimumScore}
							</span>
						</p>
					</div>
				)}

				{!isScoreLoading &&
					!scoreError &&
					verificationStatus !== "idle" && (
						<div
							className={`mb-6 p-3 ${getStatusMessageBgColor()} rounded-md`}
						>
							<p className="text-sm font-medium">
								{renderStatusMessage()}
							</p>
						</div>
					)}

				{signVerificationMessage && signState !== "idle" && (
					<div
						className={`mb-6 p-3 ${
							signState === "success"
								? "bg-green-100 text-green-800"
								: signState === "cancelled"
								? "bg-yellow-100 text-yellow-800"
								: signState === "error"
								? "bg-red-100 text-red-800"
								: "bg-blue-100 text-blue-800"
						} rounded-md`}
					>
						<p className="text-sm">{signVerificationMessage}</p>
					</div>
				)}

				{scoreError && !isScoreLoading && (
					<div className="mb-6 p-3 bg-red-100 text-red-800 rounded-md">
						<p className="text-sm">Error: {scoreError}</p>
					</div>
				)}

				<div
					className={`flex items-start mt-4 ${primaryButtonContainerHeightClass}`}
				>
					{signState !== "success" && (
						<button
							onClick={onClose}
							className={`text-gray-700 border border-gray-300 px-4 py-3 rounded font-semibold transition-colors duration-200 hover:bg-gray-100 text-lg ${
								primaryButtonContainerHeightClass === "h-auto"
									? "w-1/4"
									: "w-1/3"
							}`}
							disabled={isScoreLoading || isSigningLoading}
						>
							Back
						</button>
					)}

					<div
						className={`flex-grow ${
							signState !== "success" ? "ml-4" : "w-full"
						}`}
					>
						{renderPrimaryButton()}
					</div>
				</div>
			</div>
		</div>
	);
}

export default GitcoinModal;
