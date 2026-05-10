# 📧 Email Remittance Pro: PLGV2 Protocol

Email Remittance Pro is a production-grade, multi-chain cryptocurrency remittance system that uses email addresses as payment endpoints. It enables non-custodial value transfers to recipients without requiring an existing crypto wallet.

## 🚀 Vision
Built for the new ether, Email Remittance Pro transcends chain loyalty. It is a high-performance protocol engineered for cross-EVM compatibility, currently live on **Monad** and **Base**.

## 🏗️ Protocol Infrastructure

### System Components
- **RemittanceNode**: The central narrative engine and game loop orchestrator.
- **Escrow Protocol**: Secure, per-transaction throwaway wallets for non-custodial holding.
- **Recipient Choice Node**: Fully integrated backend for auto-bridging and auto-swapping upon claim.
- **Gift Card Offramp**: Integrated Tango Card/Reloadly infrastructure for digital redemption.

### Active Networks
- **Chain 143**: Monad Mainnet
- **Chain 8453**: Base Mainnet
- **Chain 42220**: Celo Mainnet

## 🛡️ Governance & Security
- **1.5% Revenue Node**: Integrated protocol fee on all transfers.
- **ZK Identity**: Privacy-first verification via **Self Protocol V2**.
- **Self-Hosted Escrow**: Funds are held in per-remittance wallets until claimed.
- **Comprehensive Logging**: Detailed JSON telemetry for all swaps, bridges, and claims.

## 🛠️ Developer Setup
```bash
# Clone & Install
git clone https://github.com/drdeeks/email-remittance-pro.git && cd email-remittance-pro
npm install --legacy-peer-deps

# Start Backend
npm run dev

# Start Frontend
cd frontend && npm run dev
```

## 🧪 Testing Suite
Email Remittance Pro includes a rigorous testing suite to validate all system components (Swaps, Bridges, Fees).
```bash
npm run test
```

## 📜 Agnostic Protocol
Email Remittance Pro does not express a preference for any specific L1 or L2. The protocol is designed to thrive wherever high-performance, community-driven financial infrastructure is built.