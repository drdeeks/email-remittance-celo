// Simple debug to see what's happening
process.env.NODE_ENV = 'test';
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';

// Let's require the service directly and see what we get
console.log('Requiring selfVerificationService...');
const svs = require('./src/services/selfVerification.service');
console.log('Service required:', !!svs);
console.log('Service has verifyIdentity:', typeof svs.selfVerificationService.verifyIdentity);

// Let's also check what NODE_ENV is
console.log('NODE_ENV:', process.env.NODE_ENV);

// Let's check the config
const config = require('./src/config/self');
console.log('Self config verification threshold:', config.verification.highValueThreshold);