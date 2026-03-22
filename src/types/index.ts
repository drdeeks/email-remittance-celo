export interface CeloTransaction {
  from: string;
  to: string;
  value: string;
  gas: number;
  gasPrice: string;
  nonce: number;
  data?: string;
}

export interface CeloBalance {
  address: string;
  balance: string;
  stableBalance: string;
  lockedBalance: string;
  pendingBalance: string;
}

export interface CeloTransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  status: number;
  contractAddress?: string;
}

export interface CeloTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface SelfVerificationResult {
  id: string;
  issuer: string;
  proof: string;
  attributes: Record<string, any>;
  issuedAt: Date;
  expiresAt: Date;
  verified: boolean;
}

export interface SelfVerificationRequest {
  email: string;
  callbackUrl?: string;
  attributes?: string[];
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  html: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: any[];
}

export interface EmailResponse {
  messageId: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TransactionStatus {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  currency: string;
  status: 'pending' | 'sent' | 'verified' | 'completed' | 'failed' | 'expired';
  celoTxHash?: string;
  disbursementTxHash?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  expiresAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface VerificationStatus {
  id: string;
  transactionId: string;
  status: 'pending' | 'verified' | 'failed';
  selfVerificationId?: string;
  verifiedAt?: Date;
  expiresAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: any;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export interface AuditLog {
  id?: string;
  transactionId?: string;
  userId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface RateLimit {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}