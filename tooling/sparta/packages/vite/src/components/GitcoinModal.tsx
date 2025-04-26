import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { passportService } from '../api/services';
import { VERIFICATION_MESSAGE } from '@sparta/utils';

type VerificationState = 'idle' | 'loading' | 'success' | 'failure';
type SignState = 'idle' | 'signing' | 'verifying' | 'success' | 'error' | 'cancelled';

interface GitcoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

function GitcoinModal({ isOpen, onClose, sessionId }: GitcoinModalProps) {
  const [state, setState] = useState<VerificationState>('idle');
  const [signState, setSignState] = useState<SignState>('idle');
  const [scoreData, setScoreData] = useState<{ score: number; minimumScore: number } | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const { address } = useAccount();
  const { signMessage, isPending: isSignPending, data: signData, error: signError } = useSignMessage();

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setSignState('idle');
      setScoreData(null);
      setVerificationMessage(null);
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
      if (signData && signState === 'signing' && sessionId) {
        try {
          setSignState('verifying');
          
          // Call the verify endpoint with the signature
          const response = await passportService.verifySignature(signData, sessionId);
          
          if (response.success) {
            setSignState('success');
            setVerificationMessage('Verification successful! This modal will close in 10 seconds.');
          } else {
            setSignState('error');
            setVerificationMessage(response.message || 'Verification failed. Please try again.');
          }
        } catch (error) {
          console.error('Error verifying signature:', error);
          setSignState('error');
          setVerificationMessage('An error occurred during verification. Please try again.');
        }
      }
    };
    
    verifySignature();
  }, [signData, signState, sessionId]);

  const handleVerify = async () => {
    if (!address || !sessionId) {
      console.error("Missing required parameters: address or sessionId");
      setState('failure');
      return;
    }

    setState('loading');
    
    try {
      // Use the API service to get the passport score
      const response = await passportService.getScore(address, sessionId);
      
      // Store score data for display
      setScoreData({
        score: response.score,
        minimumScore: response.minimumScore
      });
      
      // Success is determined by whether the score meets the minimum threshold
      setState(response.success ? 'success' : 'failure');
      
      console.log('Score check response:', response);
    } catch (error) {
      console.error('Error verifying score:', error);
      setState('failure');
    }
  };

  const handleSign = async () => {
    if (!address || !sessionId) {
      console.error("Missing required parameters: address or sessionId");
      return;
    }
    
    setSignState('signing');  
    
    // Trigger the signature request
    signMessage({ message: VERIFICATION_MESSAGE });
  };

  const handleImproveScore = () => {
    // Placeholder for improve score logic
    window.open('https://passport.gitcoin.co', '_blank');
    onClose();
  };

  // Common button style
  const buttonBaseClass = "text-white px-6 py-3 rounded font-semibold transition-colors duration-200 w-full text-lg";
  // Common card style
  const cardClass = "bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center";

  if (!isOpen) return null;

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
        
        {/* Verification message */}
        {verificationMessage && (
          <div className={`mb-6 p-3 ${signState === 'success' ? 'bg-green-100' : signState === 'cancelled' ? 'bg-yellow-100' : 'bg-red-100'} rounded-md`}>
            <p className="text-sm">{verificationMessage}</p>
          </div>
        )}

        {/* Conditional Button Rendering */} 
        <div className="h-12 flex gap-4"> {/* Changed to flex with gap */}
          {/* Back button - always present */}
          <button
            onClick={onClose}
            className="text-gray-700 border border-gray-300 px-4 py-3 rounded font-semibold transition-colors duration-200 hover:bg-gray-100 w-1/3 text-lg"
          >
            Back
          </button>
          
          {/* Primary action button */}
          <div className="w-2/3">
            {state === 'idle' && (
              <button
                onClick={handleVerify}
                className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
                disabled={!address || !sessionId}
              >
                Verify
              </button>
            )}

            {state === 'loading' && (
              <div className="flex justify-center items-center bg-gray-200 text-gray-700 px-6 py-3 rounded w-full text-lg">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </div>
            )}

            {(state === 'success' && (signState === 'idle' || signState === 'cancelled')) && (
              <button
                onClick={handleSign}
                className={`${buttonBaseClass} bg-green-600 hover:bg-green-700`}
              >
                Sign
              </button>
            )}
            
            {(signState === 'signing' || signState === 'verifying') && (
              <button
                disabled
                className={`${buttonBaseClass} bg-green-600 flex justify-center items-center`}
              >
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {signState === 'signing' ? 'Signing...' : 'Verifying...'}
              </button>
            )}
            
            {signState === 'error' && (
              <button
                onClick={onClose}
                className={`${buttonBaseClass} bg-red-600 hover:bg-red-700`}
              >
                Back
              </button>
            )}

            {state === 'failure' && signState === 'idle' && (
              <button
                onClick={handleImproveScore}
                className={`${buttonBaseClass} bg-red-600 hover:bg-red-700`}
              >
                Improve Score
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitcoinModal; 
