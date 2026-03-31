# Live Demo — Email-Native Crypto Remittance
**Date:** 2026-03-22 11:03 MST  
**Operator:** Titan Agent (OpenClaw)  
**Human Principal:** Dr Deeks (drdeeks.base.eth)

---

## Funding Transaction (Dr Deeks → Titan Wallet)

| Field | Value |
|-------|-------|
| TX Hash | `0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06` |
| Explorer | https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06 |
| From | Dr Deeks |
| To | `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A` (Titan wallet) |
| Amount | 0.075 CELO |
| Chain | Celo Mainnet |
| Purpose | Fund agent wallet to demonstrate real remittance |

---

## Remittance Flow Executed

### Step 1: API Request
```bash
POST http://localhost:3001/api/remittance/send
Content-Type: application/json

{
  "senderEmail": "titan@openclaw.ai",
  "recipientEmail": "drdeeks@outlook.com",
  "amount": 0.05,
  "message": "First real remittance test — Synthesis Hackathon demo 🔪"
}
```

### Step 2: Mandate Policy Check
- Endpoint: `POST https://app.mandate.md/api/validate`
- Auth: `MANDATE_API_KEY_REMOVED`
- Result: ✅ Passed (agent activated, policies set)
- Agent ID: `019d14f2-2363-7146-907f-3deb184c0e31`

### Step 3: Balance Verification
- RPC: `https://forno.celo.org`
- Wallet: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`
- Balance confirmed: **0.075 CELO**

### Step 4: Escrow Creation
- Remittance ID: `0dec1cbc-3b0e-45fa-9a62-340237732699`
- Claim Token: `fc820475-7dab-48b1-b616-aa67b8178287`
- Status: `pending` (funds held in agent wallet pending claim)
- Expires: 2026-03-23T18:03:38Z (24h window)
- Stored in: SQLite (`remittance.db`)

### Step 5: Email Sent via Resend ✅ CONFIRMED DELIVERED
- API: `https://api.resend.com/emails`
- From: `Titan Remittance <onboarding@resend.dev>`
- To: `drdeeks@outlook.com`
- Subject: `You have 0.05 CELO waiting for you`
- Email contains:
  - Sender: `titan@openclaw.ai`
  - Amount: `0.05 CELO`
  - Message: "First real remittance test — Synthesis Hackathon demo 🔪"
  - Claim link: `http://localhost:3001/api/remittance/claim/fc820475-7dab-48b1-b616-aa67b8178287`
  - Expiry: 24 hours
- **PROOF:** Email received by drdeeks@outlook.com at 11:03 AM MST 2026-03-22
- **PDF proof:** `proof/email-claim-drdeeks-outlook.pdf` (in repo)
- **GitHub:** https://github.com/drdeeks/email-remittance-celo/blob/main/proof/email-claim-drdeeks-outlook.pdf

### Step 6: Claim Flow (recipient)
```
GET /api/remittance/claim/:token
  → Validates token not expired
  → If recipientWallet provided: sends CELO directly
  → If no wallet: generates new Celo wallet, sends CELO, returns private key (one-time)
  → Updates DB status to 'claimed'
  → Sends confirmation email
```

---

## API Endpoints (Full Reference)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/remittance/send` | Create new remittance |
| GET | `/api/remittance/claim/:token` | Claim funds |
| GET | `/api/remittance/:id` | Check status |
| GET | `/api/celo/balance/:address` | Check wallet balance |
| POST | `/api/celo/send` | Direct transfer |
| GET | `/health` | Health check |
| GET | `/api/remittance/demo` | Demo endpoint |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 22 + Express | API server |
| Blockchain | viem + Celo mainnet | CELO transfers |
| Email | Resend SDK | Claim notifications |
| Database | better-sqlite3 | Claim token storage |
| Policy | Mandate.md | Pre-transfer validation, audit trail |
| Identity | Self Protocol | ZK identity verification |
| AI | Venice AI | Fraud scoring (private inference) |
| Auth | JWT | API authentication |

---

## On-Chain Proof

All agent transactions verified on Celo mainnet:

| TX | Description | Link |
|----|-------------|------|
| `0x711d274...` | Funding: Dr Deeks → Titan wallet (0.075 CELO) | [CeloScan](https://celoscan.io/tx/0x711d274b60fdfb4d084d6e72aeb9f9b7039e6a17fb9180b108836acf9ece6d06) |

Wallet activity: https://celoscan.io/address/0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A

---

## Sources & Documentation Used

| Resource | URL | Purpose |
|----------|-----|---------|
| Celo AI Agents Guide | https://docs.celo.org/build-on-celo/build-with-ai | Agent development patterns |
| Celo Fee Abstraction | https://docs.celo.org/tooling/overview/fee-abstraction | Pay gas in USDC |
| Viem Celo Docs | https://docs.celo.org/developer/viem | viem integration |
| Celo RPC | https://forno.celo.org | Mainnet RPC endpoint |
| Resend SDK Docs | https://resend.com/docs/send-with-nodejs | Email delivery |
| Mandate.md Skill | https://app.mandate.md/SKILL.md | Transaction policy layer |
| Self Protocol | https://docs.self.xyz | ZK identity verification |
| CeloScan | https://celoscan.io | Transaction explorer |

