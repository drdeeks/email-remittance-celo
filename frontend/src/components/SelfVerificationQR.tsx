"use client"

/**
 * Self Protocol Verification QR Code Component
 * 
 * Enterprise-grade verification component with:
 * - Dynamic QR code generation
 * - Verification status tracking
 * - Error handling
 * - Responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { selfVerificationService } from '@/services/selfVerification.service';
import { logger } from '@/utils/logger';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface SelfVerificationQRProps {
  userId: string;
  remittanceId: string;
  amount: number;
  onVerificationSuccess: () => void;
  onVerificationFailure: (error: string) => void;
}

const SelfVerificationQR: React.FC<SelfVerificationQRProps> = ({
  userId,
  remittanceId,
  amount,
  onVerificationSuccess,
  onVerificationFailure,
}) => {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'scanned' | 'verified' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isHighValue, setIsHighValue] = useState(false);

  // Check if this is a high-value transaction
  useEffect(() => {
    const highValueThreshold = parseFloat(process.env.NEXT_PUBLIC_HIGH_VALUE_THRESHOLD || '100');
    setIsHighValue(amount > highValueThreshold);
  }, [amount]);

  // Generate Self Protocol config
  const generateConfig = useCallback(async () => {
    try {
      setVerificationStatus('loading');
      setError(null);
      
      // Get verification config from backend
      const response = await fetch(`/api/self/config?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error(`Failed to get verification config: ${response.status}`);
      }
      
      const data = await response.json();
      setConfig(data.config);
      setVerificationStatus('idle');
      
      logger.info('Self Protocol config generated', { userId, remittanceId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate verification QR code: ${errorMessage}`);
      setVerificationStatus('failed');
      logger.error('Failed to generate Self Protocol config', { error: errorMessage, userId, remittanceId });
      onVerificationFailure(errorMessage);
    }
  }, [userId, remittanceId, onVerificationFailure]);

  // Start polling for verification status
  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/self/status?remittanceId=${encodeURIComponent(remittanceId)}`);
        if (!response.ok) {
          throw new Error(`Failed to check verification status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.verified) {
          setVerificationStatus('verified');
          clearInterval(interval);
          onVerificationSuccess();
          logger.info('Self Protocol verification successful', { userId, remittanceId });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to check verification status', { error: errorMessage, remittanceId });
      }
    }, 5000); // Poll every 5 seconds
    
    setPollingInterval(interval);
  }, [remittanceId, userId, onVerificationSuccess, pollingInterval]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Initialize verification process
  useEffect(() => {
    if (isHighValue) {
      generateConfig();
      startPolling();
    }
  }, [isHighValue, generateConfig, startPolling]);

  if (!isHighValue) {
    return null; // No verification needed for low-value transactions
  }

  if (verificationStatus === 'verified') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Verification Complete
          </CardTitle>
          <CardDescription>
            Your identity has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-green-600">
            You can now claim your remittance.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Verification Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={generateConfig} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Verification
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Preparing Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Identity Verification Required</CardTitle>
        <CardDescription>
          Scan this QR code with the Self app to verify your identity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-lg">
          <QRCodeCanvas
            value={JSON.stringify(config)}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-sm text-gray-600 text-center">
          This verification is required for high-value transactions.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for verification...
        </div>
      </CardFooter>
    </Card>
  );
};

SelfVerificationQR.displayName = 'SelfVerificationQR';

export default SelfVerificationQR;