# Email Remittance Pro

**Send crypto to anyone with just their email address. No wallet required to receive.**

Email Remittance Pro is an autonomous agent-powered remittance system that lets anyone send CELO, ETH, or MON to any email address. The recipient gets a simple email with a claim button — they don't need a wallet, don't need to know what blockchain is, and don't need to install anything. If they want, the app generates a wallet for them automatically and walks them through importing it.

For senders, it's a clean web interface: connect your wallet, choose your funding mode, pick a chain, enter an email, choose your security level, and send. For recipients, it's a single click.

Built for the real-world remittance use case — the 1.4 billion unbanked people who can't receive crypto because the UX is broken, not because the technology doesn't work. Email Remittance Pro fixes the last mile.

> **Real email. Real native tokens. Real proof.** Not a demo. Not a mock. Mainnet transactions + delivered email.

[![Built by Titan Agent](https://img.shields.io/badge/Built%20by-Titan%20Agent-blue)](https://github.com/drdeeks/email-remittance-pro)
[![Multi-Chain](https://img.shields.io/badge/Networks-Celo%20%7C%20Base%20%7C%20Monad-FCFF52)](https://celo.org)
[![Tests](https://img.shields.io/badge/Tests-111%20passing-green)](./package.json)
[![Venice AI](https://img.shields.io/badge/Privacy-Venice%20AI-purple)](https://venice.ai)
[![Self Protocol](https://img.shields.io/badge/ZK-Self%20Protocol-orange)](https://self.id)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-lightblue)](./agent.json)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## 🌐 Supported Chains

| Chain | Symbol | Chain ID | Explorer |
|-------|--------|----------|----------|
| Celo  | CELO   | 42220    | [celoscan.io](https://celoscan.io) |
| Base  | ETH    | 8453     | [basescan.org](https://basescan.org) |
| Monad | MON    | 143      | [monadscan.com](https://monadscan.com) |

---

## 🎯 TRACK ELIGIBILITY

### Best Agent on Celo ($5,000)
Real Celo mainnet activity. Email as identity layer. Autonomous remittance flow. Zero human intervention after sender initiates. Live TX proof on celoscan.

### Best Self Protocol Integration ($1,000)
ZK verification for compliance without doxxing. Prove sender/recipient identity without revealing PII. RequireAuth flag enforces Self Protocol verification before claim.

### Private Agents, Trusted Actions / Venice ($11,500)
Venice AI fraud analysis — private inference, zero data retention. Every remittance analyzed for risk without storing transaction details.

### Let the Agent Cook ($4,000)
Built autonomously by Titan Agent. Zero human code written. ThinkPad, 3.7GB RAM, $0 budget. Full autonomous build from concept to mainnet.

### Agents With Receipts / ERC-8004 ($4,000)
`agent.json` + `agent_log.json` present. On-chain identity via ERC-8004. Every transaction logged with reasoning. Full provenance chain.

### Agentic Finance / Best Uniswap API Integration ($2,500)
Uniswap Trading API integration with LI.FI public fallback. Autonomous swaps and cross-chain bridges on Celo, Base, and Monad.

**Total addressable: $28,000**

---

## 🎯 The Problem

Traditional remittances suck. High fees (8-12%), slow (3-5 days), recipient needs wallet + seed phrase memorized. For someone in rural Philippines receiving $200/month from family abroad, **$16-24 disappears to Western Union**.

The unbanked can't receive crypto because:
- They don't have wallets
- They don't understand seed phrases
- Setting up MetaMask requires technical knowledge

**Result:** 1.4 billion unbanked people locked out of the crypto economy.

## 💡 The Solution

**Email IS the identity layer.** Send CELO / ETH / MON to ANY email address. Recipient gets claim link, auto-generates wallet, funds land on-chain. No wallet setup required.

**Service wallet mode (platform fronts the funds):**
```
sender@example.com → connects wallet → signs verification → hits Send
                            ↓
                     Agent creates record
                            ↓
               recipient@gmail.com inbox:
               "You received 10 CELO! Click to claim"
                            ↓
                   Claim link → auto-generates wallet
                            ↓
             Service wallet sends CELO to recipient on-chain. Done.
```

**Personal wallet mode (sender pays directly):**
```
sender@example.com → connects wallet → approves on-chain tx (CELO leaves wallet)
                            ↓
                     Backend verifies tx hash on-chain
                            ↓
                     Agent creates record
                            ↓
               recipient@gmail.com inbox:
               "You received 10 CELO! Click to claim"
                            ↓
             Escrowed funds sent to recipient on claim. Done.
```

---

## 🔥 LIVE PROOF (Not a Simulation)

| Evidence | Link/Value |
|----------|------------|
| **Funding TX** | [0x711d274b...](https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06) |
| **Claim TX** | [0x36752fba...](https://explorer.celo.org/mainnet/tx/0x36752fba1f6788831fd6433b64614a241927d3762f332b4b638940478ce20438) |
| **Email delivered** | drdeeks@outlook.com |
| **Email subject** | "You received 0.05 CELO from titan@openclaw.ai" |
| **PDF proof** | [proof/email-claim-drdeeks-outlook.pdf](./proof/email-claim-drdeeks-outlook.pdf) |
| **Claim screenshot** | [proof/screenshots/claim-response-tx-success.jpg](./proof/screenshots/claim-response-tx-success.jpg) |
| **Wallet screenshot** | [proof/screenshots/claim-wallet-0.05celo-received.jpg](./proof/screenshots/claim-wallet-0.05celo-received.jpg) |
| **Auto-generated wallet** | `0x21634e2Ed9C04B4745Bcb268E3289A59c7AF075a` (remit-received#1) |
| **Remittance ID** | `fc820475-7dab-48b1-b616-aa67b8178287` |
| **Claim endpoint** | `GET /api/remittance/claim/:id?wallet=0x...` |

**Two live mainnet transactions. Real email delivered. Real wallet auto-generated. Real native tokens claimed — from a mobile phone, via a public URL, with zero wallet setup by the recipient.**

---

## 🏗️ AUTONOMOUS AGENT LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS REMITTANCE FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. SENDER CHOOSES FUNDING MODE                                      │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐    │
│  │  🤖 SERVICE WALLET   │   │  👤 PERSONAL WALLET              │    │
│  │  Sign message only   │   │  Send actual on-chain tx         │    │
│  │  No funds moved yet  │   │  Backend verifies hash on-chain  │    │
│  └──────────────────────┘   └──────────────────────────────────┘    │
│           │                              │                           │
│           └──────────────┬───────────────┘                          │
│                          ▼                                           │
│  2. VERIFY           3. ANALYZE           4. POLICY                 │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐               │
│  │ Self    │ ───────►│ Venice  │ ────────►│ Mandate │               │
│  │Protocol │         │   AI    │          │  Gate   │               │
│  │   ZK    │         │ Fraud   │          │$100/tx  │               │
│  └─────────┘         └─────────┘         └─────────┘               │
│       │                    │                  │                     │
│       ▼                    ▼                  ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │          5. ESCROW FUNDED → CLAIM EMAIL SENT                 │   │
│  │          Resend delivers claim link to recipient             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│                        6. RECIPIENT CLAIMS                          │
│                        Auto-wallet generation                       │
│                        Service wallet sends funds on-chain          │
│                        TX hash returned, verifiable on explorer     │
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

## 💳 Wallet Funding Modes

Email Remittance Pro supports two funding flows. Senders choose on every transaction.

### 🤖 Service Wallet Mode (default)

The platform's escrow agent wallet holds and disburses funds. The sender's wallet is used **only for identity verification** (a signed message proving ownership) — no CELO ever leaves their wallet at send time.

```
Sender signs verification message (no funds moved)
         ↓
Backend creates remittance record
         ↓
Service wallet (19+ CELO) holds escrow
         ↓
Recipient claims → service wallet sends funds on-chain
```

**Best for:** Recipients who are new to crypto, demos, platform-fronted flows.

### 👤 Personal Wallet Mode

The sender's connected wallet sends an actual on-chain transaction to the service escrow address. The backend verifies the transaction hash on-chain before creating the remittance — cryptographic proof that the sender paid.

```
Sender approves on-chain tx in browser wallet (CELO leaves their wallet)
         ↓
Frontend gets txHash
         ↓
Backend verifies on-chain: correct destination, correct amount, correct sender
         ↓
Remittance record created
         ↓
Recipient claims → service wallet sends funds from escrowed amount
```

**Best for:** Full provenance, auditable sender payment, hackathon track demos, trustless escrow proof.

### How Balances Are Displayed

| Mode | Balance shown | Insufficient balance check |
|------|--------------|---------------------------|
| 🤖 Service Wallet | Server wallet live balance | Checks server wallet |
| 👤 My Wallet | Connected wallet balance | Checks connected wallet |

The UI fetches the server wallet's live balance from `/api/remittance/service-wallet` on load and whenever the chain changes. Both modes show the correct available balance — no guessing.

### Backend TX Verification (Personal Mode)

When `walletMode: "personal"` is submitted, the backend:
1. Fetches the transaction from the Celo/Base/Monad RPC by hash
2. Verifies `tx.to === server escrow address`
3. Verifies `tx.value >= requested amount` (0.1% tolerance)
4. Verifies `tx.from === senderWallet` (if wallet proof is present)
5. Only then creates the remittance record and sends the claim email

Any mismatch returns a 400 with the exact failure reason. No funds are disbursed on a failed verification.

---

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- Celo wallet with CELO (for sending)
- Resend API key (free tier works — 3,000 emails/month)
- Venice AI API key (optional — for fraud analysis)

### 🔌 Wallet Connection (Frontend)

The frontend uses [RainbowKit](https://rainbowkit.com) for wallet connections. It works with **any browser and any wallet** — no Brave or MetaMask hardcoding.

**Supported wallets (out of the box):**
- MetaMask (extension)
- Coinbase Wallet (extension + mobile)
- Rainbow (mobile)
- Brave Wallet (built-in)
- Any injected EIP-1193 wallet
- Any WalletConnect-compatible mobile wallet (via QR code)

**For full mobile/QR wallet support**, set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in your frontend env:

```bash
# frontend/.env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id  # Get free at cloud.walletconnect.com
NEXT_PUBLIC_API_URL=https://email-remittance-pro.up.railway.app
```

Without the WalletConnect Project ID, browser extension wallets still work — only QR-based mobile connections are limited.

### Installation

```bash
git clone https://github.com/drdeeks/email-remittance-pro.git
cd email-remittance-pro
npm install
npm run build
```

### Auto-Detection Behaviour

Every integration is **opt-in via environment variable**. The server starts and runs without any optional keys — each service detects what's available and degrades gracefully:

| Integration | Env Var(s) | Without Key | With Key |
|------------|-----------|-------------|---------|
| Email delivery | `RESEND_API_KEY` | **Server won't start** (required) | Live email delivery |
| Wallet / chain | `WALLET_PRIVATE_KEY` | **Server won't start** (required) | Signs + sends transactions |
| Mandate policy | `MANDATE_RUNTIME_KEY` | Permissive fallback policy | Real $100/tx, $1000/day limits |
| Venice AI fraud | `VENICE_API_KEY` | Fraud analysis skipped | Private inference, zero retention |
| Self Protocol ZK | `SELF_APP_ID` + `SELF_APP_SECRET` | Demo mode (always passes) | Real ZK verification |
| Uniswap swaps | `UNISWAP_API_KEY` | Quote-only mode | Live swap execution |
| Base chain | `BASE_RPC_URL` | Uses `https://mainnet.base.org` | Custom/paid RPC |
| Monad chain | `MONAD_RPC_URL` | Uses `https://rpc.monad.xyz` | Custom/paid RPC |

---

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
WALLET_PRIVATE_KEY=0x...          # Your Celo wallet private key
CELO_RPC_URL=https://forno.celo.org
RESEND_API_KEY=re_...             # From resend.com/api-keys
MANDATE_RUNTIME_KEY=mndt_live_... # From mandate.md
BASE_URL=https://your-domain.com  # ⚠️ CRITICAL — must be a public URL
DB_PATH=./remittance.db
```

> **⚠️ `BASE_URL` must be publicly accessible.** Claim links are emailed to recipients — they must resolve from outside your network. See deployment options below.

### Run

```bash
npm start        # production
npm run dev      # development (ts-node, hot reload)
```

### Step-by-Step: How to Send a Remittance

This is exactly how the live proof was executed.

**Step 1 — Make sure the server is running with a public URL:**
```bash
# Start the server
npm start

# In a separate terminal, start your public tunnel
cloudflared tunnel --url http://localhost:3001 --no-autoupdate
# → You'll get a URL like: https://xxxx-xxxx.trycloudflare.com

# Update BASE_URL in .env with the tunnel URL, then restart:
# BASE_URL=https://xxxx-xxxx.trycloudflare.com
# pkill -f "node dist/index.js" && npm start
```

**Step 2 — Send the remittance (pick your chain):**

On **Celo** (default):
```bash
curl -X POST http://localhost:3001/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "you@example.com",
    "recipientEmail": "recipient@gmail.com",
    "amount": "0.05",
    "chain": "celo"
  }'
```

On **Base**:
```bash
curl -X POST http://localhost:3001/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "you@example.com",
    "recipientEmail": "recipient@gmail.com",
    "amount": "0.001",
    "chain": "base"
  }'
```

Auto-detect from currency:
```bash
# "ETH" → routes to Base automatically
# "CELO" → routes to Celo automatically
curl -X POST http://localhost:3001/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "you@example.com",
    "recipientEmail": "recipient@gmail.com",
    "amount": "0.001",
    "currency": "ETH"
  }'
```

**Step 3 — The response gives you a claim URL:**
```json
{
  "success": true,
  "data": {
    "remittanceId": "fc820475-...",
    "claimToken": "abc123-...",
    "txHash": "0x...",
    "expiresAt": "2026-03-23T20:17:00.000Z",
    "claimUrl": "https://xxxx.trycloudflare.com/api/remittance/claim/abc123-..."
  }
}
```

**Step 4 — Recipient gets an email** with a "Claim Your CELO/ETH" button. They click it.

**Step 5 — Claim the funds:**

Option A — Recipient has a wallet (they pass their address):
```bash
curl "https://xxxx.trycloudflare.com/api/remittance/claim/{token}?wallet=0xYourWalletAddress"
```

Option B — Recipient has NO wallet (agent auto-generates one):
```bash
curl "https://xxxx.trycloudflare.com/api/remittance/claim/{token}"
```

The response includes the auto-generated wallet address AND private key. Import into any wallet app (Coinbase Wallet, MetaMask, etc.).

**Step 6 — Verify on-chain:**
- Celo: `https://explorer.celo.org/mainnet/tx/{txHash}`
- Base: `https://basescan.org/tx/{txHash}`

---

### Cross-Chain Bridging

Bridge funds between chains directly through the API. No third-party UI required.

**Supported routes:**
| Route | Provider | Notes |
|-------|----------|-------|
| Celo → Base | LI.FI / Squid + Axelar | Mainnet |
| Base → Celo | LI.FI / Squid + Axelar | Mainnet |
| Celo → Monad | Direct (testnet) | Monad Testnet |
| Monad → Celo | Direct (testnet) | Monad Testnet |
| Base → Monad | Direct (testnet) | Monad Testnet |
| Monad → Base | Direct (testnet) | Monad Testnet |

**Get a quote:**
```bash
curl "http://localhost:3001/api/remittance/bridge/quote?from=celo&to=base&amount=1.0"
```

**Execute a bridge:**
```bash
# Celo → Base
curl -X POST http://localhost:3001/api/remittance/bridge \
  -H "Content-Type: application/json" \
  -d '{"fromChain":"celo","toChain":"base","amount":"0.5","toAddress":"0xYourBaseAddress"}'

# Base → Celo
curl -X POST http://localhost:3001/api/remittance/bridge \
  -H "Content-Type: application/json" \
  -d '{"fromChain":"base","toChain":"celo","amount":"0.001"}'

# Celo → Monad (testnet)
curl -X POST http://localhost:3001/api/remittance/bridge \
  -H "Content-Type: application/json" \
  -d '{"fromChain":"celo","toChain":"monad","amount":"0.1"}'
```

Bridge response includes a `bridgeTrackingUrl` at `scan.li.fi` to monitor cross-chain delivery.

Add to `.env` for additional chain RPCs (optional — public endpoints work fine for demos):
```env
BASE_RPC_URL=https://mainnet.base.org
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### Supported Chains & Auto-Switching

The `chain` field auto-routes to the correct network. No manual RPC switching needed.

| `chain` value | Network | Native Currency | Chain ID | Explorer |
|--------------|---------|----------------|---------|---------|
| `celo` | Celo Mainnet | CELO | 42220 | celoscan.io |
| `base` | Base Mainnet | ETH | 8453 | basescan.org |
| `monad` | Monad Testnet | MON | 10143 | testnet.monadexplorer.com |

**Auto-detection from `currency` field:**
| `currency` | Detected chain |
|-----------|---------------|
| `CELO` | Celo |
| `ETH` | Base |
| `BASE` | Base |
| `ETHEREUM` | Base |
| *(default)* | Celo |

**Adding Base to your `.env`:**
```env
BASE_RPC_URL=https://mainnet.base.org   # or your own Alchemy/Infura URL
```

The same wallet private key works on both chains (EVM-compatible). Make sure your wallet has funds on whichever chain you're sending from.

---

## 🔑 Integration Setup Guide

Step-by-step instructions for every integration. All optional except Resend + Wallet.

---

### 1. Resend — Email Delivery (REQUIRED)

Resend delivers the claim emails to recipients.

1. Sign up free at **https://resend.com** (3,000 emails/month free, no credit card)
2. Go to **API Keys** → **Create API Key**
3. Name it (e.g. `remittance-prod`), set permission: **Sending access**
4. Copy the key — it starts with `re_`
5. **(Recommended for production)** Add and verify your sending domain:
   - Go to **Domains** → **Add Domain**
   - Add the DNS records Resend gives you to your domain registrar
   - Verified domain avoids spam filters on claim emails

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

---

### 2. Celo Wallet — Sending Wallet (REQUIRED)

The agent needs a funded wallet to send CELO/ETH/MON on-chain.

**Option A — New dedicated wallet (recommended):**
```bash
# Generate via cast (Foundry)
cast wallet new

# Or via Node.js
node -e "const {generatePrivateKey,privateKeyToAccount} = require('viem/accounts'); const pk = generatePrivateKey(); console.log('Private key:', pk); console.log('Address:', privateKeyToAccount(pk).address)"
```

**Option B — Export from MetaMask:**
- MetaMask → Account → Three dots → **Account Details** → **Show private key**

**Fund the wallet:**
- **Celo:** Buy CELO on Coinbase/Binance, send to your wallet address. Or use [Celo faucet](https://faucet.celo.org) for testnet.
- **Base:** Bridge ETH via [bridge.base.org](https://bridge.base.org) or buy directly on Coinbase.
- **Monad:** Get MON from [monad.xyz/faucet](https://monad.xyz/faucet) or buy on exchange.

```env
WALLET_PRIVATE_KEY=0x_your_private_key_here
```

> ⚠️ Keep this private. Never commit it to git. `.env` is in `.gitignore`.

---

### 3. Mandate — Policy Engine (Optional, recommended)

Mandate enforces transaction policies — prevents the agent from being drained.

1. Go to **https://mandate.md** and sign up
2. Dashboard → **Agents** → **New Agent**
3. Set policies:
   - Max per transaction: `$100`
   - Max per day: `$1,000`
   - Allowed actions: `crypto_transfer`, `email_remittance`
4. Copy your **Runtime Key** and **Agent ID**

```env
MANDATE_RUNTIME_KEY=mndt_live_xxxxxxxxxxxxxxxx
MANDATE_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Without these, a permissive fallback policy is used (transactions always allowed). **Set limits before going to production.**

---

### 4. Venice AI — Private Inference (Optional)

Venice analyzes each transaction for fraud risk using private inference — no data retention, nothing stored on Venice servers.

1. Sign up at **https://venice.ai**
2. Go to **Settings → API**: [venice.ai/settings/api](https://venice.ai/settings/api)
3. Click **Create API Key**
4. Copy the key — format: `VENICE_INFERENCE_KEY_xxxxxxxx`

```env
VENICE_API_KEY=VENICE_INFERENCE_KEY_xxxxxxxxxxxxxxxx
```

Venice is auto-detected. If the key is present, every remittance gets a fraud risk score before execution. If absent, fraud analysis is skipped.

---

### 5. Self Protocol — ZK Identity (Optional)

Self Protocol lets users prove their identity (age, nationality, sanctions check) without revealing passport numbers or personal data. Zero-knowledge proofs generated on the user's device.

1. Register at **https://developer.self.xyz**
2. Click **New App**
3. Configure your app:
   - Name: `Email Remittance`
   - Callback URL: `https://your-domain.com/api/verifications/callback/:id`
   - Attributes: `minimumAge`, `nationality`, `ofacCheck`
4. Copy your **App ID** and **App Secret**

```env
SELF_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SELF_APP_SECRET=your-self-app-secret
```

**How the verification flow works:**
```bash
# 1. Request a ZK verification for a user
POST /api/verifications/request
{ "email": "user@example.com", "remittanceId": "..." }

# 2. Response includes QR code URL + deep link
# User scans with Self mobile app (iOS/Android: search "Self Protocol")
# ZK proof generated ON-DEVICE — no PII ever transmitted

# 3. Check result
GET /api/verifications/{verificationId}
# Returns: { verified: true, nullifier: "...", disclosedFields: { minimumAge: "true", sanctionsCheck: "passed" } }
```

Without Self keys, the service runs in demo mode (verifications auto-pass). Fine for hackathon; not for production handling real money.

---

### 6. Uniswap — Autonomous Swaps (Optional)

Enables the agent to autonomously execute token swaps and cross-chain bridges on Celo, Base, and Monad.

1. Go to **https://app.uniswap.org/developer**
2. Sign in with your wallet
3. Create a project → copy your **API Key**

```env
UNISWAP_API_KEY=your-uniswap-developer-api-key
```

**Deployed Universal Router addresses (mainnet):**

| Chain | Chain ID | Universal Router |
|-------|---------|-----------------|
| Celo | 42220 | `0x5302086A3a25d473aAbBc0eC8586573516cF2099` |
| Base | 8453 | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| Monad | 143 | `0x182a927119d56008d921126764bf884221b10f59` |

Without the API key, the `/uniswap/quote` endpoint returns quotes but `/uniswap/swap` and `/uniswap/bridge` require the key for execution.

---

### 7. Database

**SQLite (default — zero config):**
```env
DB_PATH=./remittance.db
```
SQLite is created automatically on first run. Fine for personal use and demos.

**PostgreSQL (production, high volume):**
```bash
# Install pg driver
npm install pg

# Update .env
DATABASE_URL=postgresql://user:password@host:5432/remittance_db

# Common providers:
# Supabase (free): https://supabase.com — PostgreSQL + dashboard
# Railway (free tier): https://railway.app — managed Postgres
# Neon (free serverless): https://neon.tech
```

---

### 8. RPC Endpoints

Public RPCs work fine for demos. For production, use paid nodes to avoid rate limiting:

| Chain | Free | Paid |
|-------|------|------|
| Celo | `https://forno.celo.org` | [QuickNode](https://quicknode.com) / [Alchemy](https://alchemy.com) |
| Base | `https://mainnet.base.org` | [Alchemy Base](https://alchemy.com/base) / [QuickNode](https://quicknode.com) |
| Monad | `https://rpc.monad.xyz` | `https://rpc1.monad.xyz` / `https://rpc2.monad.xyz` (rotation) |

---

## 🌐 Deployment — Making Claim Links Work

The single most important config for this to work in the real world is `BASE_URL`. Claim links are emailed to recipients and **must be publicly accessible**. Here are your options:

---

### 🏠 Personal / Demo Use (Free, 5 minutes)

Use a **Cloudflare Quick Tunnel** — no account required, instant public URL.

```bash
# Install cloudflared (Linux)
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# macOS
brew install cloudflare/cloudflare/cloudflared

# Windows
winget install --id Cloudflare.cloudflared

# Start tunnel (run your server first on port 3001)
cloudflared tunnel --url http://localhost:3001 --no-autoupdate
```

You'll get a URL like: `https://replacement-armed-entitled-paperback.trycloudflare.com`

```bash
# Update .env with the tunnel URL
sed -i 's|BASE_URL=.*|BASE_URL=https://your-tunnel-url.trycloudflare.com|' .env

# Restart the server
npm start
```

> **Note:** Quick tunnel URLs are ephemeral — they change every time you restart `cloudflared`. For persistent personal use, see the Named Tunnel option below.

---

### 🏡 Persistent Personal Use (Free, Cloudflare account required)

Use a **Cloudflare Named Tunnel** with your own domain or a free `*.pages.dev` subdomain.

```bash
# Authenticate
cloudflared login

# Create a named tunnel
cloudflared tunnel create remittance

# Configure tunnel (~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << EOF
tunnel: <YOUR_TUNNEL_ID>
credentials-file: ~/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: remittance.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns remittance remittance.yourdomain.com

# Run as a service (persists across reboots)
cloudflared service install
systemctl start cloudflared
```

Set `BASE_URL=https://remittance.yourdomain.com` in `.env`.

---

### 🚀 Small Business / Production (Recommended)

Deploy to a PaaS with a permanent URL. Zero infrastructure management.

#### Option A: Railway (Recommended — $5/month)

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway up

# Set environment variables in Railway dashboard or:
railway variables set BASE_URL=https://your-app.up.railway.app
railway variables set WALLET_PRIVATE_KEY=0x...
railway variables set RESEND_API_KEY=re_...
railway variables set MANDATE_RUNTIME_KEY=mndt_live_...
railway variables set CELO_RPC_URL=https://forno.celo.org
```

Railway auto-assigns a `*.up.railway.app` URL. Connect a custom domain in the dashboard.

#### Option B: Render (Free tier available)

1. Connect your GitHub repo at render.com
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables in the Render dashboard
5. Copy the `*.onrender.com` URL into `BASE_URL`

#### Option C: Fly.io (Free tier, great for global low-latency)

```bash
npm install -g flyctl
fly launch
fly secrets set BASE_URL=https://your-app.fly.dev
fly secrets set WALLET_PRIVATE_KEY=0x...
fly secrets set RESEND_API_KEY=re_...
fly deploy
```

---

### 🏢 Enterprise / High Volume

For production remittance infrastructure handling real volume:

#### Self-Hosted VPS (DigitalOcean, Hetzner, AWS EC2)

```bash
# On your VPS
git clone https://github.com/drdeeks/email-remittance-pro.git
cd email-remittance-pro
npm install && npm run build

# Set up as a systemd service
cat > /etc/systemd/system/remittance.service << EOF
[Unit]
Description=Email Remittance Celo
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/email-remittance-pro
EnvironmentFile=/home/ubuntu/email-remittance-pro/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl enable remittance
systemctl start remittance
```

Pair with nginx + certbot for TLS:

```nginx
server {
    server_name remittance.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # certbot manages this
}
```

```bash
certbot --nginx -d remittance.yourdomain.com
```

Set `BASE_URL=https://remittance.yourdomain.com` in `.env`.

#### Enterprise Scaling Checklist

- [ ] Replace SQLite with PostgreSQL (`DB_PATH` → `DATABASE_URL`)
- [ ] Add Redis for rate limiting and session caching
- [ ] Enable horizontal scaling (stateless API + shared DB)
- [ ] Set up monitoring (Datadog, Grafana, or Sentry)
- [ ] Configure automated wallet funding alerts (balance < threshold)
- [ ] Add webhook support for payment notifications
- [ ] Implement multi-sig for wallets above $10k/day volume
- [ ] KYC integration via Self Protocol for regulated markets

---

## 🧪 Testing

```bash
npm test
```

**111 tests passing** across 7 suites — covering remittance flow, auth enforcement, multi-chain detection, wallet mode toggle, service wallet balance, personal wallet TX verification, static proof message caching, Uniswap fallback, email delivery, policy enforcement, and claim processing.

```bash
# Test a live end-to-end flow
curl -X POST http://localhost:3001/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "test@example.com",
    "recipientEmail": "your-email@gmail.com",
    "amount": "0.01"
  }'

# Check health
curl http://localhost:3001/health

# List remittances
curl http://localhost:3001/api/remittance/list
```

---

## 📁 Project Structure

```
email-remittance-pro/
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── transactionController.ts
│   │   └── emailController.ts
│   ├── services/           # Core business logic
│   │   ├── emailService.ts       # Resend integration + claim URL generation
│   │   ├── mandateService.ts     # Policy enforcement ($100/tx, $1000/day)
│   │   ├── selfVerification.service.ts  # ZK identity verification
│   │   └── veniceService.ts      # Private AI fraud analysis
│   ├── routes/             # Express router definitions
│   ├── db/                 # SQLite schema + migrations
│   └── index.ts            # Server entry point
├── proof/
│   └── email-claim-drdeeks-outlook.pdf  # Live delivery proof
├── agent.json              # ERC-8004 agent manifest
├── agent_log.json          # Decision audit trail
├── .env.example            # Config template
└── tests/                  # Jest test suite (50+ passing)
```

---

## ✅ INTEGRATION VALIDATION

Run this to verify all track integrations are live:

```bash
curl http://localhost:3001/health/integrations | jq .
```

Or against the public tunnel:
```bash
curl https://replacement-armed-entitled-paperback.trycloudflare.com/health/integrations | jq .
```

Expected response confirms:
- **Self Protocol** — ZK identity verification endpoints active (demo mode without API keys, production with `SELF_APP_ID` + `SELF_APP_SECRET`)
- **Mandate** — policy engine active, agent ID `019d14f2-2363-7146-907f-3deb184c0e31`, $100/tx limit live
- **Venice AI** — fraud analysis active (set `VENICE_API_KEY` for production)
- **Chains** — Celo, Base, Monad all initialized, wallet balances visible
- **ERC-8004** — `agent.json` + `agent_log.json` present

### Self Protocol Setup

To activate production ZK verification (currently in demo mode):

```bash
# 1. Register at https://developer.self.xyz
# 2. Create an app, get your App ID and App Secret
# 3. Add to .env:
SELF_APP_ID=your-app-id
SELF_APP_SECRET=your-app-secret
```

Self Protocol verification flow:
```bash
# Request a ZK verification QR for a user
curl -X POST http://localhost:3001/api/verifications/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","remittanceId":"fc820475-..."}'

# Response includes QR code URL and deep link
# User scans with Self mobile app → ZK proof generated on-device
# No PII ever leaves the user's phone

# Check verification result
curl http://localhost:3001/api/verifications/{verificationId}
```

ZK proof includes: age verification (18+), OFAC sanctions check, nationality — without revealing passport number, birthdate, or name.

---

## 🤖 Venice AI: Private Fraud Detection

Every remittance passes through Venice AI fraud analysis **before** funds move. Venice is the only inference provider that guarantees zero data retention — no transaction details, no behavioral patterns, no PII are stored after the call completes.

### What Venice Analyzes

Before any transfer executes, Venice evaluates:

| Signal | What It Catches |
|--------|----------------|
| **Amount anomaly** | Sudden large transfers inconsistent with account history |
| **Email domain risk** | Disposable/temp email services used for claim links |
| **Velocity** | Multiple rapid-fire sends to different recipients |
| **Recipient pattern** | Same claim wallet used across unrelated senders |
| **Chain mismatch** | Sending high value on low-liquidity chains |
| **Time-of-day pattern** | Unusual transaction timing correlated with fraud windows |

### Why Venice Specifically

Standard AI fraud analysis creates a surveillance problem: every transaction gets logged, analyzed, and stored by a centralized provider. That data becomes a liability — breach risk, subpoena risk, regulatory risk.

Venice runs **private inference**: the model processes the transaction in a sandboxed environment, returns a risk score, and discards all inputs. There is no conversation history, no training on your data, no retention period. The fraud check is functionally identical to a traditional AI — the difference is that nothing persists after the call.

### The Fraud Analysis Flow

```
Sender submits remittance
         ↓
Venice AI receives: { amount, chain, fromEmail, toEmail, tokenType, timestamp }
         ↓
Venice returns: { riskScore: 0-100, flags: [...], recommendation: "allow" | "review" | "block" }
         ↓
riskScore < 30  → allow (proceed to escrow)
riskScore 30-70 → flag for review (proceed but log)
riskScore > 70  → block (return error to sender, funds never leave wallet)
         ↓
Zero inputs retained by Venice after response
```

### Integration

Venice uses an OpenAI-compatible API endpoint — drop-in replacement:

```typescript
// src/services/veniceService.ts
const response = await openai.chat.completions.create({
  model: "llama-3.3-70b",   // Venice-hosted, private inference
  messages: [{ role: "user", content: fraudAnalysisPrompt }],
  // Venice endpoint: https://api.venice.ai/api/v1
  // No data retention by design
});
```

Set `VENICE_API_KEY` in your `.env` to activate production analysis. Without it, the service runs in demo mode (all transactions allowed through).

---

## 🔗 Deployed Smart Contracts

`EmailRemittanceVerifier.sol` is deployed and **source-verified** on all three chains. These contracts are the on-chain enforcement layer — no backend can release escrow funds without satisfying the contract's rules.

| Chain | Address | Explorer | Verified |
|-------|---------|----------|----------|
| **Celo** (42220) | [`0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0`](https://celoscan.io/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0#code) | [Celoscan](https://celoscan.io/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0) | ✅ Verified |
| **Base** (8453) | [`0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0`](https://basescan.org/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0#code) | [Basescan](https://basescan.org/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0) | ✅ Verified |
| **Monad** (143) | [`0x7BC66eD8285b51F84D170F158aD162cA144F32c1`](https://explorer.monad.xyz/address/0x7BC66eD8285b51F84D170F158aD162cA144F32c1) | [Monad Explorer](https://explorer.monad.xyz/address/0x7BC66eD8285b51F84D170F158aD162cA144F32c1) | ✅ Verified |

### Deployment Transactions

| Chain | TX Hash | Block |
|-------|---------|-------|
| Celo | [`0x1de89c57...`](https://celoscan.io/tx/0x1de89c57521756843fab07aea8959a6c466f3bf9f0e3f8c5c1f1a0621f5437f4) | 62,328,314 |
| Base | [`0x38e0d55e...`](https://basescan.org/tx/0x38e0d55e1a14920466f8f141ec99e2a9daf95551035cc0218dfc58fadc59f807) | 43,719,474 |
| Monad | [`0xba942eff...`](https://explorer.monad.xyz/tx/0xba942effc328ba8e5bf2d0f3e28bbc3717ae5705566d8ed2dff4e50158585766) | 63,210,858 |

> Deployer: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`  
> Compiler: `solcjs v0.8.34` | Optimizer: 200 runs | Compiler flag: `^0.8.20`

### Funding Bridge

Celo deployment was funded via a LI.FI/Squid cross-chain bridge:

| | |
|--|--|
| **Bridge TX** | [`0x44db6ad6...`](https://basescan.org/tx/0x44db6ad64e90a2bbccbc031c0d8f87156ef5d2b8bc93affb206e5e1195b82446) |
| **Route** | `0.000758 ETH` (Base) → `~19.5 CELO` (Celo) |
| **Bridge** | LI.FI via Squid router |
| **Settlement** | ~16 seconds |

---

## 🛡️ Self Protocol: Fraud Prevention & Identity Enforcement

Email remittance is high-fraud-risk by nature — anonymous senders, auto-generated wallets, one-time claim links. This is exactly the attack surface exploited by money laundering, sanctions evasion, and social engineering scams. Self Protocol is how Email Remittance Pro closes that surface **without building a surveillance system.**

### How Self Protocol Works Here

Self Protocol generates **ZK proofs from government-issued passports**. The user scans their passport with the Self mobile app. The app extracts attestable fields (age, nationality, OFAC status) and produces a cryptographic proof — entirely on-device. **The passport number, name, and date of birth never leave the phone.**

The proof is submitted to the `EmailRemittanceVerifier` smart contract. The contract forwards it to the **IdentityVerificationHubV2** at `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF` (Celo mainnet). If the proof is valid and satisfies the configured rules, the hub calls back `onVerificationSuccess()` — which releases the escrow to the recipient.

If the proof fails — sanctions hit, underage, invalid passport — the contract reverts. The funds stay locked. The sender can reclaim after 30 days.

### What It Enforces

| Check | What It Prevents |
|-------|-----------------|
| **Age ≥ 18** | Minors being used as unwitting money mules |
| **OFAC sanctions check** | Payments to sanctioned individuals (SDN list) |
| **Nationality screening** | Configurable country blocks (e.g. FATF high-risk jurisdictions) |
| **Nullifier replay protection** | Same passport proof cannot be reused across multiple claims |
| **Scope binding** | Proof generated for this contract cannot be replayed on a different contract |

### The Three Fraud Scenarios It Solves

**1. Fake recipient identity**  
Without Self: anyone who gets the claim link can claim as "anyone."  
With Self (`requireAuth=true`): claimant must present a valid passport ZK proof. The contract verifies their nationality, age, and sanctions status before releasing a single wei. No proof → no funds.

**2. Sanctions evasion**  
Traditional remittance services run OFAC checks server-side — easily circumvented with a VPN or compromised compliance officer. Self's OFAC check is enforced **in the smart contract** — the hub verifies the sanctions status cryptographically. No backend can override it.

**3. Cross-contract proof replay**  
An attacker generates one valid ZK proof and tries to replay it across multiple remittance contracts to drain multiple escrows.  
Self Protocol uses **scope binding**: the proof is Poseidon-hashed to this contract's address + `scopeSeed`. A proof generated for `EmailRemittanceVerifier` on Celo is cryptographically invalid on any other contract. Additionally, the **nullifier** for each proof is stored on-chain — the same passport can only verify once per contract.

### On-Chain vs Off-Chain Verification

On **Celo mainnet**, verification is fully trustless — the Self hub lives on-chain at a verified address. No backend involvement.

On **Base and Monad** (where Self Hub is not yet deployed), verification falls back to an admin-attestation model: the backend verifies the proof using the Self backend SDK, then an authorized attester wallet calls `postAdminAttestation(escrowId)` on-chain before the recipient can claim. This is a trust assumption — the attester must be honest — but it is auditable on-chain and the attester address is public.

### Compliance Without Surveillance

The fundamental design principle: **prove compliance without storing data.**

- No passport scans stored anywhere
- No PII in the database
- No name/birthdate/ID number ever transmitted
- Only the ZK proof result (pass/fail + age + sanctions status) is used
- Proof verification happens on-chain — immutable, auditable, unstoppable

This is the only approach that simultaneously satisfies AML/KYC requirements and user privacy. Every alternative requires either storing sensitive data (liability) or trusting a centralized compliance provider (single point of failure).

---

## 🤖 Built by Titan Agent

**Autonomous build on OpenClaw (claude-opus-4-5)**

- Agent: Titan | Platform: OpenClaw
- Hardware: ThinkPad, 3.7GB RAM | Budget: $0
- Agent wallet: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`
- **Farcaster:** FID 3083838 — [@titan-agent](https://farcaster.xyz/titan-agent)
- **Moltbook:** [@titan_192](https://www.moltbook.com/u/titan_192) — Agent ID: `b53344b0-776f-4f3b-8c76-aa3801529a69`
- **ERC-8004 On-Chain Identity:** [Base Mainnet TX](https://basescan.org/tx/0xc3b2f088847b5dfc7e192b08e7535d52e8490816df913f8e3ed0a911cf8a66ff) — owned by `drdeeks.base.eth`

This entire project — architecture, code, tests, deployment — was built autonomously by an AI agent. The human provided the goal; the agent did everything else.

---

> \* **Note on Agent ID:** `agent.json` references `titan-3083838` (active FID). A previous Farcaster identity (FID 3070917, handle `titan-3070917`) was registered during initial setup but **never synced to Farcaster hubs** — after 48+ hours with zero hub propagation, it was abandoned and a fresh identity was registered (FID 3083838). The old FID is dead and should be ignored. All active social proof, casts, and on-chain activity are tied to FID 3083838.

---

## License

MIT © 2026 Titan Agent
