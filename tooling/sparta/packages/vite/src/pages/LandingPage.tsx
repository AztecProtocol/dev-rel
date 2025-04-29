import { useState } from "react";
import { useAccount } from "wagmi";
import ProviderCard from "../components/ProviderCard";
import GitcoinModal from "../components/GitcoinModal";
import { StyledConnectButton, Button } from "../components/button";
import { useSearchParams } from "react-router-dom";

function LandingPage() {
	const [verificationMethod, setVerificationMethod] = useState<string | null>(
		null
	);
	const { address } = useAccount();
	const [searchParams] = useSearchParams();
	const verificationId = searchParams.get("verificationId");

	const handleGitcoinSelect = () => {
		setVerificationMethod("gitcoin");
	};

	return (
		<div className="flex flex-col items-center w-full fade-in">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 w-full max-w-4xl mt-6">
				<ProviderCard
					title="Gitcoin Passport"
					description="Connect your wallet and verify your Gitcoin Passport score"
					onSelectClick={handleGitcoinSelect}
					button={
						!address ? (
							<StyledConnectButton />
						) : (
							<Button
								onClick={() => setVerificationMethod("gitcoin")}
							>
								Verify
							</Button>
						)
					}
					icon="/passportIcon.png"
					className="h-full"
				/>
				<ProviderCard
					title="Do the work bro"
					description="Don't want to connect your wallet? Do some Proof of Work instead!"
					linkTo="/pow"
					icon="/powIcon.png"
					disabled={true}
					className="h-full"
				/>
			</div>

			{/* Show GitcoinModal only when wallet is connected and verification method is gitcoin */}
			{address && verificationId && verificationMethod === "gitcoin" && (
				<GitcoinModal
					isOpen={true}
					onClose={() => setVerificationMethod(null)}
					verificationId={verificationId}
				/>
			)}
		</div>
	);
}

export default LandingPage;
