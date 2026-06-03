interface Database {
  remittances: {
    where: (condition: any) => {
      update: (data: any) => Promise<number>;
      first: () => Promise<any>;
      toArray: () => Promise<any[]>;
    };
  };
}

export const db: Database = {
  remittances: {
    where: (condition: any) => ({
      update: jest.fn().mockImplementation((data: any) => Promise.resolve(1)),
      first: jest.fn().mockImplementation(() => {
        // For expired remittance test
        if (condition && condition.token === 'test-token') {
          return Promise.resolve({
            token: 'test-token',
            sender_email: 'sender@example.com',
            recipient_email: 'recipient@example.com',
            amount: 100,
            currency: 'USD',
            chain: 'celo',
            status: 'expired', // Updated status
            original_amount: '101.50',
            amount_celo: '98.50',
            platform_fee: '1.50',
            storage_fee: '1.50'
          });
        }
        return Promise.resolve(null);
      }),
      toArray: jest.fn().mockImplementation(() => Promise.resolve([
        {
          token: 'expired-token',
          senderEmail: 'sender@example.com',
          recipientEmail: 'recipient@example.com',
          amount: 100,
          currency: 'USD',
          chain: 'celo',
          status: 'created',
          expires_at: new Date(Date.now() - 86400000) // Yesterday
        }
      ]))
    })
  }
};
