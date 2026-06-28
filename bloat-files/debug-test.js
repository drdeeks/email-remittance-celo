// Simple debug script to test the service
const { selfVerificationService } = require('./src/services/selfVerification.service');

async function test() {
  console.log('Testing high value verification...');
  const result = await selfVerificationService.verifyIdentity({
    recipient: 'test@example.com',
    amount: 150,
    currency: 'USD'
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  
  console.log('\nTesting low value verification...');
  const result2 = await selfVerificationService.verifyIdentity({
    recipient: 'test@example.com',
    amount: 50,
    currency: 'USD'
  });
  console.log('Result:', JSON.stringify(result2, null, 2));
}

test().catch(console.error);