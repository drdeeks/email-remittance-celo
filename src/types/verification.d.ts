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
  method?: string; // Added for enterprise tracking
  dryRun?: boolean;
  warnings?: string[];
  processingTime?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
  verificationUrl?: string;
  sessionId?: string;
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

// Self Enterprise SDK Types
export interface SelfEnterpriseSession {
  id: string;
  verificationUrl: string;
  expiresAt: string;
  flowVersionId: string;
}

export interface SelfEnterpriseSessionDetail {
  id: string;
  status: 'pending' | 'valid' | 'invalid' | 'error' | 'expired';
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  flowVersionId: string;
  externalUuid: string;
  metadata: Record<string, unknown> | null;
  predicatesConfig: Record<string, unknown> | null;
  proofAttributes: Record<string, unknown> | null;
  storage: {
    state: 'pending' | 'committed' | 'failed';
    uri: string | null;
    credentialId: string | null;
  };
}

export interface SelfEnterpriseWebhookEvent {
  type: string;
  verification_id: string;
  external_uuid: string;
  status: 'valid' | 'invalid' | 'error' | 'expired';
  proof_attributes?: Record<string, unknown>;
  flow_version_id: string;
  created_at: string;
  completed_at: string | null;
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
  method?: string; // Added for enterprise tracking
  dryRun?: boolean;
  warnings?: string[];
  processingTime?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
}

export type VerificationRequest = SelfVerificationRequest | WorldIDVerificationRequest;
export type VerificationResult = SelfVerificationResult | WorldIDVerificationResult;
