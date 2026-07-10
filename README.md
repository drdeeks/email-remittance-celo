# Email Remittance Pro

<!-- Status & license -->
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.1-blue)

<!-- Runtime / language -->
![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?logo=solidity&logoColor=white)

<!-- Backend -->
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/DB-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![viem](https://img.shields.io/badge/viem-2.x-6f42c1)
![ethers](https://img.shields.io/badge/ethers-6.x-3C3C3D?logo=ethereum&logoColor=white)

<!-- Frontend -->
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwindcss&logoColor=white)
![wagmi](https://img.shields.io/badge/wagmi-2.x-6f42c1)
![RainbowKit](https://img.shields.io/badge/RainbowKit-2.x-7C3AED)

<!-- Chains -->
![Celo](https://img.shields.io/badge/Celo-42220-F5A623?logo=celo&logoColor=white)
![Base](https://img.shields.io/badge/Base-8453-0052FF?logo=base&logoColor=white)
![Monad](https://img.shields.io/badge/Monad-143-8A2BE2)

<!-- Identity (optional integrations) -->
![Self Enterprise](https://img.shields.io/badge/Self%20Protocol-Enterprise%20SDK-orange)
![World ID](https://img.shields.io/badge/World%20ID-real%20IDKit-blue)

<!-- Integrations -->
![Resend](https://img.shields.io/badge/Email-Resend-FF4B2B?logo=resend&logoColor=white)
![Uniswap](https://img.shields.io/badge/Swaps-Uniswap-FF007A?logo=uniswap&logoColor=white)
![LI.FI](https://img.shields.io/badge/Bridges-LI.FI-00C2FF)

<!-- Testing / CI -->
![Jest](https://img.shields.io/badge/tests-Jest-CC342D?logo=jest&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-Vitest-729B1B?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)
![Hardhat](https://img.shields.io/badge/contracts-Hardhat-FFF100?logo=hardhat&logoColor=black)

<!-- Hosting -->
![Railway](https://img.shields.io/badge/host-Railway-7A5CFF?logo=railway&logoColor=white)
![Render](https://img.shields.io/badge/host-Render-46E3B7?logo=render&logoColor=black)
![Vercel](https://img.shields.io/badge/host-Vercel-000000?logo=vercel&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/host-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![Docker](https://img.shields.io/badge/container-Docker-2496ED?logo=docker&logoColor=white)

**Send cryptocurrency to anyone via email.** Recipients don't need a wallet — one can be
auto-generated at claim time. Funds are escrowed (optionally on the deployed smart contract),
claimed through a link, and (optionally) gated by zero-knowledge identity proofs. Cross-chain
payouts and token swaps happen automatically on claim.

> Built by **Titan Agent** (autonomous) + **Dr Deeks** (operator). Active branch: `PLGV2`.
> The authoritative specification lives in [`PROJECT_SPEC.md`](PROJECT_SPEC.md); known defects
> are tracked openly in [`AGENTS.md`](AGENTS.md).

---

## 📑 Table of Contents

1. [Problem & Solution](#-problem--solution)
2. [Architecture](#-architecture)
3. [Chains & Tokens](#-chains--tokens)
4. [Wallet Funding Modes](#-wallet-funding-modes)
5. [Identity Verification (optional, funding-entity decides)](#-identity-verification)
6. [Fee Structure](#-fee-structure)
7. [Smart Contracts](#-smart-contracts)
8. [Environment Variables](#-environment-variables)
9. [Pre-Deploy Checklist](#-pre-deploy-checklist)
10. [Deployment — Backend](#-deployment--backend)
11. [Deployment — Frontend (Cloudflare Pages)](#-deployment--frontend-cloudflare-pages)
12. [Deployment — Smart Contracts](#-deployment--smart-contracts)
13. [Integration Setup](#-integration-setup)
14. [API Overview](#-api-overview)
15. [Testing](#-testing)
16. [Project Structure](#-project-structure)
17. [Honest Status — Known Gaps](#-honest-status--known-gaps)
18. [Security Notes](#-security-notes)
19. [Troubleshooting](#-troubleshooting)
20. [Documentation](#-documentation)

---

## 🧩 Problem & Solution

**Problem:** Sending crypto assumes the recipient already lives in crypto — a wallet, the right
network, the right token. Remittances are exactly where that breaks.

**Solution:** An email becomes the destination. The **funding entity** (whoever funds the escrow
— the server wallet in service mode, or the sender's own wallet in personal mode) decides whether
identity verification is required. Recipients can claim with no wallet (one is generated), pick any
token/chain, and verification is always *optional but recommended* — never forced by the user.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                          │
│   SendForm │ ClaimPage │ SelfVerificationQR (Enterprise) │ WorldId    │
│   ChainSelector │ Providers (wagmi + RainbowKit + IDKit)               │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ REST API (JSON over HTTPS)
┌───────────────────────────┴──────────────────────────────────────────┐
│                        BACKEND (Express.js)                           │
│  transactionController │ remittanceController │ adminReviewController │
│  feeService │ remittanceService │ walletService │ emailNotifier       │
│  celoService │ swapService │ uniswapService │ selfEnterpriseEnhanced  │
│  worldIdVerification │ verificationPolicy │ rateLimiter │ SQLite      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ viem / ethers.js
┌───────────────────────────┴──────────────────────────────────────────┐
│                  SMART CONTRACTS (Solidity)                            │
│  EmailRemittanceVerifier.sol — DEPLOYED (Celo, Base, Monad)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Chains & Tokens

| Chain | ID | Native | Tokens | Contract |
|-------|----|--------|--------|----------|
| Celo | 42220 | CELO | USDC, cUSD | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` ✅ |
| Base | 8453 | ETH | USDC, USDT | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` ✅ |
| Monad | 143 | MON | MON | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` |

Cross-chain claims: Celo↔Base, Celo↔Monad, Base↔Monad via LI.FI.

> ⚠️ **Monad chain-ID inconsistency:** some frontend code uses `10143` while the contract uses
> `143`. Standardize on **143** ([AGENTS.md #13](AGENTS.md)).

---

## 💳 Wallet Funding Modes

### 🤖 Service Wallet Mode (payroll / business)
The server wallet (`WALLET_PRIVATE_KEY`) funds escrows on behalf of verified senders.

### 👤 Personal Wallet Mode (individual)
The sender's own wallet funds the escrow; the backend verifies the deposit on-chain.

In **both** modes, the **funding entity** is what determines verification requirements (see below).

---

## 🛡️ Identity Verification

Verification is **optional by default** and **never chosen by the user**. The method is decided
**server-side by the funding entity** (the wallet that funds the escrow) via
`src/services/verificationPolicy.ts`:

- **Default: `NONE`** — anyone with the claim link can claim.
- **`SELF`** — Self Protocol **Enterprise SDK** (`@selfxyz/enterprise-sdk`): a verification
  session is created, the user proves with the Self app, and the result is delivered to the
  backend via a Svix-signed webhook (`/api/verification/webhooks/self`, verified with
  `SELF_WEBHOOK_SECRET`).
- **`WORLDID`** — World ID via `@worldcoin/idkit` (`IDKitRequestWidget`). The proof is
  re-verified server-side at the Worldcoin Developer Portal (`worldIdVerification.service.ts`),
  with nullifier replay protection.

| Method | Status | Config |
|--------|--------|--------|
| `NONE` | ✅ default | — |
| `SELF` | ✅ real (Enterprise SDK) | `SELF_API_KEY`, `SELF_FLOW_ID`, `SELF_WEBHOOK_SECRET` |
| `WORLDID` | ✅ real (IDKit) | `WORLDID_APP_ID`, `WORLDID_APP_SECRET` |

The claim endpoint enforces the server-decided method before releasing funds. The status
endpoint returns `verificationMethod` so the frontend renders the correct widget.

---

## 💰 Fee Structure

```
Deposit:  protocolFee = amount × PLATFORM_FEE_PERCENTAGE (default 1.5%); sender deposits amount + fee
Claim:    recipient receives full amount (pays own withdrawal gas)
Refund:   after 7 days unclaimed → additional STORAGE_FEE_PERCENTAGE (default 1.5%) + return gas
```
Platform never pays gas. On-chain contract fee cap is 5% (`MAX_FEE_BPS = 500`); deployed at 100 BPS.
⚠️ Align the contract fee (1%) with the backend fee (1.5%) before mainnet reliance ([AGENTS.md #2](AGENTS.md)).

---

## 🔗 Smart Contracts

`EmailRemittanceVerifier.sol` — escrow + fee + identity, ReentrancyGuard, pausable, 30-day expiry.

| Chain | Address | Fee | Verified |
|-------|---------|-----|----------|
| Celo | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 1% | ✅ Celoscan |
| Base | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 1% | ✅ Basescan |
| Monad | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` | 1% | pending |

```bash
npx ts-node contracts/deploy.ts --chain celo|base|monad|all
# env: DEPLOYER_PRIVATE_KEY, FEE_RECIPIENT  (optional: FEE_BPS, MIN_AGE)
```
The deploy script reads the combined artifact `contracts/artifacts/EmailRemittanceVerifier.json`
(real ABI + bytecode) and writes results to `contracts/deployments.json`.

---

## 🔐 Environment Variables

Only the **secrets** below are strictly required to boot and send email. Identity integrations
are optional — the server runs without them (verification defaults to `NONE`).

### Required secrets
| Variable | Notes |
|----------|-------|
| `WALLET_PRIVATE_KEY` | Server wallet — funds escrows (service mode), swaps, bridges |
| `RESEND_API_KEY` | Email delivery |
| `FROM_EMAIL` / `DEFAULT_FROM_EMAIL` | Verified sending domain |
| `BASE_URL` | Public backend URL (claim links) |
| `FRONTEND_URL` | Frontend origin (CORS / email links) |

### Other backend (optional)
`PORT` (3000; use 3001 for local dev to match the frontend default), `HOST` (0.0.0.0),
`DATABASE_URL` (sqlite:./remittance.db), `CELO_PROVIDER_URL`, `CELO_RPC_URL`/`BASE_RPC_URL`/
`MONAD_RPC_URL`, contract addresses (`CELO_CONTRACT_ADDRESS`, `*_SELF_CONTRACT`),
`PLATFORM_FEE_PERCENTAGE` (1.5), `STORAGE_FEE_PERCENTAGE` (1.5), `SELF_API_KEY`, `SELF_FLOW_ID`,
`SELF_WEBHOOK_SECRET`, `WORLDID_APP_ID`, `WORLDID_APP_SECRET`, `UNISWAP_API_KEY`, `LI_FI_API_KEY`,
`JWT_SECRET`, `SESSION_SECRET`, `MANDATE_*` (policy engine).

### Frontend (`.env.local`, all `NEXT_PUBLIC_*`)
`NEXT_PUBLIC_API_URL` (backend base URL), `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`,
`NEXT_PUBLIC_HIGH_VALUE_THRESHOLD`, `NEXT_PUBLIC_LOG_LEVEL`.

---

## ✅ Pre-Deploy Checklist

- [ ] `WALLET_PRIVATE_KEY` generated and **funded** on every enabled chain.
- [ ] Resend API key + verified sending domain; `FROM_EMAIL` set.
- [ ] `BASE_URL` / `FRONTEND_URL` point at real public hostnames.
- [ ] Contract addresses in `.env` match deployed networks.
- [ ] (Self) `SELF_API_KEY`/`SELF_FLOW_ID` + `SELF_WEBHOOK_SECRET` set; attester registered on Base/Monad; `registerVerificationConfig` on Celo.
- [ ] (World ID) `WORLDID_APP_ID`/`WORLDID_APP_SECRET` set.
- [ ] Fee alignment decided (contract 1% vs backend 1.5%).
- [ ] Frontend `NEXT_PUBLIC_API_URL` → your backend.
- [ ] (Vercel) `frontend/vercel.json` rewrite → your backend (not the hardcoded Railway URL).

---

## 🚀 Deployment — Backend

**Node / Docker:**
```bash
npm install
cp .env.example .env            # fill required secrets
npm run build                   # tsc -> ./dist (build.js, emits on type errors)
PORT=3001 npm start             # node dist/index.js  (binds HOST:PORT, default 0.0.0.0:3000)
```
```bash
docker build -t email-remittance-pro .
docker run -d -p 3000:3000 --env-file .env email-remittance-pro
```
**Railway / Render:** connect repo; build `npm run build`, start `npm start`; add env vars;
Railway provides `PORT`. Smoke test: `curl https://<backend>/health/integrations`.
**systemd:** see PROJECT_SPEC §15 / the unit in the deploy docs.

---

## 🎨 Deployment — Frontend (Cloudflare Pages)

The frontend is a Next.js 14 app. On **Cloudflare Pages** use the official
`@cloudflare/next-on-pages` adapter (Next.js is not served directly from `.next` on Pages).

**1. Install the adapter** (already added to `frontend/package.json`):
```bash
cd frontend && npm install
```
`frontend/package.json` has `"pages:build": "npx @cloudflare/next-on-pages"` and the dev dep
`@cloudflare/next-on-pages`.

**2. Cloudflare dashboard (recommended):**
- Create a **Pages** project → connect this repo.
- **Build command:** `cd frontend && npm install && npm run pages:build`
- **Output directory:** `frontend/.vercel/output`  (produced by next-on-pages)
- **Root directory:** `/` (monorepo-safe; the build command `cd`s into `frontend`).
- **Environment variables:** `NEXT_PUBLIC_API_URL` (your backend), `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- (Optional) **wrangler** for local: `cd frontend && npx wrangler pages dev`.

**3. GitHub Actions** — `.github/workflows/deploy-frontend.yml` builds with
`npx @cloudflare/next-on-pages` and deploys `frontend/.vercel/output` via `cloudflare/pages-action`.

> ⚠️ Legacy `public/index.html` / `public/claim.html` hardcode a Railway URL — remove or update.

---

## 📜 Deployment — Smart Contracts

1. Compile if changed: `solc --combined-json abi,bin contracts/EmailRemittanceVerifier.sol -o contracts/artifacts/`
   then regenerate `contracts/artifacts/EmailRemittanceVerifier.json` (combined ABI+bytecode;
   the file already exists in the repo).
2. Deploy: `DEPLOYER_PRIVATE_KEY=0x... FEE_RECIPIENT=0x... npx ts-node contracts/deploy.ts --chain all`.
3. Post-deploy: Celo → `registerVerificationConfig`; Base/Monad → `setAttester(<SERVER_WALLET>, true)`;
   update `.env` contract addresses; verify on explorers; transfer ownership to a multisig.

---

## 🔧 Integration Setup

| # | Integration | Required? | Setup |
|---|------------|-----------|-------|
| 1 | **Resend** | ✅ Required | API key + verified domain |
| 2 | **Server wallet** | ✅ Required | Funded wallet |
| 3 | **Self Protocol (Enterprise)** | ⚪ Optional | `SELF_API_KEY`, `SELF_FLOW_ID`, `SELF_WEBHOOK_SECRET` |
| 4 | **World ID** | ⚪ Optional | `WORLDID_APP_ID`, `WORLDID_APP_SECRET` |
| 5 | **Uniswap / LI.FI** | ⚪ Optional | Quoter V2 works keyless; API keys raise limits |
| 6 | **Mandate.md** | ⚪ Optional | Policy engine, fail-open |

---

## 📡 API Overview

| Area | Base path | Highlights |
|------|-----------|-----------|
| Transactions | `/api/remittance/*` | `send`, `claim/:token`, `status/:token`, `fee-quote`, `bridge`, `uniswap/*` |
| Remittances (DB) | `/api/remittances/*` | `create`, `claim`, `sender/:email`, `recipient/:email`, `:id/cancel` |
| Verification | `/api/verification/*` | `worldid/verify`, `worldid/rp-context`, `claim-callback`, `webhooks/self` |
| Self | `/api/self/*` | `config`, `status`, `verify-proof` |
| Admin | `/api/admin/*` | review queue, manager invite |
| Health | `/health/*` | liveness, readiness, integrations |

---

## 🧪 Testing

```bash
npm test                 # backend (Jest)
npm run test:coverage    # backend + coverage
npx vitest run           # frontend (configure vitest first — see AGENTS.md #21)
npx playwright test      # E2E
```
Notes: Jest `testMatch` excludes `src/**` (AGENTS.md #22); Vitest not yet configured; Playwright
targets live deploy (AGENTS.md #51); backend coverage ~29% (AGENTS.md #31).

---

## 📁 Project Structure

```
contracts/      Solidity + deploy.ts + DEPLOYMENTS.md + artifacts
frontend/       Next.js 14 app (SendForm, ClaimPage, Self QR, WorldId)
src/
  controllers/  transaction, remittance, verification, adminReview, health
  services/     fee, remittance, wallet, email, swap, selfEnterpriseEnhanced,
                worldIdVerification, verificationPolicy
  database/     SQLite layer + migrations (incl. verification_method / funding_entity)
  routes/       Express routers
  index.ts      Express app + HTTP bootstrap (app.listen)
build.js        tsc build entry
Dockerfile      multi-stage container build
```

---

## ⚠️ Honest Status — Known Gaps

Tracked in [`AGENTS.md`](AGENTS.md). Headlines:
- Backend escrow vs deployed contract (`createEscrow`) — wire the contract in ([AGENTS.md #1](AGENTS.md)).
- Fee mismatch 1% vs 1.5% ([AGENTS.md #2](AGENTS.md)).
- Service-mode admin review queue emails immediately ([AGENTS.md #3](AGENTS.md)).
- Gift card payout typed but unimplemented ([AGENTS.md #4](AGENTS.md)).
- Storage fee on expiry in progress ([AGENTS.md #5](AGENTS.md)).
- Monad chain-ID `143` vs `10143` ([AGENTS.md #13](AGENTS.md)).
- Frontend: insufficient-balance doesn't block submit, no email/address validation, legacy HTML pages ([AGENTS.md #43–49](AGENTS.md)).
- Security: auth + rate-limiter middleware exist but aren't applied; webhook signature verification is a TODO for Resend; session store is in-memory ([AGENTS.md #23–26](AGENTS.md)).

### Fixes applied in this branch
1. `build.js` added (was missing → `npm run build` failed).
2. `src/index.ts` now calls `app.listen()` (server previously exported `app` but never bound a port).
3. Combined contract artifact `contracts/artifacts/EmailRemittanceVerifier.json` + `deploy.ts` uses real ABI+bytecode.
4. CI frontend publish dir corrected to the next-on-pages output (`frontend/.vercel/output`).
5. `Dockerfile` + `.dockerignore` added.
6. **Real Self Enterprise SDK** wired (`@selfxyz/enterprise-sdk`); **real World ID** verification (`@worldcoin/idkit` + Developer Portal verify).
7. **Funding-entity-driven verification policy** (`verificationPolicy.ts`): default `NONE`, no user choice; persisted as `verification_method`/`funding_entity`; enforced on claim.
8. `/health/integrations` hardened so a chain/RPC failure can't hang the response.

---

## 🔒 Security Notes

- Never commit `.env`, `*.db`, or private keys (gitignored).
- Apply `src/middleware/auth.ts` + `src/middleware/rateLimiter.ts` to routes; verify
  `RESEND_WEBHOOK_SECRET` (Resend webhook is still a TODO) and `SELF_WEBHOOK_SECRET` (Svix).
- Use a multisig owner for the contract; `emergencyWithdraw` can move all paused funds ([AGENTS.md #27](AGENTS.md)).

---

## 🩺 Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm run build` → `Cannot find module './build.js'` | Fixed — `build.js` present |
| API boots but no requests served | Fixed — `src/index.ts` calls `app.listen` |
| Claim links 404 | Set real `BASE_URL`; or `cloudflared tunnel --url http://localhost:3001` |
| Deploy script: `Compiled artifact not found` | Use combined `EmailRemittanceVerifier.json` (present) |
| Cloudflare Pages empty build | Use `@cloudflare/next-on-pages`; output `frontend/.vercel/output` |
| Jest "100+ passing" but ~29% coverage | Add `**/src/**/*.test.ts` to `jest.config.js` |

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [PROJECT_SPEC.md](PROJECT_SPEC.md) | Definitive spec |
| [AGENTS.md](AGENTS.md) | Known bugs / gaps |
| [CHANGELOG.md](CHANGELOG.md) | Change history |
| [contracts/DEPLOYMENTS.md](contracts/DEPLOYMENTS.md) | Contract deployment record |
| [docs/SELF_PROTOCOL_INTEGRATION.md](docs/SELF_PROTOCOL_INTEGRATION.md) | Self integration |

---

## 📜 License

MIT. Built by **Titan Agent** + **Dr Deeks** for the Synthesis Hackathon 2026.
