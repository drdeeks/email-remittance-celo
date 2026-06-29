import React, { useState } from 'react';
import { useVerification } from '../hooks/useVerification';

export interface VerificationChoiceProps {
  userId: string;
  onVerificationComplete: (result: any) => void;
  onVerificationMethodSelect?: (method: 'NONE' | 'SELF' | 'WORLDID') => void;
  requireVerification?: boolean;
}

export const VerificationChoice: React.FC<VerificationChoiceProps> = ({
  userId,
  onVerificationComplete,
  onVerificationMethodSelect,
  requireVerification = false
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'NONE' | 'SELF' | 'WORLDID' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { verifyIdentity, isVerifying, verificationResult } = useVerification();

  const verificationMethods = [
    {
      id: 'NONE',
      title: 'No Verification',
      description: 'Skip verification for this transaction',
      icon: '🔓',
      benefits: ['Fastest processing', 'No privacy concerns', 'Instant approval'],
      color: '#4CAF50'
    },
    {
      id: 'SELF',
      title: 'Self Protocol',
      description: 'Identity verification using Self Protocol',
      icon: '🏛️',
      benefits: ['Standard verification', 'Trusted provider', 'Multiple document types'],
      color: '#2196F3'
    },
    {
      id: 'WORLDID',
      title: 'World ID',
      description: 'Identity verification using World ID credentials',
      icon: '🌍',
      benefits: ['Human proof', 'Privacy-preserving', 'Global accessibility'],
      color: '#9C27B0'
    }
  ];

  const handleMethodSelect = async (method: 'NONE' | 'SELF' | 'WORLDID') => {
    setSelectedMethod(method);
    onVerificationMethodSelect?.(method);

    if (method === 'NONE') {
      onVerificationComplete({
        success: true,
        verified: false,
        requireVerification: false,
        verificationToken: '',
        timestamp: new Date().toISOString(),
        method: 'NONE',
        message: 'Verification skipped - none method selected'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Call verification service with selected method
      const result = await verifyIdentity({
        recipient: 'default-recipient',
        amount: 100,
        currency: 'USD',
        requireVerification: requireVerification,
        method: method,
        proof: method === 'SELF' ? 'mock-proof-data' : undefined,
        attestationId: method === 'SELF' ? 1 : undefined,
        pubSignals: method === 'SELF' ? ['0'] : undefined,
        userContextData: method === 'SELF' ? 'test-context' : undefined
      });

      onVerificationComplete(result);
    } catch (error) {
      onVerificationComplete({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        timestamp: new Date().toISOString(),
        method: method
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="verification-choice-container">
      <div className="verification-header">
        <h2>Choose Verification Method</h2>
        <p>Select how you want to verify your identity for this transaction</p>
      </div>

      <div className="verification-methods-grid">
        {verificationMethods.map((method) => (
          <button
            key={method.id}
            className={`verification-method-card ${selectedMethod === method.id ? 'selected' : ''} ${isVerifying ? 'disabled' : ''}`}
            onClick={() => !isVerifying && handleMethodSelect(method.id as 'NONE' | 'SELF' | 'WORLDID')}
            disabled={isVerifying}
            style={{ borderColor: method.color }}
          >
            <div className="method-icon" style={{ backgroundColor: method.color }}>
              {method.icon}
            </div>
            <div className="method-content">
              <h3>{method.title}</h3>
              <p>{method.description}</p>
              <div className="method-benefits">
                {method.benefits.map((benefit, index) => (
                  <span key={index} className="benefit-tag">{benefit}</span>
                ))}
              </div>
            </div>
            {selectedMethod === method.id && (
              <div className="selected-indicator">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      {isVerifying && (
        <div className="verification-processing">
          <div className="spinner"></div>
          <p>Processing verification with {selectedMethod} method...</p>
        </div>
      )}

      {showDetails && (
        <div className="verification-details">
          <h3>Verification Details</h3>
          <p>Method: {selectedMethod}</p>
          <p>Status: {isVerifying ? 'Processing...' : 'Complete'}</p>
          {verificationResult && (
            <pre>{JSON.stringify(verificationResult, null, 2)}</pre>
          )
          }
        </div>
      )
      }

      <div className="verification-footer">
        <button
          className="btn-secondary"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      <style jsx>{`
        .verification-choice-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .verification-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .verification-header h2 {
          font-size: 2rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .verification-header p {
          font-size: 1.1rem;
          color: #666;
        }

        .verification-methods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .verification-method-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .verification-method-card:hover:not(.disabled) {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .verification-method-card.selected {
          border-color: #4CAF50;
          background-color: #f8fff8;
        }

        .verification-method-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .method-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1.5rem;
          color: white;
        }

        .method-content h3 {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .method-content p {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .method-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .benefit-tag {
          background: #f0f0f0;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #555;
        }

        .selected-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #4CAF50;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .verification-processing {
          text-align: center;
          padding: 2rem;
          background: #f9f9f9;
          border-radius: 8px;
          margin: 2rem 0;
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 1rem;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .verification-details {
          background: #f5f5f5;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 2rem 0;
        }

        .verification-footer {
          text-align: center;
          margin-top: 2rem;
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f0f0f0;
          border-color: #ccc;
        }

        @media (max-width: 768px) {
          .verification-methods-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};