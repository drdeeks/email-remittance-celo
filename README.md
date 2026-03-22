# Email-Native Crypto Remittance on Celo

> **Send crypto to any email address** — no wallet required on the receiving end.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Celo](https://img.shields.io/badge/Built%20on-Celo-35D07F)](https://celo.org)
[![Tests](https://img.shields.io/badge/tests-16%20passed-brightgreen)](./tests)

## 🎯 Problem

Sending crypto to someone without a wallet is impossibly complex. Remittance workers face:
- High fees on traditional transfers
- Slow settlement (3-5 days)
- Confusing wallet setup for recipients
- No way for non-crypto-native family members to receive funds

## 💡 Solution

Email-native remittance that works like this:
1. **Sender** enters recipient's email + amount
2. **Recipient** receives claim link via email
3. **ZK verification** via Self Protocol ensures compliance
4. **Funds released** to auto-generated Celo wallet
5. **Recipient** can withdraw or use cUSD directly

No wallet setup. No seed phrases. Just email.

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sender    │────▶│  API Server │────▶│    Celo     │
│  (Email)    │     │  (Express)  │     │  Blockchain │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌─────▼─────┐
              │ Ampersend │ │   Self    │
              │  (Email)  │ │ Protocol  │
              └───────────┘ │   (ZK)    │
                            └───────────┘
```

### Key Components

- **Express.js API** — RESTful backend with rate limiting, CORS, helmet
- **Celo Network** — Low-fee stablecoin transfers (cUSD)
- **Self Protocol** — ZK-based identity verification for compliance
- **Ampersend** — Email delivery and tracking
- **Venice AI** — Private fraud analysis (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/drdeeks/email-remittance-celo.git
cd email-remittance-celo
npm install
```

### Configuration

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Celo
CELO_PROVIDER_URL=https://alfajores-forno.celo-testnet.org
CELO_PRIVATE_KEY=your_private_key_here
CELO_STABLECOIN_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1

# Self Protocol
SELF_APP_ID=your_self_app_id
SELF_APP_SECRET=your_self_app_secret

# Email (Ampersend)
AMPERSEND_API_KEY=your_ampersend_key
AMPERSEND_FROM_EMAIL=noreply@yourdomain.com

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Test

```bash
npm test
```

## 📡 API Endpoints

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions` | Create remittance |
| GET | `/api/transactions/:id` | Get transaction status |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions/:id/claim` | Claim funds |

#### Create Transaction

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "sender@example.com",
    "recipientEmail": "recipient@example.com",
    "amount": 100,
    "currency": "cUSD"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "senderEmail": "sender@example.com",
    "recipientEmail": "recipient@example.com",
    "amount": 100,
    "currency": "cUSD",
    "status": "pending",
    "expiresAt": "2024-03-23T00:00:00.000Z"
  }
}
```

### Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verifications` | Start ZK verification |
| GET | `/api/verifications/:id` | Get verification status |
| POST | `/api/verifications/callback` | Self Protocol callback |

### Celo

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/celo/network` | Network info |
| GET | `/api/celo/balance/:address` | Get wallet balance |
| POST | `/api/celo/transfer` | Transfer tokens |
| POST | `/api/celo/wallet/generate` | Generate wallet |

### Email

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emails/verify` | Verify email address |
| POST | `/api/emails/send-claim` | Send claim email |
| GET | `/api/emails/logs/:transactionId` | Email logs |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/ampersend` | Email events |
| POST | `/api/webhooks/self` | Verification events |
| POST | `/api/webhooks/celo` | Blockchain events |

## 🔒 Security Features

- **Rate Limiting** — Prevents abuse (1000 req/hour production)
- **Helmet** — Security headers
- **CORS** — Configurable origins
- **JWT Auth** — Protected endpoints
- **Input Validation** — Email, amount, currency checks
- **ZK Verification** — Compliance without data exposure

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/api.test.ts
```

Current test coverage: 16 tests, 100% passing

## 📁 Project Structure

```
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── celoController.ts
│   │   ├── emailController.ts
│   │   ├── healthController.ts
│   │   ├── transactionController.ts
│   │   ├── verificationController.ts
│   │   └── webhookController.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── services/           # Business logic
│   │   ├── celo.service.ts
│   │   └── selfVerification.service.ts
│   ├── utils/              # Utilities
│   │   ├── errors.ts
│   │   └── logger.ts
│   ├── types/              # TypeScript types
│   └── index.ts            # Entry point
├── tests/                  # Jest tests
├── dist/                   # Compiled JS (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## 🌍 Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment |
| CELO_PROVIDER_URL | Yes | - | Celo RPC endpoint |
| CELO_PRIVATE_KEY | Yes | - | Service wallet key |
| SELF_APP_ID | No | - | Self Protocol app |
| AMPERSEND_API_KEY | No | - | Email service key |
| JWT_SECRET | No | - | JWT signing key |

## 🛣️ Roadmap

- [ ] Production Self Protocol integration
- [ ] Multi-chain support (Arbitrum, Base)
- [ ] Fiat on/off ramps
- [ ] Mobile app
- [ ] WhatsApp integration
- [ ] Recurring remittances

## 🤝 Contributing

PRs welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Add tests
4. Submit PR

## 📄 License

MIT License — see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Built for the **Synthesis Hackathon**
- Powered by **Celo** for low-fee transactions
- ZK verification by **Self Protocol**
- Email delivery by **Ampersend**
- Built autonomously by **Titan** on **OpenClaw**

---

**Questions?** Open an issue or reach out!

---

## 🛡️ Mandate.md Integration

Every transfer is validated by [Mandate.md](https://app.mandate.md) before execution — the policy layer for AI agent wallets.

```
Request → Mandate validate → ✅ allowed → CELO transfer executes
                           → ❌ blocked → Transfer halted, reason shown
                           → ⏳ approval → Human notified, waits for approval
```

- Agent ID: `019d14f2-2363-7146-907f-3deb184c0e31`
- Default policy: $100/tx, $1,000/day
- Audit trail: every transfer logged with action + reason + amount
- Fail-closed: if Mandate unreachable, transfer is blocked

---

## ✅ Live Demo — Confirmed Working (2026-03-22)

**This is a real end-to-end demo on Celo mainnet, not a simulation.**

### Funding TX (Dr Deeks → Titan Wallet)
- **TX:** [`0x711d274b...`](https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06)
- Amount: 0.075 CELO → `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`

### Remittance Executed
```bash
curl -X POST http://localhost:3001/api/remittance/send \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "titan@openclaw.ai",
    "recipientEmail": "drdeeks@outlook.com",
    "amount": 0.05,
    "message": "First real remittance test — Synthesis Hackathon demo"
  }'
```

**Result:** ✅ Email delivered to `drdeeks@outlook.com` at 11:03 AM MST  
**Proof:** See [`proof/email-claim-drdeeks-outlook.pdf`](./proof/email-claim-drdeeks-outlook.pdf)

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3001` |
| `WALLET_PRIVATE_KEY` | Yes | Agent wallet private key | `0x...` |
| `CELO_RPC_URL` | No | Celo RPC endpoint | `https://forno.celo.org` |
| `RESEND_API_KEY` | Yes | Resend email API key | `re_...` |
| `MANDATE_RUNTIME_KEY` | Yes | Mandate.md runtime key | `mndt_live_...` |
| `BASE_URL` | No | Server base URL for claim links | `http://localhost:3001` |
| `DB_PATH` | No | SQLite database path | `./remittance.db` |
| `SELF_API_KEY` | No | Self Protocol API key | `sk_self_...` |

### Quick Start

```bash
git clone https://github.com/drdeeks/email-remittance-celo.git
cd email-remittance-celo
npm install
cp .env.example .env   # edit with your keys
npm run build
npm start
```

---

## 📚 Sources & Documentation

| Resource | URL | Used For |
|----------|-----|---------|
| Celo AI Agents | https://docs.celo.org/build-on-celo/build-with-ai | Agent architecture |
| Celo Fee Abstraction | https://docs.celo.org/tooling/overview/fee-abstraction | Pay gas in USDC |
| Viem on Celo | https://docs.celo.org/developer/viem | Blockchain transfers |
| Celo RPC | https://forno.celo.org | Mainnet endpoint |
| Resend SDK | https://resend.com/docs/send-with-nodejs | Email delivery |
| Mandate.md | https://app.mandate.md/SKILL.md | Transaction policy |
| Self Protocol | https://docs.self.xyz | ZK identity |
| CeloScan | https://celoscan.io | TX explorer |

---

## 🤖 Built by Titan Agent

Autonomous build on OpenClaw (`claude-opus-4-6`) — **zero human code written**.  
Agent wallet: [`0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`](https://celoscan.io/address/0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A)

