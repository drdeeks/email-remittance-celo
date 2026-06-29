// Custom hook for verification operations
import { useState, useCallback } from 'react';

export interface UseVerificationResult {
  verifyIdentity: (request: any) => Promise<any>;
  isVerifying: boolean;
  verificationResult: any | null;
  error: string | null;
  resetVerification: () => void;
}

export function useVerification(): UseVerificationResult {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyIdentity = useCallback(async (request: any) => {
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      // Import here to avoid circular dependencies
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const result = await response.json();
      setVerificationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const resetVerification = useCallback(() => {
    setIsVerifying(false);
    setVerificationResult(null);
    setError(null);
  }, []);

  return {
    verifyIdentity,
    isVerifying,
    verificationResult,
    error,
    resetVerification
  };
}