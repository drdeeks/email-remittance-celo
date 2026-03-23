/**
 * scripts/deploy-verifier.ts
 * Deploy EmailRemittanceVerifier to Celo, Base, or Monad.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-verifier.ts --network celo
 *   npx hardhat run scripts/deploy-verifier.ts --network base
 *   npx hardhat run scripts/deploy-verifier.ts --network monad
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SELF_HUBS: Record<string, string> = {
  celo:         "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",
  celo_testnet: "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  base:         ethers.ZeroAddress,
  monad:        ethers.ZeroAddress,
};

async function main() {
  const netName = network.name;
  const hub     = SELF_HUBS[netName] ?? ethers.ZeroAddress;

  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log(`\n🚀 Deploying EmailRemittanceVerifier`);
  console.log(`   Network:  ${netName} (chainId ${(await ethers.provider.getNetwork()).chainId})`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance:  ${ethers.formatEther(balance)} native`);
  console.log(`   Self Hub: ${hub === ethers.ZeroAddress ? "none (admin-attestation mode)" : hub}`);

  if (balance === 0n) {
    throw new Error(`Deployer has no balance on ${netName}. Fund ${deployer.address} first.`);
  }

  // Constructor params
  const feeRecipient = deployer.address; // deployer collects fees; change post-deploy
  const feeBps       = 100;              // 1%
  const minAge       = netName.startsWith("celo") ? 18 : 0;

  const Factory = await ethers.getContractFactory("EmailRemittanceVerifier");
  console.log("\n   Deploying...");

  const contract = await Factory.deploy(
    hub,
    deployer.address,
    feeRecipient,
    feeBps,
    minAge,
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()!.wait();

  console.log(`   ✅ Deployed: ${address}`);
  console.log(`   TX Hash:    ${receipt!.hash}`);
  console.log(`   Gas used:   ${receipt!.gasUsed.toString()}`);

  // Verify Self config on Celo
  if (hub !== ethers.ZeroAddress) {
    const configId = await (contract as any).verificationConfigId();
    console.log(`   Config ID:  ${configId}`);
  }

  // Save to deployments.json
  const deploymentsPath = path.join(__dirname, "..", "contracts", "deployments.json");
  let deployments: Record<string, unknown> = {};
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }

  deployments[netName] = {
    address,
    txHash:      receipt!.hash,
    deployer:    deployer.address,
    selfEnabled: hub !== ethers.ZeroAddress,
    hub,
    feeBps,
    minAge,
    deployedAt:  new Date().toISOString(),
    blockNumber: receipt!.blockNumber,
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n   📋 Saved to contracts/deployments.json`);

  // Print next steps
  console.log("\n📝 Next steps:");
  console.log(`   1. Add to .env: ${netName.toUpperCase()}_CONTRACT_ADDRESS=${address}`);
  if (hub === ethers.ZeroAddress) {
    console.log(`   2. Set attester: call setAttester(BACKEND_WALLET, true) on ${address}`);
  }
  console.log(`   3. Verify on block explorer (see contracts/README.md)`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deploy failed:", err.message);
    process.exit(1);
  });
