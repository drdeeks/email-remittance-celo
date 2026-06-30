const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SelfVerificationConfig {
  userId: string;
  appId: string;
  scope: string;
  endpoint: string;
}

export interface VerificationStatus {
  verified: boolean;
  verificationId?: string;
  error?: string;
}

export const selfVerificationService = {
  async getConfig(userId: string): Promise<SelfVerificationConfig> {
    const response = await fetch(`${API_URL}/api/self/config?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      throw new Error(`Failed to get verification config: ${response.status}`);
    }
    const data = await response.json();
    return data.config;
  },

  async getStatus(remittanceId: string): Promise<VerificationStatus> {
    const response = await fetch(`${API_URL}/api/self/status?remittanceId=${encodeURIComponent(remittanceId)}`);
    if (!response.ok) {
      throw new Error(`Failed to check verification status: ${response.status}`);
    }
    return await response.json();
  },

  async verifyProof(proofPayload: string, userContextData: string): Promise<{ success: boolean; verificationId?: string }> {
    const response = await fetch(`${API_URL}/api/self/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofPayload, userContextData }),
    });
    if (!response.ok) {
      throw new Error(`Failed to verify proof: ${response.status}`);
    }
    return await response.json();
  },
};
