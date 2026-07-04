# Email Remittance Pro

![License](https://img.shields.io/badge/license-MIT-green)
![Chains](https://img.shields.io/badge/chains-Celo%20%7C%20Base%20%7C%20Monad-6f42c1)
![Contracts](https://img.shields.io/badge/contracts-deployed%20%2B%20verified-success)
![Backend](https://img.shields.io/badge/backend-Node%2022%20%2B%20Express%20%2B%20TypeScript-blue)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2014%20%2B%20wagmi%20%2B%20RainbowKit-black)
![Identity](https://img.shields.io/badge/identity-Self%20Protocol%20ZK%20passport-orange)
![Email](https://img.shields.io/badge/email-Resend-critical)
![Tests](https://img.shields.io/badge/tests-100%2B%20passing-brightgreen)

**Send cryptocurrency to anyone via email.** Recipients don't need a wallet — one can be
auto-generated at claim time. Escrowed on-chain, claimed through a link, verified with
zero-knowledge passport proofs when you want identity enforcement.

> Built by Titan Agent (autonomous) + Dr Deeks (operator). `PLGV2` is the active branch;
> `PL_Genesis` preserves the original hackathon submission.

---

## 🌐 Supported Chains

| Chain | Chain ID | Native | Tokens | Escrow Contract |
|-------|----------|--------|--------|-----------------|
| Celo | 42220 | CELO | USDC, cUSD | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` ✅ verified |
| Base | 8453 | ETH | USDC, USDT | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` ✅ verified |
| Monad | 143 | MON | — | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` (verification pending) |

Cross-chain claims supported: Celo↔Base, Celo↔Monad, Base↔Monad via LI.FI (Squid, Stargate, Axelar).

---

## 🎯 The Problem

Sending crypto to someone still assumes they already live in crypto: they need a wallet, the
right network, the right token, and the confidence not to fumble an address. Remittances —
the single most human use of money transfer — are exactly where those assumptions break.
The people you most want to send money to are the least likely to have a wallet ready.

## 💡 The Solution

An email address becomes the destination:

1. **Sender** fills a form: recipient email, amount, chain, token. Funds go to escrow (1.5% protocol fee).
2. **Recipient** gets an email with a claim link. No wallet? One is generated for them, with import instructions for MetaMask/Valora.
3. **Claim** pays out in whatever token/chain the recipient picks — same-chain swaps via Uniswap, cross-chain via LI.FI bridges, automatically.
4. **Unclaimed after 7 days?** Funds return to sender (minus a 1.5% storage fee + gas).
5. **Identity optional but real:** Self Protocol ZK passport proofs (name, DOB, nationality, OFAC screening) on sender or recipient side — compliance without surveillance.

---

## 🔥 Live Proof (Celo Mainnet)

Not a simulation — real value moved through the deployed system:

| TX | Hash |
|----|------|
| Send to escrow | `0x835a196c2f623fb7255cfb744226683697c4b7b8a0b7c3b448f3c47d49011f96` |
| Claim by Dr Deeks | `0x286065753240aac433f3c69f7af57d94fb4d73ad507cd088ff5a230807a1bb02` |
| Bridge (Base→Celo) | 0.000758 ETH → 19.5 CELO via LI.FI/Squid in 16 s |

**Live infrastructure:**

| Service | URL |
|---------|-----|
| Backend (Railway) | `https://email-remittance-pro.up.railway.app` |
| Frontend (Vercel) | `https://email-remittance-pro.vercel.app` |

**Agent identity (ERC-8004):** Base token 30260 → `0x12F1B38DC35AA65B50E5849d02559078953aE24b`
(drdeeks.base.eth) · Monad token 8368 → `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js 14)                        │
│   SendForm             │  ClaimPage            │  SelfVerificationQR  │
│   ChainSelector        │  AuthToggle           │  Providers (wagmi)   │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────┴────────────────────────────────────────────┐
│                          BACKEND (Express.js)                          │
│   transactionController            │  remittanceController             │
│   feeService │ remittanceService │ walletService │ emailNotifier      │
│   celoService │ swapService │ uniswapService │ selfVerification       │
│   mandateService │ selfSessionStore │ feeEngine                       │
│   SQLite (better-sqlite3)                                              │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ viem / ethers.js
┌──────────────────────────┴────────────────────────────────────────────┐
│                    SMART CONTRACTS (Solidity)                           │
│   EmailRemittanceVerifier.sol — DEPLOYED (Celo, Base, Monad)           │
│   WorldIDRemittanceVerifier.sol — design prototype (not deployed)       │
└──────────────────────────────────────────────────────────────────────┘
```

Full component-by-component detail lives in **[PROJECT_SPEC.md](PROJECT_SPEC.md)** — the
definitive spec for every service, flow, and schema.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, wagmi, RainbowKit, viem |
| Backend | Node.js 22, Express.js, TypeScript, SQLite (better-sqlite3) |
| Blockchain | Celo + Base + Monad (viem primary, ethers.js secondary) |
| Email | Resend API (HTML + plain-text templates) |
| Identity | Self Protocol ZK passport (`@selfxyz/core`, `@selfxyz/enterprise-sdk`), World ID (mock) |
| Policy | Mandate.md transaction validation |
| Swaps | Uniswap SwapRouter02 + Quoter V2, Uniswap Trading API |
| Bridges | LI.FI (aggregates Squid, Stargate, Axelar) |
| Testing | Jest (backend), Vitest (frontend), Playwright (E2E) |
| Deployment | Railway (backend), Vercel (frontend) |

---

## 💳 Wallet Funding Modes

### 🤖 Service Wallet Mode (default — payroll / business)

The server wallet funds escrows on behalf of verified senders.

- Sender verifies via **Self Protocol ZK passport** (name + DOB + nationality + OFAC) → 30-minute server-side session token
- Backend validates the session token on every `/send`
- Designed end-state: admin/manager **review queue** approves each send before the claim email goes out; managers carry **dual identity** (ZK proof + wallet signature)
- `requireAuth` controls whether the *recipient* must also verify to claim

### 👤 Personal Wallet Mode (individual remittances)

The sender's own wallet funds the escrow.

- Connect via RainbowKit → sign an ownership-confirmation message
- Frontend sends the deposit TX; backend **verifies it on-chain** (destination, amount, sender) before accepting
- Claim email sent immediately on deposit confirmation
- Optional `requireAuth` per send

| Aspect | Service Mode | Personal Mode |
|--------|-------------|---------------|
| Who funds | Server wallet | Sender's wallet |
| Sender identity | Self Protocol ZK | Wallet signature |
| Admin review | Required (design) | Not needed |
| Email timing | After approval | After deposit confirmed |
| Use case | Payroll, business | Individual remittances |

---

## 💰 Fee Structure

```
On Deposit:   protocolFee = amount × 1.5%     (sender deposits amount + fee)
On Claim:     recipient receives full amount   (pays own withdrawal gas)
On Refund:    after 7 days unclaimed → additional 1.5% storage fee
              + gas for the return transfer; remainder back to sender
```

- Platform **never** pays gas. Estimates: Celo ~$0.001, Base ~$0.05, Monad ~$0.002.
- A database-driven **fee engine** supports per-chain/per-token overrides:
  `fee = base_fee_usd + (bps / 10000) × amount_usd`, clamped to min/max.
- On-chain contract fee cap is hard-limited to 5% (`MAX_FEE_BPS = 500`); deployed at 100 BPS.

---

## 🔧 Quick Start

### Prerequisites

- Node.js 22+, npm
- A [Resend](https://resend.com) API key (email delivery — required)
- A funded wallet private key for the chain(s) you'll use

### Installation

```bash
git clone https://github.com/drdeeks/email-remittance-pro
cd email-remittance-pro
npm install
cp .env.example .env       # then fill in the values below
```

### Minimum configuration (`.env`)

```bash
# Core
PORT=3000
DATABASE_URL=sqlite:./remittance.db

# Blockchain
CELO_PROVIDER_URL=https://forno.celo.org
WALLET_PRIVATE_KEY=0x...              # server wallet (service mode, swaps, bridges)

# Fees
PLATFORM_FEE_PERCENTAGE=1.5
STORAGE_FEE_PERCENTAGE=1.5

# Email (REQUIRED)
RESEND_API_KEY=re_...
DEFAULT_FROM_EMAIL=no-reply@yourdomain.com

# Claim links must resolve publicly
BASE_URL=https://your-tunnel-or-domain
FRONTEND_URL=https://your-frontend
```

Optional integrations (each degrades gracefully when absent): `SELF_APP_ID`/`SELF_APP_SECRET`
(ZK identity), `UNISWAP_API_KEY` (Trading API — falls back to LI.FI public quotes),
`LI_FI_API_KEY`, `WORLDID_APP_ID`. See [PROJECT_SPEC.md §16](PROJECT_SPEC.md) for the full list.

### Run

```bash
npm run dev                 # backend, hot reload
cd frontend && npm run dev  # frontend on :3000

# production
npm run build && npm start
```

### Making claim links work (5 minutes, free)

Claim emails contain public links — the backend must be reachable:

```bash
# Quick tunnel (no account)
cloudflared tunnel --url http://localhost:3001
# → https://xxxx-xxxx.trycloudflare.com
# Set BASE_URL in .env to that URL, restart the server
```

For persistent/production deployment (named Cloudflare tunnels, Railway, Render, Fly.io,
self-hosted VPS + systemd) see [docs/](docs/) and PROJECT_SPEC.md §15.

---

## 🔑 Integration Setup

| # | Integration | Required? | Setup |
|---|------------|-----------|-------|
| 1 | **Resend** (email) | ✅ Required | Create API key at resend.com, verify a sending domain, set `RESEND_API_KEY` + `DEFAULT_FROM_EMAIL` |
| 2 | **Server wallet** | ✅ Required | Generate (`cast wallet new` or viem), fund on target chains, set `WALLET_PRIVATE_KEY` |
| 3 | **Self Protocol** (ZK identity) | Optional | App at [self.xyz](https://self.xyz); sender flow discloses name/DOB/nationality/OFAC, claim flow enforces age 18+; sessions cached 30 min |
| 4 | **Mandate.md** (policy engine) | Optional | Transfer validation against user-defined policy; 10 s timeout, fail-open |
| 5 | **Uniswap** (swaps) | Optional | Quoter V2 on-chain quotes work with **no key**; `UNISWAP_API_KEY` unlocks the Trading API |
| 6 | **LI.FI** (bridges) | Optional | Public API works keyless; `LI_FI_API_KEY` raises limits |
| 7 | **World ID** | Optional (mock) | Interface present; real SDK integration pending |
| 8 | **Database** | Default: SQLite | Zero-config `remittance.db`; PostgreSQL schema prepared in `scripts/schema.sql` for scale-out |

---

## 🛡️ Identity Verification

Three methods, selected per remittance via the unified verification router:

| Method | Status | What it proves |
|--------|--------|----------------|
| `NONE` | ✅ | Anyone with the claim link can claim |
| `SELF` | ✅ | ZK passport proof — age/OFAC on claim, full disclosure on send — **without revealing the document** |
| `WORLDID` | 🔶 mock | World ID proof-of-personhood (contract prototype exists, SDK not wired) |

**On Celo,** claims verify fully on-chain: the contract forwards the ZK proof to the Self Hub,
which calls back `onVerificationSuccess` → funds release. Nullifier replay protection built in.

**On Base/Monad** (no Self Hub), the backend verifies off-chain and posts an
**admin attestation** on-chain; the recipient then claims with `claimWithAdminAttestation()`.

---

## 🔗 Deployed Smart Contracts

`EmailRemittanceVerifier.sol` — escrow + fee + identity verification, ReentrancyGuard,
pausable, 30-day on-chain expiry, deterministic escrow IDs.

| Chain | Address | Fee | Verified |
|-------|---------|-----|----------|
| Celo | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 1% | ✅ Celoscan |
| Base | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 1% | ✅ Basescan |
| Monad | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` | 1% | pending |

```bash
# Deploy / redeploy
npx ts-node contracts/deploy.ts --chain celo|base|monad|all
# env: DEPLOYER_PRIVATE_KEY, FEE_RECIPIENT  (optional: FEE_BPS, MIN_AGE)
```

Details, ABIs, and deployment TXs: [contracts/DEPLOYMENTS.md](contracts/DEPLOYMENTS.md).

---

## 📡 API Overview

| Area | Base path | Highlights |
|------|-----------|-----------|
| Transactions (primary) | `/api/remittance/*` | `send`, `claim/:token`, `status/:token`, `fee-quote`, `bridge`, `uniswap/*`, `tokens`, `recover/:id` |
| Remittances (DB-backed) | `/api/remittances/*` | `create`, `preview-fee`, `claim`, `sender/:email`, `recipient/:email`, `:id/cancel` — idempotency keys on all mutations |
| Verification | `/api/verification/*` | method selection, enterprise routing, Self webhook |
| Self Protocol | `/api/self/*` | initialize, status, config, verify-proof |
| Health | `/health/*` | liveness, readiness, per-integration status |

Complete route tables with request/response shapes: [PROJECT_SPEC.md §14](PROJECT_SPEC.md).

---

## 🧪 Testing

```bash
npm test               # backend (Jest)
npx vitest run         # frontend (Vitest)
npx playwright test    # E2E
```

| Test Suite | Tests | Status |
|------------|-------|--------|
| Verification Service + Controller | 42 | ✅ |
| Remittance Service + Fee Service | 9 | ✅ |
| Integration (remittance flow, fees) | 11 | ✅ |
| Frontend SendForm (Vitest) | 26 | ✅ |
| Self / Celo / Wallet services | 9 | ✅ |
| Expired remittance | 3 | ✅ |
| **Total** | **100+** | ✅ All passing |

```bash
# Live smoke test
curl http://localhost:3001/health/integrations
```

---

## 📁 Project Structure

```
email-remittance-pro/
├── contracts/            # Solidity escrow contracts + deploy script + DEPLOYMENTS.md
├── frontend/             # Next.js 14 app (SendForm, ClaimPage, Self QR modal)
├── src/
│   ├── controllers/      # transaction, remittance, verification controllers
│   ├── services/         # fee, remittance, wallet, email, swap, bridge, identity
│   ├── db/               # SQLite database layer
│   └── database/migrations/
├── tests/                # Jest unit + integration suites
├── scripts/              # schema.sql, utilities
├── docs/                 # deployment + architecture docs
├── PROJECT_SPEC.md       # ⭐ definitive system specification
├── AGENTS.md             # known bugs / gaps / issue tracker (honest state)
└── CHANGELOG.md          # Keep-a-Changelog, semver
```

---

## ⚠️ Honest Status — Known Gaps

This branch tracks its own defects openly in **[AGENTS.md](AGENTS.md)**. The headline items:

- **Backend bypasses the deployed contract** for escrow (uses per-remittance throwaway wallets instead of `createEscrow()`); wiring the contract in is the top fix.
- **Fee mismatch:** contract charges 1% on-chain, backend charges 1.5% off-chain — needs alignment.
- **Service-mode admin review queue** is specified (PROJECT_SPEC §6.1) but emails currently send immediately.
- **Gift card payout** is typed but unimplemented; **World ID** is mock-only.
- **Storage fee on expiry** exists in spec; deduction logic is in progress.

If a README ever claims these are done before AGENTS.md says so, trust AGENTS.md.

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [PROJECT_SPEC.md](PROJECT_SPEC.md) | Definitive spec — every service, flow, schema, route |
| [AGENTS.md](AGENTS.md) | Known bugs, missing components, fix list |
| [CHANGELOG.md](CHANGELOG.md) | Versioned change history |
| [contracts/DEPLOYMENTS.md](contracts/DEPLOYMENTS.md) | Contract deployment record |
| `PL_Genesis` branch | Original hackathon submission, live-proof logs, full build diary |

---

## License

MIT
