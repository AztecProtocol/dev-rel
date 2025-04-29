import { useState, useEffect, useContext } from "react";
import { ApiContext } from "../contexts/apiContext";
import type { Components } from "../api/generated";

// --- Types ---
// Assume ScoreResponse type includes user and humanPassport status
type ScoreResponseType = Components.Schemas.ScoreResponse & {
	user?: {
		humanPassport?: {
			status?: string | null;
		} | null;
	} | null;
};

// Define the possible combined verification statuses
export type VerificationStatus =
	| "idle"
	| "new_user_invalid"
	| "new_user_valid"
	| "existent_user_valid"
	| "existent_user_invalid";

interface ScoreData {
	score: number;
	minimumScore: number;
}

interface ApiErrorResponse {
	error?: string;
}
// -------------

interface UseGetScoreProps {
	address?: string;
	verificationId?: string;
	isEnabled: boolean; // Control *if* the hook can fetch (manual trigger still needed)
}

interface UseGetScoreReturn {
	scoreData: ScoreData | null;
	verificationStatus: VerificationStatus;
	// isScoreValid: boolean | null; // Removed, replaced by verificationStatus
	isLoading: boolean;
	error: string | null;
	fetchScore: () => Promise<void>; // Function to manually trigger fetch
}

/**
 * Hook to fetch the Gitcoin score and determine combined user/score status.
 */
export function useGetScore({
	address,
	verificationId,
	isEnabled,
}: UseGetScoreProps): UseGetScoreReturn {
	const [scoreData, setScoreData] = useState<ScoreData | null>(null);
	const [verificationStatus, setVerificationStatus] =
		useState<VerificationStatus>("idle");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const client = useContext(ApiContext);

	const fetchScore = async () => {
		if (!isEnabled || !address || !verificationId || !client) {
			// Only set error if manually triggered with missing params
			// setError(
			//     "Cannot fetch score: Hook disabled or missing address, verificationId, or API client."
			// );
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);
		setScoreData(null); // Reset data before fetching
		setVerificationStatus("idle"); // Reset status

		try {
			const response = await client.getScore({
				address: address,
				verificationId: verificationId,
			});

			if (response.status === 200 && response.data) {
				// Explicitly type assertion based on expected new structure
				const responseData = response.data as ScoreResponseType;

				console.log("responseData", responseData);

				const score = responseData.score ?? 0;
				const minScore = responseData.minimumScore ?? 0;
				const isSufficient = responseData.success; // Use the success field from backend
				// Determine if user is new based on humanPassport status presence/value
				// Assuming null/undefined/empty status means new for this check context
				const isNewUser =
					!responseData.user?.humanPassport?.status ||
					responseData.user.humanPassport.status === "NONE"; // Adjust 'NONE' if needed

				setScoreData({
					score: score,
					minimumScore: minScore,
				});

				// Determine final status string
				if (isNewUser) {
					setVerificationStatus(
						isSufficient ? "new_user_valid" : "new_user_invalid"
					);
				} else {
					setVerificationStatus(
						isSufficient
							? "existent_user_valid"
							: "existent_user_invalid"
					);
				}
				setError(null);
			} else {
				console.warn(
					`Score check failed (${response.status}) or returned no data.`,
					response
				);
				// Use the defined type for error parsing
				const errorBody = response.data as ApiErrorResponse | undefined;
				const errorMsg =
					errorBody?.error ||
					`Score check failed (${response.status}).`;
				setError(errorMsg);
				setScoreData(null);
				setVerificationStatus("idle"); // Reset on error
			}
		} catch (err) {
			console.error("Error fetching score:", err);
			setError(
				err instanceof Error
					? err.message
					: "An unexpected error occurred fetching score."
			);
			setScoreData(null);
			setVerificationStatus("idle"); // Reset on error
		} finally {
			setIsLoading(false);
		}
	};

	// Reset state if the hook is disabled or key inputs change
	useEffect(() => {
		if (!isEnabled) {
			setIsLoading(false);
			setError(null);
			setScoreData(null);
			setVerificationStatus("idle");
		}
	}, [isEnabled, address, verificationId]);

	return {
		scoreData,
		verificationStatus,
		isLoading,
		error,
		fetchScore,
	};
}
