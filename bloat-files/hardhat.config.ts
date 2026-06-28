import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as fs from "fs";
import * as path from "path";

// Load .env manually (dotenv may not be installed as dev dep)
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .filter(l => l.includes("=") && !l.startsWith("#"))
      .map(l => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

const env = loadEnv();
const PRIVATE_KEY = env.WALLET_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks: {
    celo: {
      url: env.CELO_RPC_URL || "https://forno.celo.org",
      chainId: 42220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 5_000_000_000, // 5 gwei
    },
    celo_testnet: {
      url: "https://alfajores-forno.celo-testnet.org",
      chainId: 44787,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    base: {
      url: env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    monad: {
      url: env.MONAD_RPC_URL || "https://rpc.monad.xyz",
      chainId: 143,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./tests/contracts",
    cache:     "./cache-hardhat",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      celo: env.CELOSCAN_API_KEY || "placeholder",
      base: env.BASESCAN_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL:     "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "monad",
        chainId: 143,
        urls: {
          apiURL:     "https://explorer.monad.xyz/api",
          browserURL: "https://explorer.monad.xyz",
        },
      },
    ],
  },
};

export default config;
