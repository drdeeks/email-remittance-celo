/**
 * deploy.ts — Deploy EmailRemittanceVerifier to Celo, Base, and Monad
 *
 * Usage:
 *   npx ts-node contracts/deploy.ts --chain celo
 *   npx ts-node contracts/deploy.ts --chain base
 *   npx ts-node contracts/deploy.ts --chain monad
 *   npx ts-node contracts/deploy.ts --chain all
 *
 * Env vars required:
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet private key (0x...)
 *   FEE_RECIPIENT          — address to receive protocol fees
 *   FEE_BPS                — fee in basis points (default 100 = 1%)
 *   MIN_AGE                — minimum age for Self ZK (default 18, Celo only)
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// ── Self Hub addresses ────────────────────────────────────────────────────────
const SELF_HUBS: Record<string, string> = {
  celo:       '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF', // mainnet, real passports
  celo_test:  '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74', // testnet, mock passports
  base:       ethers.ZeroAddress, // Self not yet deployed on Base
  monad:      ethers.ZeroAddress, // Self not yet deployed on Monad
};

// ── Chain RPC endpoints ───────────────────────────────────────────────────────
const RPCS: Record<string, string> = {
  celo:   process.env.CELO_RPC_URL    || 'https://forno.celo.org',
  base:   process.env.BASE_RPC_URL    || 'https://mainnet.base.org',
  monad:  process.env.MONAD_RPC_URL   || 'https://rpc.monad.xyz',
};

// ── Chain IDs (for verification) ─────────────────────────────────────────────
const CHAIN_IDS: Record<string, number> = {
  celo:  42220,
  base:  8453,
  monad: 143,
};

// ── Compiled ABI + bytecode (compile with: solc --combined-json ...) ─────────
// In production replace with compiled artifacts. Using hardcoded ABI stub here.
const CONTRACT_ABI = [
  'constructor(address _hub, address _owner, address _feeRecipient, uint256 _feeBps, uint8 _minAge)',
  'function createEscrow(bytes32,bytes32,address,uint256,bool) payable returns (bytes32)',
  'function claimOpen(bytes32,bytes32,address) external',
  'function claimWithSelfProof(bytes32,bytes,bytes) external',
  'function claimWithAdminAttestation(bytes32,bytes32,address) external',
  'function postAdminAttestation(bytes32) external',
  'function reclaimExpired(bytes32) external',
  'function setFeeConfig(uint256,address) external',
  'function setAttester(address,bool) external',
  'function setPaused(bool) external',
  'function emergencyWithdraw(address,uint256,address) external',
  'function getEscrow(bytes32) view returns (tuple(address,address,uint256,uint256,bytes32,bytes32,bool,uint40,uint8,address))',
  'function isClaimable(bytes32) view returns (bool)',
  'function selfEnabled() view returns (bool)',
  'function verificationConfigId() view returns (bytes32)',
  'function feeBps() view returns (uint256)',
  'function feeRecipient() view returns (address)',
  'event EscrowCreated(bytes32 indexed,address indexed,address,uint256,bytes32,bool,uint40)',
  'event EscrowClaimed(bytes32 indexed,address indexed,uint256,uint256)',
  'event EscrowReclaimed(bytes32 indexed,address indexed,uint256)',
];

interface DeployResult {
  chain:       string;
  chainId:     number;
  address:     string;
  txHash:      string;
  selfEnabled: boolean;
  hub:         string;
  feeBps:      number;
  deployedAt:  string;
}

async function deploy(chain: string): Promise<DeployResult> {
  console.log(`\n🚀 Deploying to ${chain}...`);

  const privateKey    = process.env.DEPLOYER_PRIVATE_KEY;
  const feeRecipient  = process.env.FEE_RECIPIENT;
  const feeBps        = parseInt(process.env.FEE_BPS || '100');
  const minAge        = parseInt(process.env.MIN_AGE || '18');

  if (!privateKey)   throw new Error('DEPLOYER_PRIVATE_KEY not set');
  if (!feeRecipient) throw new Error('FEE_RECIPIENT not set');

  const rpc      = RPCS[chain];
  const hubAddr  = SELF_HUBS[chain];
  const chainId  = CHAIN_IDS[chain];

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(privateKey, provider);

  // Verify we're on the right chain
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== chainId) {
    throw new Error(`Chain ID mismatch: expected ${chainId}, got ${network.chainId}`);
  }

  const deployer = wallet.address;
  const balance  = await provider.getBalance(deployer);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Balance:  ${ethers.formatEther(balance)} native`);
  console.log(`  Hub:      ${hubAddr === ethers.ZeroAddress ? 'none (admin-attestation mode)' : hubAddr}`);
  console.log(`  Fee:      ${feeBps / 100}%`);

  // Read bytecode from compiled artifact or compile inline
  const artifactPath = path.join(__dirname, 'artifacts', 'EmailRemittanceVerifier.json');
  let bytecode: string;

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    bytecode = artifact.bytecode;
  } else {
    throw new Error(
      `Compiled artifact not found at ${artifactPath}.\n` +
      `Run: solc --combined-json abi,bin contracts/EmailRemittanceVerifier.sol -o contracts/artifacts/`
    );
  }

  const factory  = new ethers.ContractFactory(CONTRACT_ABI, bytecode, wallet);
  const contract = await factory.deploy(
    hubAddr,
    deployer,       // owner = deployer (transfer ownership after if needed)
    feeRecipient,
    feeBps,
    chain === 'celo' ? minAge : 0   // minAge only meaningful on Celo with Self hub
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()!.wait();

  console.log(`  ✅ Deployed: ${address}`);
  console.log(`  TX:         ${receipt!.hash}`);

  const result: DeployResult = {
    chain,
    chainId,
    address,
    txHash:      receipt!.hash,
    selfEnabled: hubAddr !== ethers.ZeroAddress,
    hub:         hubAddr,
    feeBps,
    deployedAt:  new Date().toISOString(),
  };

  return result;
}

async function main() {
  const args  = process.argv.slice(2);
  const flag  = args.indexOf('--chain');
  const chain = flag !== -1 ? args[flag + 1] : 'all';

  const chains = chain === 'all' ? ['celo', 'base', 'monad'] : [chain];
  const results: DeployResult[] = [];

  for (const c of chains) {
    if (!RPCS[c]) throw new Error(`Unknown chain: ${c}. Valid: celo, base, monad, all`);
    const result = await deploy(c);
    results.push(result);
  }

  // Write deployment manifest
  const manifestPath = path.join(__dirname, 'deployments.json');
  let manifest: Record<string, DeployResult> = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  for (const r of results) {
    manifest[r.chain] = r;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n📋 Deployment Summary:');
  console.table(results.map(r => ({
    chain:    r.chain,
    address:  r.address,
    self:     r.selfEnabled ? '✅' : '⚠️ admin-mode',
    fee:      `${r.feeBps / 100}%`,
    txHash:   r.txHash.slice(0, 12) + '...',
  })));

  console.log(`\n✅ Manifest written to: ${manifestPath}`);
  console.log('\n⚠️  NEXT STEPS:');
  console.log('  1. Update .env with deployed contract addresses:');
  for (const r of results) {
    console.log(`     ${r.chain.toUpperCase()}_CONTRACT_ADDRESS=${r.address}`);
  }
  console.log('  2. Set attester address for Base/Monad (if using admin-attestation):');
  console.log('     contract.setAttester(BACKEND_WALLET_ADDRESS, true)');
  console.log('  3. Verify contracts on block explorers:');
  console.log('     Celo:  https://celoscan.io/address/<address>#code');
  console.log('     Base:  https://basescan.org/address/<address>#code');
  console.log('     Monad: https://explorer.monad.xyz/address/<address>#code');
}

main().catch(err => {
  console.error('❌ Deploy failed:', err.message);
  process.exit(1);
});
