import React, { useState, useEffect, useContext } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { VERIFICATION_MESSAGE } from '@sparta/utils';
import { ApiContext } from '../providers/apiProvider';


type VerificationState = 'idle' | 'loading' | 'status-loading' | 'score-loading' | 'success' | 'failure';
type SignState = 'idle' | 'signing' | 'verifying' | 'success' | 'error' | 'cancelled';
type UserState = 'new' | 'existing-verified' | 'existing-unverified';

interface GitcoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificationId?: string;
  discordUserId?: string;
}

interface UserStatus {
  walletConnected: boolean;
  verified: boolean;
  roleAssigned: boolean;
  score: number | null;
  minimumRequiredScore: number;
  highScoreThreshold: number;
  isHighScorer: boolean;
}

function GitcoinModal({ isOpen, onClose, verificationId }: GitcoinModalProps) {
  const [state, setState] = useState<VerificationState>('idle');
  const [signState, setSignState] = useState<SignState>('idle');
  const [userState, setUserState] = useState<UserState>('new');
  const [scoreData, setScoreData] = useState<{ score: number; minimumScore: number } | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const { address } = useAccount();
  const { signMessage, isPending: isSignPending, data: signData, error: signError } = useSignMessage();
  const client = useContext(ApiContext);


  useEffect(() => {
  // narrow to function‐valued keys
  const fnKeys = Object
    .getOwnPropertyNames(client)
    .filter(k => typeof (client as any)[k] === 'function');

  console.log('Available operations:', fnKeys);
}, [client]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setSignState('idle');
      setUserState('new');
      setScoreData(null);
      setVerificationMessage(null);
      setUserStatus(null);
    }
  }, [isOpen]);
  
  // Effect to handle success state auto-close
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (signState === 'success') {
      timeoutId = setTimeout(() => {
        window.close();
      }, 10000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [signState, onClose]);
  
  // Effect to detect signature cancellation
  useEffect(() => {
    if (signError && signState === 'signing') {
      setSignState('cancelled');
      setVerificationMessage('Cancelled signing. Please try again.');
    }
  }, [signError, signState]);
  
  // Effect to call verify endpoint once signature is available
  useEffect(() => {
    const verifySignature = async () => {
      if (signData && signState === 'signing' && verificationId) {
        try {
          setSignState('verifying');
          
          // Call the verify endpoint with the signature
          const response = await client.verifySignature(signData, verificationId);
          
          if (response.status === 200) {
            setSignState('success');
            setVerificationMessage('Verification successful! This modal will close in 10 seconds.');
          } else {
            setSignState('error');
            setVerificationMessage(response.data.message || 'Verification failed. Please try again.');
          }
        } catch (error) {
          console.error('Error verifying signature:', error);
          setSignState('error');
          setVerificationMessage('An error occurred during verification. Please try again.');
        }
      }
    };
    
    verifySignature();
  }, [signData, signState, verificationId]);

  // Check user status first, then proceed to score verification
  const handleVerify = async () => {
    if (!address || !verificationId || !verificationId) {
      console.error("Missing required parameters: address, verificationId, or discordUserId");
      setState('failure');
      return;
    }

    setState('status-loading');
    
    try {
      // First, check if the user already exists with a wallet
      const statusResponse = await client.getStatusByVerificationId(verificationId);
      
      if (statusResponse.status === 200) {
        setUserStatus({
          walletConnected: statusResponse.data.walletConnected || false,
          verified: statusResponse.data.verified || false,
          roleAssigned: statusResponse.data.roleAssigned || false,
          score: statusResponse.data.score ?? null,
          minimumRequiredScore: statusResponse.data.minimumRequiredScore || 0,
          highScoreThreshold: statusResponse.data.highScoreThreshold || 0,
          isHighScorer: statusResponse.data.isHighScorer || false
        });

        // Determine if the user is new or existing
        if (statusResponse.data.walletConnected) {
          if (statusResponse.data.verified) {
            setUserState('existing-verified');
          } else {
            setUserState('existing-unverified');
          }
        } else {
          setUserState('new');
        }
      } else {
        // If status check fails, assume new user
        setUserState('new');
      }

      // Now proceed to score check
      setState('score-loading');
      
      // Use the API service to get the passport score for the new wallet
      const scoreResponse = await client.getScore(address, verificationId);
      
      // Store score data for display
      setScoreData({
        score: scoreResponse.data.score || 0,
        minimumScore: scoreResponse.data.minimumScore || 0
      });
      
      // Set state based on score success
      setState(scoreResponse.status === 200 ? 'success' : 'failure');
      
      console.log('Score check response:', scoreResponse);
    } catch (error) {
      console.error('Error during verification process:', error);
      setState('failure');
    }
  };

  const handleSign = async () => {
    if (!address || !verificationId) {
      console.error("Missing required parameters: address or verificationId");
      return;
    }
    
    setSignState('signing');  
    
    // Trigger the signature request
    signMessage({ message: VERIFICATION_MESSAGE });
  };

  const handleImproveScore = () => {
    window.open('https://passport.gitcoin.co', '_blank');
    onClose();
  };

  const handleForceProceed = () => {
    // Force proceed with verification despite low score
    if (address && verificationId) {
      setSignState('signing');
      signMessage({ message: VERIFICATION_MESSAGE });
    }
  };

  // Common button style
  const buttonBaseClass = "text-white px-6 py-3 rounded font-semibold transition-colors duration-200 w-full text-lg";
  // Common card style
  const cardClass = "bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center";

  if (!isOpen) return null;

  // Helper function to render the appropriate message based on user state and score
  const renderStatusMessage = () => {
    if (!scoreData) return null;
    
    if (userState === 'existing-verified') {
      if (scoreData.score < scoreData.minimumScore) {
        return "Your new wallet doesn't meet the minimum Human score requirement. Proceeding may result in role removal.";
      } else {
        return "Your new wallet was assigned to an existing verified user. Update your wallet address?";
      }
    } else if (userState === 'existing-unverified') {
      if (scoreData.score < scoreData.minimumScore) {
        return "Your score doesn't meet the minimum requirement.";
      } else {
        return "Your Discord role is on the way!";
      }
    } else { // new user
      if (scoreData.score < scoreData.minimumScore) {
        return "Your score doesn't meet the minimum requirement.";
      } else {
        return "Your Discord role is on the way!";
      }
    }
  };

  // Helper function to render the appropriate primary button based on state
  const renderPrimaryButton = () => {
    if (state === 'idle') {
      console.log(address, verificationId, verificationId);
      return (
        <button
          onClick={handleVerify}
          className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
          disabled={!address || !verificationId || !verificationId}
        >
          Verify
        </button>
      );
    }

    if (state === 'status-loading' || state === 'score-loading') {
      return (
        <div className="flex justify-center items-center bg-gray-200 text-gray-700 px-6 py-3 rounded w-full text-lg">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      );
    }

    if (state === 'success') {
      // For success state, handle different user scenarios
      if (signState === 'idle') {
        if (userState === 'existing-verified' && scoreData && scoreData.score >= scoreData.minimumScore) {
          return (
            <button
              onClick={handleSign}
              className={`${buttonBaseClass} bg-green-500 hover:bg-green-600`}
            >
              Update
            </button>
          );
        } else {
          return (
            <button
              onClick={handleSign}
              className={`${buttonBaseClass} bg-green-500 hover:bg-green-600`}
            >
              Sign Message
            </button>
          );
        }
      }
    }

    if (state === 'failure') {
      // For failure state, handle different user scenarios
      if (userState === 'existing-verified' && scoreData && scoreData.score < scoreData.minimumScore) {
        return (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleForceProceed}
              className={`${buttonBaseClass} bg-red-500 hover:bg-red-600 flex-1`}
            >
              Proceed
            </button>
            <button
              onClick={handleImproveScore}
              className={`${buttonBaseClass} bg-green-500 hover:bg-green-600 flex-1`}
            >
              Improve Score
            </button>
          </div>
        );
      } else {
        return (
          <button
            onClick={handleImproveScore}
            className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
          >
            Improve Score
          </button>
        );
      }
    }

    if (signState === 'cancelled') {
      return (
        <button
          onClick={handleSign}
          className={`${buttonBaseClass} bg-yellow-500 hover:bg-yellow-600`}
        >
          Try Again
        </button>
      );
    }
    
    if (signState === 'error') {
      return (
        <button
          onClick={handleSign}
          className={`${buttonBaseClass} bg-red-500 hover:bg-red-600`}
        >
          Try Again
        </button>
      );
    }
    
    if (signState === 'signing' || signState === 'verifying') {
      return (
        <div className="flex justify-center items-center bg-gray-200 text-gray-700 px-6 py-3 rounded w-full text-lg">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {signState === 'signing' ? 'Waiting for signature...' : 'Verifying signature...'}
        </div>
      );
    }
    
    if (signState === 'success') {
      return (
        <div className="flex justify-center items-center bg-green-100 text-green-700 px-6 py-3 rounded w-full text-lg">
          ✓ Verification Complete
        </div>
      );
    }

    // Default case
    return null;
  };

  return (
    // Modal overlay
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      {/* Modal content */}
      <div className={cardClass}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Gitcoin Passport</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* Wavy line */}
        <div className="w-16 h-1 bg-blue-500 my-4 mx-auto rounded"></div> 
        <p className="text-gray-600 mb-8">Verify your Gitcoin Passport score</p>

        {/* Score display when available */}
        {scoreData && (state === 'success' || state === 'failure') && (
          <div className="mb-6 p-3 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">
              Your score: <span className="font-bold">{scoreData.score}</span> 
              <br/>
              Required: <span className="font-bold">{scoreData.minimumScore}</span>
            </p>
          </div>
        )}
        
        {/* Status message */}
        {scoreData && (state === 'success' || state === 'failure') && (
          <div className={`mb-6 p-3 ${state === 'success' ? 'bg-green-100' : 'bg-yellow-100'} rounded-md`}>
            <p className="text-sm font-medium">{renderStatusMessage()}</p>
          </div>
        )}
        
        {/* Verification message */}
        {verificationMessage && (
          <div className={`mb-6 p-3 ${signState === 'success' ? 'bg-green-100' : signState === 'cancelled' ? 'bg-yellow-100' : 'bg-red-100'} rounded-md`}>
            <p className="text-sm">{verificationMessage}</p>
          </div>
        )}

        {/* Conditional Button Rendering */} 
        <div className={`${(userState === 'existing-verified' && state === 'failure') ? 'h-auto' : 'h-12'} flex gap-4`}>
          {/* Back button - always present */}
          <button
            onClick={onClose}
            className="text-gray-700 border border-gray-300 px-4 py-3 rounded font-semibold transition-colors duration-200 hover:bg-gray-100 w-1/3 text-lg"
          >
            Back
          </button>
          
          {/* Primary action button */}
          <div className="w-2/3">
            {renderPrimaryButton()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitcoinModal; 
