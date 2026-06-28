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

// World ID Verification Types
export interface WorldIDVerificationRequest {
  nullifierHash: string;
  merkleRoot: string;
  proof: string;
  verificationLevel?: 'orb' | 'device';
  appId?: string;
  recipient: string;
  amount: number;
  currency: string;
  requireVerification?: boolean;
  senderCallback?: boolean;
}

export interface VerificationMethodSelectionRequest {
  method: 'NONE' | 'SELF' | 'WORLDID'; // SCR-1: User verification method choice
  reason?: string; // Optional reason for method selection
  force?: boolean; // Whether to force this method selection
}

export interface WorldIDVerificationResult {
  success: boolean;
  verified: boolean;
  requireVerification: boolean;
  verificationToken: string;
  nullifierHash?: string;
  merkleRoot?: string;
  credentialSubject?: {
    username?: string;
    humanitarianProof?: boolean;
  };
  timestamp?: string;
  error?: string;
  message?: string;
  senderSessionToken?: string;
}

export type VerificationRequest = SelfVerificationRequest | WorldIDVerificationRequest;
export type VerificationResult = SelfVerificationResult | WorldIDVerificationResult;
