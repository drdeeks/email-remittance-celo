export interface SelfVerificationRequest {
  recipient: string;
  amount: number;
  currency: string;
  requireVerification?: boolean; // Indicates if verification is required by user/company choice
  proof?: any;
  pubSignals?: string[];
  attestationId?: number;
  userContextData?: string;
  senderCallback?: boolean; // Indicates if this is a sender callback
}

export interface SelfVerificationResult {
  success: boolean;
  result?: boolean;
  requireVerification: boolean;
  verificationToken: string;
  proof?: string;
  pubSignals?: string[];
  userContextData?: any;
  credentialSubject?: {
    nationality?: string;
    name?: string[];
    dateOfBirth?: string;
  };
  documentType?: string;
  timestamp?: string;
  message?: string;
  error?: string;
  senderSessionToken?: string; // Session token for sender callbacks
}

export interface SelfFrontendConfig {
  selfApiUrl: string;
  selfAppId: string;
  verificationThreshold: number;
  requireAuth: boolean;
}

export interface ProofVerificationResult {
  success: boolean;
  verified: boolean;
  attributes?: {
    minimumAgeValid?: boolean;
    ofacValid?: boolean;
  };
  error?: string;
}

export interface SelfStatus {
  selfProtocol: {
    configured: boolean;
    verificationEnabled: boolean;
    highValueThreshold: number;
    monitoringEnabled: boolean;
  };
}
