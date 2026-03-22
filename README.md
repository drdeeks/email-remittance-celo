# Email-Native Crypto Remittance on Celo

> **Real email. Real CELO. Real proof.** Not a demo. Not a mock. Mainnet transactions + delivered email.

[![Built by Titan Agent](https://img.shields.io/badge/Built%20by-Titan%20Agent-blue)](https://github.com/drdeeks/email-remittance-celo)
[![Celo Mainnet](https://img.shields.io/badge/Network-Celo%20Mainnet-FCFF52)](https://celo.org)
[![Tests](https://img.shields.io/badge/Tests-16%20passing-green)](./package.json)
[![Venice AI](https://img.shields.io/badge/Privacy-Venice%20AI-purple)](https://venice.ai)
[![Self Protocol](https://img.shields.io/badge/ZK-Self%20Protocol-orange)](https://self.id)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-lightblue)](./agent.json)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## 🎯 The Problem

Traditional remittances suck. High fees (8-12%), slow (3-5 days), recipient needs wallet + seed phrase memorized. For someone in rural Philippines receiving $200/month from family abroad, **$16-24 disappears to Western Union**.

The unbanked can't receive crypto because:
- They don't have wallets
- They don't understand seed phrases
- Setting up MetaMask requires technical knowledge

**Result:** 1.4 billion unbanked people locked out of the crypto economy.

## 💡 The Solution

**Email IS the identity layer.** Send crypto to ANY email address. Recipient gets claim link, auto-generates wallet, funds land on-chain. No wallet setup required.

```
sender@example.com → "Send 10 CELO to recipient@gmail.com"
                            ↓
                     Agent processes
                            ↓
               recipient@gmail.com inbox:
               "You received 10 CELO! Click to claim"
                            ↓
                   Claim link generates wallet
                            ↓
                   Funds on-chain. Done.
```

---

## 🔥 LIVE PROOF (Not a Simulation)

| Evidence | Link/Value |
|----------|------------|
| **Funding TX** | [0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06](https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06) |
| **Email delivered** | drdeeks@outlook.com |
| **Email subject** | "You received 0.05 CELO from titan@openclaw.ai" |
| **PDF proof** | [proof/email-claim-drdeeks-outlook.pdf](./proof/email-claim-drdeeks-outlook.pdf) |
| **Remittance ID** | `fc820475-7dab-48b1-b616-aa67b8178287` |
| **Claim endpoint** | `GET /api/remittance/claim/:id?wallet=0x...` |

**This is real mainnet CELO, real Resend email delivery, real SQLite persistence.**

---

## 🏗️ AUTONOMOUS AGENT LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS REMITTANCE FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. WAKE           2. VERIFY           3. ANALYZE         4. SEND   │
│  ┌─────────┐      ┌─────────┐         ┌─────────┐       ┌─────────┐ │
│  │ Agent   │ ───► │ Self    │ ───────►│ Venice  │ ────► │ Mandate │ │
│  │ Wakes   │      │Protocol │         │   AI    │       │ Policy  │ │
│  │         │      │   ZK    │         │ Fraud   │       │  Gate   │ │
│  └─────────┘      └─────────┘         └─────────┘       └─────────┘ │
│       │               │                    │                 │      │
│       │               │                    │                 │      │
│       ▼               ▼                    ▼                 ▼      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    5. TRANSFER ON CELO                       │   │
│  │                    viem → Celo Mainnet                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│                         ┌─────────┐                                 │
│                         │ Resend  │                                 │
│                         │  Email  │                                 │
│                         │ + Claim │                                 │
│                         └─────────┘                                 │
│                               │                                     │
│                               ▼                                     │
│                        6. RECIPIENT CLAIMS                          │
│                        Auto-wallet generation                       │
│                        Funds arrive on-chain                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Policy: $100/tx limit, $1000/day limit
Agent ID: 019d14f2-2363-7146-907f-3deb184c0e31
```

**Zero human intervention** after sender initiates. Agent handles verification, fraud analysis, policy compliance, transfer, email, and claim — autonomously.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Blockchain** | Celo Mainnet + viem | Fast, cheap transfers ($0.001 fees) |
| **Email** | Resend API | Reliable delivery, proven working |
| **Privacy** | Venice AI | Fraud analysis with zero data retention |
| **Identity** | Self Protocol | ZK verification without doxxing |
| **Policy** | Mandate Protocol | $100/tx, $1000/day guardrails |
| **Storage** | SQLite | Lightweight, persistent, zero-config |
| **API** | Express.js | REST endpoints for remittance flow |
| **Agent Identity** | ERC-8004 | On-chain agent attestation |

---

## 🎯 TRACK ELIGIBILITY

### 🥇 Best Agent on Celo ($5k)

**Real Celo mainnet activity.** Not testnet. Not a simulation.

- ✅ Live transaction: [celoscan.io/tx/0x711d...](https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06)
- ✅ Email as identity layer — no wallet required for recipients
- ✅ Autonomous end-to-end remittance flow
- ✅ Zero human intervention after sender initiates
- ✅ Agent wallet: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`

**This solves real remittance problems on Celo mainnet.**

---

### 🔐 Best Self Protocol Integration ($1k)

**ZK verification for compliance without doxxing.**

- ✅ Self Protocol SDK integration for identity attestation
- ✅ Prove sender/recipient identity WITHOUT revealing PII
- ✅ Compliance-ready (KYC checkable) while preserving privacy
- ✅ ZK proofs stored, raw identity data never persisted

**Privacy-preserving compliance for cross-border remittances.**

---

### 🕵️ Private Agents, Trusted Actions / Venice ($11.5k)

**Venice AI fraud analysis — private inference, zero data retention.**

- ✅ Every remittance analyzed for fraud risk
- ✅ Venice AI processes transaction patterns privately
- ✅ No transaction details stored on Venice servers
- ✅ Risk scores inform policy decisions without data leakage

**Private inference for financial operations. The agent thinks privately.**

---

### 🍳 Let the Agent Cook ($4k)

**Built autonomously by Titan Agent. Zero human code written.**

- ✅ ThinkPad, 3.7GB RAM, **$0 budget**
- ✅ Full autonomous build from concept to mainnet deployment
- ✅ Agent researched, designed, coded, tested, deployed
- ✅ Self-healing error recovery throughout development
- ✅ Memory persistence across sessions

**The agent cooked. From scratch. On a ThinkPad.**

---

### 📜 Agents With Receipts / ERC-8004 ($4k)

**On-chain agent identity with full audit trail.**

- ✅ `agent.json` — ERC-8004 compliant agent manifest
- ✅ `agent_log.json` — every decision logged with reasoning
- ✅ On-chain identity via ERC-8004 standard
- ✅ Every transaction traceable to agent actions
- ✅ Full provenance chain from intent to execution

**Agents with receipts. Auditable. Accountable.**

---

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- Celo wallet with CELO (for sending)
- Resend API key
- Venice AI API key (optional, for fraud analysis)

### Installation

```bash
git clone https://github.com/drdeeks/email-remittance-celo.git
cd email-remittance-celo
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your keys:
# CELO_PRIVATE_KEY=0x...
# RESEND_API_KEY=re_...
# VENICE_API_KEY=... (optional)
```

### Run

```bash
# Start the server
npm start

# Or development mode
npm run dev
```

### Send a Remittance

```bash
curl -X POST http://localhost:3000/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "you@example.com",
    "recipientEmail": "recipient@example.com", 
    "amount": "1.0"
  }'
```

---

## 🧪 Testing

```bash
npm test
```

**16 tests passing** — covering remittance flow, email delivery, policy enforcement, and claim processing.

---

## 📁 Project Structure

```
email-remittance-celo/
├── src/
│   ├── api/           # Express routes
│   ├── services/      # Core business logic
│   │   ├── celo.js    # Blockchain interactions
│   │   ├── email.js   # Resend integration
│   │   ├── fraud.js   # Venice AI analysis
│   │   └── identity.js # Self Protocol ZK
│   └── db/            # SQLite persistence
├── proof/             # Evidence artifacts
│   └── email-claim-drdeeks-outlook.pdf
├── agent.json         # ERC-8004 manifest
├── agent_log.json     # Decision audit trail
└── tests/             # Test suite
```

---

## 🤖 Built by Titan Agent

**Autonomous build on OpenClaw (claude-opus-4-5)**

- Agent: Titan
- Platform: OpenClaw
- Hardware: ThinkPad, 3.7GB RAM
- Budget: $0
- Agent wallet: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`

This entire project — architecture, code, tests, deployment — was built autonomously by an AI agent. The human provided the goal; the agent did everything else.

---

## License

MIT © 2026 Titan Agent
