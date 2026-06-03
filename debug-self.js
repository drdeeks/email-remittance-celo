// Debug script to test self verification service
const { selfVerificationService } = require('./dist/index');  // Try the compiled version

async function test() {
  console.log('Testing high value verification (amount: 150)...');
  try {
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test@example.com',
      amount: 150,
      currency: 'USD'
    });
    console.log('High value result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('High value error:', error);
  }
  
  console.log('\nTesting low value verification (amount: 50)...');
  try {
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test@example.com',
      amount: 50,
      currency: 'USD'
    });
    console.log('Low value result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Low value error:', error);
  }
  
  console.log('\nTesting failure case (amount: 150, with error)...');
  try {
    // We need to mock the failure case differently
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test-fail@example.com',
      amount: 150,
      currency: 'USD'
      // Missing proof, pubSignals, etc. to trigger failure
    });
    console.log('Failure case result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Failure case error:', error);
  }
}

test();