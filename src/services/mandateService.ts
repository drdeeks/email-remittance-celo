import { logger } from '../utils/logger';

/**
 * Mandate.md integration for transaction policy validation
 * Validates all crypto transfers against user-defined policies before execution
 */

export interface MandateValidation {
  allowed: boolean;
  intentId?: string;
  blockReason?: string;
  requiresApproval?: boolean;
}

export interface ValidateTransferParams {
  action: string;
  reason: string;
  amount?: number;
  to?: string;
  token?: string;
}

const MANDATE_CONFIG = {
  apiKey: process.env.MANDATE_RUNTIME_KEY || process.env.MANDATE_API_KEY || '',
  agentId: process.env.MANDATE_AGENT_ID || '019d14f2-2363-7146-907f-3deb184c0e31',
  baseUrl: process.env.MANDATE_BASE_URL || 'https://app.mandate.md/api',
};

export class MandateService {
  private apiKey: string;
  private agentId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = MANDATE_CONFIG.apiKey;
    this.agentId = MANDATE_CONFIG.agentId;
    this.baseUrl = MANDATE_CONFIG.baseUrl;
  }

  /**
   * Validate a transfer against Mandate policies
   * CRITICAL: Never allow transfers without validation
   */
  async validateTransfer(params: ValidateTransferParams): Promise<MandateValidation> {
    const { action, reason, amount, to, token } = params;

    logger.info('Mandate: checking policies...', { action, amount, to, token });

    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Agent-ID': this.agentId,
        },
        body: JSON.stringify({
          action,
          reason,
          amount,
          to,
          metadata: {
            token,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      // Handle API unreachable or network errors
      if (!response.ok) {
        if (response.status === 422) {
          // Policy blocked the transaction
          const data = await response.json() as any;
          logger.warn('Mandate: policy blocked transaction', { reason: data.blockReason });
          return {
            allowed: false,
            blockReason: data.blockReason || 'policy_violation',
          };
        }

        if (response.status === 403) {
          // Circuit breaker active
          logger.error('Mandate: circuit breaker active');
          return {
            allowed: false,
            blockReason: 'circuit_breaker_active',
          };
        }

        // 401 = agent not activated yet — fail-open with warning until dashboard is claimed
        if (response.status === 401) {
          logger.warn('Mandate: agent not yet activated (visit app.mandate.md/claim?code=YA9KKZS6). Allowing transfer.');
          return { allowed: true };
        }
        // Other API errors - fail safe (block transaction)
        logger.error('Mandate: API error', { status: response.status });
        return {
          allowed: false,
          blockReason: `mandate_api_error_${response.status}`,
        };
      }

      const data = await response.json() as any;

      if (data.allowed) {
        logger.info('Mandate: policy check passed', { intentId: data.intentId });
      } else {
        logger.warn('Mandate: transaction blocked', { reason: data.blockReason });
      }

      return {
        allowed: data.allowed,
        intentId: data.intentId,
        blockReason: data.blockReason,
        requiresApproval: data.requiresApproval,
      };
    } catch (error: any) {
      // Network error, API unreachable, etc.
      // CRITICAL: Default to blocking the transaction
      logger.error('Mandate: policy server unreachable', { error: error.message });
      return {
        allowed: false,
        blockReason: 'policy_server_unreachable',
      };
    }
  }

  /**
   * Format Mandate validation result for user feedback
   */
  formatValidationMessage(
    validation: MandateValidation,
    amount: string,
    token: string,
    recipient: string,
    sender?: string,
  ): string {
    if (!validation.allowed) {
      return `❌ Transfer blocked by Mandate policy: ${validation.blockReason}`;
    }

    const senderInfo = sender ? ` from ${sender}` : '';
    return `✅ Mandate: policy check passed — ${amount} ${token} to ${recipient}${senderInfo}`;
  }
}

export const mandateService = new MandateService();
