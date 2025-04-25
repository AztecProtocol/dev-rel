import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';
import { useSignMessage } from 'wagmi';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

// Constants and Types (Consider moving SessionData type to a shared location if used elsewhere)
const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";
const MINIMUM_SCORE = Number(import.meta.env.VITE_MINIMUM_SCORE || 0);
const API_BASE_URL = import.meta.env.VITE_PUBLIC_FRONTEND_URL ? `${import.meta.env.VITE_PUBLIC_FRONTEND_URL}/api` : '/api';

interface SessionData {
    sessionId: string;
    walletConnected: boolean;
    walletAddress: string | null;
    verified: boolean;
    status: string;
    score: number | null;
    lastScoreTimestamp: number | null;
}

interface UsePassportVerificationReturn {
    sessionId: string | null;
    sessionData: SessionData | null;
    userScore: number | null;
    isScoreSufficient: boolean | null;
    scoreCheckComplete: boolean;
    scoreCheckError: string | null;
    isSigning: boolean;
    isVerified: boolean;
    isConnected: boolean;
    address: `0x${string}` | undefined;
    connectWallet: () => void;
    handleSignMessage: () => void;
    minimumScore: number;
}

export const usePassportVerification = (): UsePassportVerificationReturn => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [isSigning, setIsSigning] = useState<boolean>(false);
    const [userScore, setUserScore] = useState<number | null>(null);
    const [scoreCheckComplete, setScoreCheckComplete] = useState<boolean>(false);
    const [scoreCheckError, setScoreCheckError] = useState<string | null>(null);
    const [isScoreSufficient, setIsScoreSufficient] = useState<boolean | null>(null);

    const { isConnected } = useAppKitAccount();
    const { open: openAppKit } = useAppKit();
    const { address } = useAccount();
    const { data: signature, signMessage, reset: resetSignature } = useSignMessage();

    const isVerified = sessionData?.verified ?? false;

    // 1. Get session ID from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const session = urlParams.get('sessionId');
        if (session) {
            setSessionId(session);
        } else {
            console.error("Session ID not found in URL.");
            setScoreCheckError("Session ID missing from URL. Cannot proceed."); // Set an error state
        }
    }, []);

    // 2. Fetch initial session data (optional, as /score might suffice)
    //    Kept for potential future use or if initial status is needed.
    useEffect(() => {
        const fetchSessionData = async () => {
            if (!sessionId) return;
            // Reset score states if session ID changes
            setUserScore(null);
            setScoreCheckComplete(false);
            setIsScoreSufficient(null);
            setScoreCheckError(null);
            setSessionData(null); // Reset session data too

            try {
                console.log(`Fetching session data for ${sessionId}...`);
                const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
                if (response.data.success) {
                    console.log("Session data fetched:", response.data);
                    setSessionData(response.data);
                } else {
                    console.error("Error fetching session data:", response.data.error);
                    setScoreCheckError(response.data.error || "Failed to fetch session data.");
                }
            } catch (error) {
                console.error("Network error fetching session data:", error);
                setScoreCheckError("Could not connect to the server to fetch session data.");
            }
        };
        fetchSessionData();
    }, [sessionId]);


    // 3. Fetch score when wallet connects and session is ready
    useEffect(() => {
        const fetchScore = async () => {
            if (isConnected && address && sessionId && !scoreCheckComplete && !sessionData?.verified) {
                console.log(`Wallet connected (${address}), fetching score for session ${sessionId}...`);
                setScoreCheckError(null);
                // Ensure previous signature state is cleared if user reconnects/changes address
                resetSignature();
                try {
                    const response = await axios.get(`${API_BASE_URL}/score`, {
                        params: { sessionId, address }
                    });

                    if (response.data.success !== undefined) { // Check existence of success field
                        const score = response.data.score;
                        const sufficient = response.data.success; // Backend success means score is sufficient
                        const status = response.data.status;

                        console.log("Score check response:", response.data);
                        setUserScore(score ?? null); // Handle potentially null score
                        setIsScoreSufficient(sufficient);

                        if (!sufficient && status === 'verification_failed_score') {
                            console.log("Score insufficient based on backend check.");
                        } else if (!sufficient) {
                            // Handle other potential non-success scenarios from backend if needed
                            console.error("Backend indicated non-success but status wasn't 'verification_failed_score':", status);
                            setScoreCheckError(response.data.error || "Score check failed.");
                        }

                    } else {
                         // Handle case where backend response format is unexpected
                        console.error("Error fetching score: Unexpected response format", response.data);
                        setScoreCheckError(response.data.error || "Failed to retrieve score - unexpected response.");
                    }
                } catch (error: any) {
                    console.error("Network error fetching score:", error);
                     // Handle specific axios error responses if available
                    const errMsg = error.response?.data?.error || "Could not connect to the server to check score.";
                    setScoreCheckError(errMsg);
                     if (error.response?.status === 403) {
                        // Specific handling for address mismatch or other forbidden errors
                        console.warn("Score check forbidden. Address likely doesn't match session.");
                    }
                } finally {
                    setScoreCheckComplete(true);
                }
            }
        };

        fetchScore();
    }, [isConnected, address, sessionId, scoreCheckComplete, sessionData?.verified, resetSignature]);


    // 4. Verify signature after user signs
    useEffect(() => {
        const verifySignature = async () => {
            // Only run if we have a signature, session, and the score *was* deemed sufficient
            if (!signature || !sessionId || isScoreSufficient !== true) return;

            console.log(`Verifying signature for session ${sessionId}...`);
            setIsSigning(true);
            try {
                const response = await axios.post(`${API_BASE_URL}/verify`, {
                    signature,
                }, { params: { sessionId } });

                const data = response.data;
                console.log("Signature verification response:", data);

                // Refresh session data after verification to get final status
                const sessionResponse = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
                if (sessionResponse.data.success) {
                    setSessionData(sessionResponse.data); // Update session data with final state
                    // Check final verification status from the updated session data
                    if (sessionResponse.data.verified) {
                         console.log("Verification process fully complete and verified.");
                    } else {
                         // This case might happen if something failed between score check and final verification
                         console.warn("Verification process completed but final status is not verified.");
                         setIsScoreSufficient(false); // Correct the state if final check failed
                         setScoreCheckError("Verification failed after signing.");
                    }
                } else {
                     // Handle error fetching final session data
                     console.error("Failed to fetch final session data after verification.");
                      setScoreCheckError("Could not confirm final verification status.");
                }

            } catch (error: any) {
                console.error("Error verifying signature:", error);
                const errMsg = error.response?.data?.error || "Server error during signature verification.";
                setScoreCheckError(errMsg);
                // Optionally reset signature state if verification fails server-side?
                // resetSignature();
            } finally {
                setIsSigning(false);
            }
        };

        verifySignature();
    }, [signature, sessionId, isScoreSufficient, resetSignature]); // Add resetSignature dependency?

    // 5. Effect to auto-close window
    useEffect(() => {
        let timer: NodeJS.Timeout | number | undefined;
        // Only close automatically if verification was successful
        const shouldClose = isVerified; 

        if (shouldClose) {
            const message = "Verification successful";
            console.log(`${message}, closing window in 5 seconds...`);
            timer = setTimeout(() => {
                window.close();
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isVerified]);

    // --- Callback Functions ---

    const connectWallet = useCallback(() => {
        openAppKit();
    }, [openAppKit]);

    const handleSignMessage = useCallback(() => {
        if (!isScoreSufficient) {
            console.warn("Attempted to sign message when score is insufficient.");
            return;
        }
        setIsSigning(true);
        signMessage({ message: VERIFICATION_MESSAGE }, {
            // onSuccess is handled by the verifySignature useEffect
            onError: (error) => {
                console.error("Error signing message:", error);
                setIsSigning(false); // Reset signing state on error
                // Optionally set a specific error message for signing failure
                setScoreCheckError("Failed to sign message. Please try again.");
            },
            onSettled: () => {
                 // Note: isSigning is set to true above, and will be set to false
                 // in the verifySignature effect's finally block after backend call.
                 // If immediate feedback is needed *before* backend call completes,
                 // this might need adjustment, but verifySignature handles the loading state.
            }
        });
    }, [signMessage, isScoreSufficient]);


    return {
        sessionId,
        sessionData,
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
        minimumScore: MINIMUM_SCORE,
    };
}; 
