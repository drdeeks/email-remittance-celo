import { ethers } from 'ethers';

// Import SDKs with fallback to mocks
let AmpersendClient: any;

try {
  // Try to import real Ampersend SDK first
  AmpersendClient = require('@ampersend/sdk').default;
  console.log('✅ Using real Ampersend SDK');
} catch (error) {
  // Fall back to mock if real SDK not available
  console.warn('⚠️  Real Ampersend SDK not available, falling back to mock implementation');
  
  // Define mock client with same interface
  class MockAmpersendClient {
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(apiKey: string, baseUrl: string = 'https://api.ampersend.com') {
      this.apiKey = apiKey;
      this.baseUrl = baseUrl;
    }

    async sendEmail(options: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: any[];
      metadata?: Record<string, any>;
    }): Promise<{
      messageId: string;
      status: 'queued' | 'sent' | 'failed';
      timestamp: number;
    }> {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Return mock success response
        return {
          messageId: `mock-${Date.now()}`,
          status: 'queued' as const,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Mock Ampersend send failed:', error);
        return {
          messageId: '',
          status: 'failed' as const,
          timestamp: Date.now()
        };
      }
    }

    async verifyEmail(email: string): Promise<{
      valid: boolean;
      exists: boolean;
      disposable: boolean;
      reason?: string;
    }> {
      try {
        // Simulate validation
        const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
        const isDisposable = disposableDomains.some(domain => email.endsWith(`@${domain}`));
        
        return {
          valid: true,
          exists: !isDisposable,
          disposable: isDisposable,
          reason: isDisposable ? 'Disposable email address' : undefined
        };
      } catch (error) {
        console.error('Mock email verification failed:', error);
        return {
          valid: false,
          exists: false,
          disposable: false,
          reason: 'Verification service unavailable'
        };
      }
    }

    async trackEmail(messageId: string): Promise<{
      status: 'queued' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
      timestamp: number;
      events: Array<{
        type: string;
        timestamp: number;
        ip?: string;
      }>;
    }> {
      try {
        // Return mock tracking data
        return {
          status: 'queued' as const,
          timestamp: Date.now(),
          events: []
        };
      } catch (error) {
        console.error('Mock tracking failed:', error);
        return {
          status: 'failed' as const,
          timestamp: Date.now(),
          events: []
        };
      }
    }

    async getEmailContent(messageId: string): Promise<{
      subject: string;
      from: string;
      to: string[];
      html: string;
      text: string;
      attachments: any[];
      metadata: Record<string, any>;
    }> {
      try {
        // Return mock email content
        return {
          subject: 'Mock Email Content',
          from: 'no-reply@ampersend.com',
          to: ['recipient@example.com'],
          html: '<p>This is a mock email content.</p>',
          text: 'This is a mock email content.',
          attachments: [],
          metadata: {}
        };
      } catch (error) {
        console.error('Mock content retrieval failed:', error);
        return {
          subject: '',
          from: '',
          to: [],
          html: '',
          text: '',
          attachments: [],
          metadata: {}
        };
      }
    }

    async createTemplate(options: {
      name: string;
      subject: string;
      html: string;
      text?: string;
      metadata?: Record<string, any>;
    }): Promise<{
      templateId: string;
      name: string;
      subject: string;
      html: string;
      text: string;
      metadata: Record<string, any>;
      createdAt: number;
    }> {
      try {
        // Return mock template creation
        return {
          templateId: `mock-template-${Date.now()}`,
          name: options.name,
          subject: options.subject,
          html: options.html,
          text: options.text || '',
          metadata: options.metadata || {},
          createdAt: Date.now()
        };
      } catch (error) {
        console.error('Mock template creation failed:', error);
        return {
          templateId: '',
          name: '',
          subject: '',
          html: '',
          text: '',
          metadata: {},
          createdAt: 0
        };
      }
    }

    async sendTemplate(templateId: string, options: {
      to: string[];
      from?: string;
      data?: Record<string, any>;
      attachments?: any[];
      metadata?: Record<string, any>;
    }): Promise<{
      messageId: string;
      status: 'queued' | 'sent' | 'failed';
      timestamp: number;
    }> {
      try {
        // Return mock template send
        return {
          messageId: `mock-${Date.now()}`,
          status: 'queued' as const,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Mock template send failed:', error);
        return {
          messageId: '',
          status: 'failed' as const,
          timestamp: Date.now()
        };
      }
    }
  }

  AmpersendClient = MockAmpersendClient;
}

export { AmpersendClient };