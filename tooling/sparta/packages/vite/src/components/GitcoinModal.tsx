import { useEffect } from "react";
import { useSignatureVerification } from "../hooks/useSignatureVerification";
import { LoadingSpinner } from "./spinner";

interface GitcoinModalProps {
	isOpen: boolean;
	onClose: () => void;
	verificationId?: string;
	discordUserId?: string;
}

function GitcoinModal({ isOpen, onClose, verificationId }: GitcoinModalProps) {
	// --- Hooks ---
	const {
		signState,
		isLoading: isSigningLoading,
		sign,
		reset: resetSignState,
	} = useSignatureVerification({
		verificationId,
		isEnabled: isOpen,
	});

	// --- Effects ---

	useEffect(() => {
		console.log(signState);
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

	const handleSign = () => {
		sign();
	};

	// --- Render Logic ---

	const buttonBaseClass =
		"text-white px-6 py-3 rounded font-semibold transition-colors duration-200 w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed";
	const cardClass =
		"bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center";

	if (!isOpen) return null;

	const renderPrimaryButton = () => {
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
			return (
				<button
					onClick={handleSign}
					className={`${buttonBaseClass} bg-green-500 hover:bg-green-600`}
				>
					Sign Message & Verify
				</button>
			);
		}

		console.warn("RenderPrimaryButton: Reached unexpected fallback state.");
		return null;
	};

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

				<div className={`flex items-start mt-4`}>
					{signState !== "success" && (
						<button
							onClick={onClose}
							className={`text-gray-700 border border-gray-300 px-4 py-3 rounded font-semibold transition-colors duration-200 hover:bg-gray-100 text-lg`}
							disabled={isSigningLoading}
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
