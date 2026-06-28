# Remittance-Pro — ENTERPRISE BLUEPRINT

## Version 1.0 | Document Class: MASTER SPECIFICATION
### Generated: 2026-06-27

> **READ FIRST — DOCUMENT AUTHORITY**
> This document is the single source of truth for the Remittance-Pro platform.
> No changes may be made without referencing this blueprint. The change log
> at the bottom is append-only. All implementations must follow the
> specifications, modules, and quality standards defined herein.

---

# Table of Contents

- [PART I — SYSTEM OVERVIEW & ARCHITECTURE](#part-i--system-overview--architecture)
- [PART II — MODULE REGISTRY](#part-ii--module-registry)
- [PART III — SCREEN & FEATURE SPECIFICATIONS](#part-iii--screen--feature-specifications)
- [PART IV — DATA ARCHITECTURE](#part-iv--data-architecture)
- [PART V — CHANGE CONTROL PROTOCOL](#part-v--change-control-protocol)
- [PART VI — MASTER IMPLEMENTATION CHECKLIST](#part-vi--master-implementation-checklist)
- [PART VII — QUALITY & COMPLIANCE STANDARDS](#part-vii--quality--compliance-standards)
- [CHANGE LOG](#change-log)

---

# PART I — SYSTEM OVERVIEW & ARCHITECTURE

> **Rollback Tag:** `[SYS-OVERVIEW-v1]`

## 1.1 Vision Statement

Transform the Remittance-Pro hackathon prototype into an enterprise-grade,
production-ready cross-chain email remittance platform with privacy-preserving
human verification (World ID + Human Passport), adhering to modular architecture,
security hardening, and zero-placeholder code standards.

## 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Frontend   │  │  World ID   │  │  Human Passport         │  │
│  │  (Next.js)  │◄─┤  Widget     │  │  Stamp Aggregation      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express.js + Rate Limiting + Auth Middleware + ZK Verify │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  CORE SERVICES  │ │  IDENTITY LAYER │ │  ONCHAIN LAYER  │
│  • Email Parser │ │  • World ID     │ │  • EmailRemit   │
│  • Fee Engine   │ │    Verifier     │ │    Verifier     │
│  • Claim Logic  │ │  • Passport     │ │  • Multi-chain  │
│  • Notifications│ │    Scorer       │ │    Deployer     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ PostgreSQL  │  │   Redis     │  │  Blockchain (EVM)       │  │
│  │  (Primary)  │  │  (Cache/    │  │  • Celo / Base /        │  │
│  │             │  │   Sessions) │  │    Optimism / World Ch  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.3 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind | App Router, server components, type safety |
| Backend | Node.js + Express + TypeScript | Mature ecosystem, team familiarity |
| Database | PostgreSQL (Supabase/Neon) | ACID, JSON support, managed free tiers |
| Cache | Redis (Upstash) | Serverless, free tier, session storage |
| Smart Contracts | Solidity 0.8.24 + Hardhat | Industry standard, upgradeable proxies |
| Identity | World ID (Primary) + Human Passport (Fallback) | Free tier, ZK proofs, onchain verification, privacy-preserving |
| CI/CD | GitHub Actions | Native integration, free for public repos |
| Monitoring | Sentry (free) + custom health checks | Error tracking, uptime |
| Deployment | Vercel (frontend) + Railway/Render (backend) | Free tiers, git-based deploy |

---

# PART II — MODULE REGISTRY

> **Rollback Tag:** `[MODULE-REGISTRY-v1]`

| Module ID | Name | Description | Feature Flag |
|-----------|------|-------------|--------------|
| MOD-001 | Core Infrastructure | Repository, CI/CD, monitoring, database, config management | FEAT_INFRA |
| MOD-002 | Identity Verification | World ID + Human Passport integration for Sybil resistance | FEAT_IDENTITY |
| MOD-003 | Email Remittance Core | Email parsing, validation, fee calculation, claim processing | FEAT_EMAIL_REMIT |
| MOD-004 | Onchain Verification | EmailRemittanceVerifier contract, multi-chain deployment | FEAT_ONCHAIN |
| MOD-005 | Claim & Payout Flow | Wallet connection, claim execution, transaction monitoring | FEAT_CLAIM |
| MOD-006 | Admin & Analytics | Dashboard, metrics, audit logs, fee management | FEAT_ADMIN |
| MOD-007 | Security Hardening | Rate limiting, secrets management, input validation, audit | FEAT_SECURITY |

---

# PART III — SCREEN & FEATURE SPECIFICATIONS

> **Rollback Tag:** `[SPECS-v1]`

## Screen 1 — Identity Verification Landing

```
SCREEN ID     : SCR-001
MODULE REF    : MOD-002
ROLLBACK TAG  : [SCR-001-v1]
FEATURE FLAG  : FEAT_IDENTITY
```

**Purpose:** User proves unique humanity before accessing remittance features.

**Components:**
- World ID widget (IDKit integration)
- Human Passport connect button
- Verification status display with score
- Fallback options panel

**Rules:**
1. Must verify World ID (orb or device) OR achieve Human Passport score >= 20
2. Nullifier stored per-action to prevent double-claims
3. Verification result cached in Redis for 24 hours
4. Verification status returned as JWT claim

**Error States:**
- Orb unavailable: offer device verification
- Passport API down: cache last known score, retry with backoff
- Network failure: allow offline verification with re-sync on reconnect

**Fallback:** Human Passport if World ID fails; email-only mode with rate limiting (last resort)

## Screen 2 — Send Remittance

```
SCREEN ID     : SCR-002
MODULE REF    : MOD-003
ROLLBACK TAG  : [SCR-002-v1]
FEATURE FLAG  : FEAT_EMAIL_REMIT
```

**Purpose:** Sender creates email-based remittance with fee transparency.

**Components:**
- Recipient email input with RFC 5322 validation
- Amount input with currency selector
- Fee preview card (base + percentage breakdown)
- Memo field (optional, 280 char limit)
- Submit button with loading state

**Rules:**
1. Email format validated RFC 5322
2. Amount > minimum threshold (configurable per chain)
3. Fee calculated: base_fee_usd + (percentage_fee_bps / 10000) * amount
4. Creates pending claim record with UUID v4, expires in 7 days
5. Idempotency key required for all submissions

**Error States:**
- Invalid email: inline field error
- Insufficient balance: toast notification
- Network error: retry with idempotency key

**Fallback:** Queue for async processing if blockchain congested

## Screen 3 — Claim Remittance

```
SCREEN ID     : SCR-003
MODULE REF    : MOD-005
ROLLBACK TAG  : [SCR-003-v1]
FEATURE FLAG  : FEAT_CLAIM
```

**Purpose:** Recipient claims funds via email link + identity verification.

**Components:**
- Claim token validation (URL parameter)
- Identity re-verification prompt
- Wallet connect (WalletConnect)
- Amount and fee display
- Claim button with tx status
- Transaction history link

**Rules:**
1. Claim token single-use, validated onchain via nullifier
2. Must re-verify identity at claim time (prevents link sharing)
3. Gas sponsored for first claim (configurable limit)
4. Updates claim status: PENDING -> PROCESSING -> COMPLETED/FAILED

**Error States:**
- Expired claim: redirect to sender with notification
- Already claimed: show original transaction hash
- Wallet rejection: retry with updated gas estimate

**Fallback:** Manual claim via admin if automated fails

---

# PART IV — DATA ARCHITECTURE

> **Rollback Tag:** `[DATA-ARCH-v1]`

## 4.1 Core Database Schemas

```sql
-- Users table (identity-verified humans)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id_nullifier VARCHAR(66) UNIQUE,
    passport_score INTEGER DEFAULT 0,
    passport_stamps JSONB DEFAULT '[]',
    wallet_address VARCHAR(42) UNIQUE,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'banned'))
);
COMMENT ON TABLE users IS 'INSERT-only for audit; UPDATE only via admin';

-- Remittances (email-based transfers)
CREATE TABLE remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_id UUID REFERENCES users(id),
    amount_usd DECIMAL(18,6) NOT NULL,
    amount_tokens DECIMAL(36,18) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    fee_usd DECIMAL(18,6) NOT NULL,
    fee_tokens DECIMAL(36,18) NOT NULL,
    claim_token VARCHAR(66) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_remittances_claim_token ON remittances(claim_token);
CREATE INDEX idx_remittances_sender ON remittances(sender_id);
CREATE INDEX idx_remittances_recipient ON remittances(recipient_id);
COMMENT ON TABLE remittances IS 'INSERT-only; status transitions only';

-- Identity verification attempts (audit)
CREATE TABLE identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    provider VARCHAR(30) NOT NULL
        CHECK (provider IN ('world_id', 'human_passport', 'brightid', 'poh')),
    action VARCHAR(50) NOT NULL,
    nullifier VARCHAR(66),
    proof JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE identity_verifications IS 'INSERT-only audit log';

-- Fee configuration (admin managed)
CREATE TABLE fee_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id INTEGER NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    base_fee_usd DECIMAL(18,6) DEFAULT 0,
    percentage_fee_bps INTEGER DEFAULT 100,
    min_fee_usd DECIMAL(18,6) DEFAULT 0.10,
    max_fee_usd DECIMAL(18,6) DEFAULT 10.00,
    gas_sponsor_enabled BOOLEAN DEFAULT TRUE,
    gas_sponsor_limit_usd DECIMAL(18,6) DEFAULT 1.00,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (chain_id, token_address)
);
```

## 4.2 API Contract Specifications

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/identity/verify | Verify World ID / Passport proof | None (public) |
| GET | /api/v1/identity/status/:address | Get verification status + score | JWT |
| POST | /api/v1/remittance/create | Create new email remittance | JWT |
| GET | /api/v1/remittance/:claimToken | Get claim details (public) | None |
| POST | /api/v1/remittance/claim | Claim remittance + verify identity | JWT + proof |
| GET | /api/v1/remittance/history | User's sent/received history | JWT |
| POST | /api/v1/admin/fees | Update fee config | Admin JWT |
| GET | /api/v1/admin/metrics | Platform metrics | Admin JWT |
| GET | /api/v1/health | Health check | None |

---

# PART V — CHANGE CONTROL PROTOCOL

> **Rollback Tag:** `[CHANGE-CONTROL-v1]`

## Change Log Entry Format (Append-Only)

```
Date        : YYYY-MM-DD HH:MM UTC
Contributor : [agent-name]
Modules     : [MOD-XXX, MOD-YYY]
Section Tags: [[TAG-v1], [TAG-v2]]
Files Changed: [complete list of every file]
Description : [Minimum 3 sentences: what changed, why it changed, what
              impact it has on adjacent systems or the overall specification.]
Tests Passing: [test names — never 'all tests']
Phase       : [PHASE-N]
Rollback Ref: [git commit hash or migration rollback filename]
```

## Contributor Rules (Minimum 6)

1. All changes must reference a Module ID from Part II
2. Every change log entry must include Section Tags from rollback tags
3. No direct pushes to main — all changes via PR with CI passing
4. Database migrations require rollback file in same PR
5. Feature flags must default to `disabled` in production
6. Zero placeholders (TODO/FIXME/TBD) in committed code

## Rollback Procedure Hierarchy

1. **Flag** — Disable feature flag (instant, no deploy)
2. **API** — Revert API to previous version (deploy previous image)
3. **Database** — Execute rollback migration (tested in staging)
4. **Emergency** — Full blue-green rollback to previous release tag

---

# PART VI — MASTER IMPLEMENTATION CHECKLIST

> **Rollback Tag:** `[PHASE-0-v1]`

## Phase 0: Pre-Build (Enterprise Setup)

**Section Tag:** `[PHASE-0-v1]` | **Feature Flag:** `FEAT_PRE_BUILD`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** N/A — first phase

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] Repository restructured to enterprise modular file tree
- [ ] CI/CD pipeline configured with: security scan, placeholder scan, structure validation, tests
- [ ] CHANGELOG.md created with append-only enforcement (git hook + CI)
- [ ] .gitignore hardened per Security & Gitignore Standards
- [ ] .secrets/ directory created with 700 permissions
- [ ] Feature flag system initialized; all flags default `disabled`
- [ ] Module registry (Part II) populated in config/database
- [ ] Monitoring (Sentry) + health checks connected to staging
- [ ] Local development setup documented and verified on clean machine

### Phase Validation Gate
> This phase is complete when: CI is green, monitoring is live, feature
> flags are operational, and a second engineer can set up the dev environment
> from the documentation alone without assistance.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-1-v1]`

## Phase 1: Foundation & Infrastructure

**Section Tag:** `[PHASE-1-v1]` | **Feature Flag:** `FEAT_FOUNDATION`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 0 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] All database schemas from Part IV created via versioned migrations with rollback files
- [ ] Standard API envelope implemented and unit-tested
- [ ] Base API routing structure established (all routes return 501 until implemented)
- [ ] Authentication middleware skeleton (validates JWT shape)
- [ ] Error code registry implemented and typed
- [ ] Shared utilities: logging, config, retry, circuit breaker
- [ ] Redis session/cache layer with TTL policies
- [ ] All Part IV schemas validated against spec

### Phase Validation Gate
> All schemas apply and roll back cleanly on a fresh database. The base API
> returns the standard envelope on all routes (200 or 501). No existing
> test regresses.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-2-v1]`

## Phase 2: Identity Verification (World ID + Human Passport)

**Section Tag:** `[PHASE-2-v1]` | **Feature Flag:** `FEAT_IDENTITY`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 1 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] World ID SDK (@worldcoin/idkit) integrated frontend + backend verification
- [ ] World ID onchain verifier contract deployed (WorldIDRouter + WorldIDVerifier proxy)
- [ ] Human Passport API integrated (score >= 20 threshold, stamp aggregation)
- [ ] Identity verification endpoint: accepts proof, verifies, stores nullifier, returns JWT
- [ ] Nullifier tracking per-action (prevents double-claims)
- [ ] Verification status caching (Redis, 24h TTL)
- [ ] Fallback chain: World ID orb -> World ID device -> Human Passport -> rate-limited email-only
- [ ] All Part III identity screen specs (SCR-001) implemented
- [ ] E2E test: new user World ID verification -> JWT -> claim flow

### Phase Validation Gate
> World ID verification E2E test passes. Returning user session restore test
> passes. Nullifier prevents replay. Circuit breaker tested.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-3-v1]`

## Phase 3: Email Remittance Core

**Section Tag:** `[PHASE-3-v1]` | **Feature Flag:** `FEAT_EMAIL_REMIT`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 2 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] Email parsing/validation service (RFC 5322 + MX check optional)
- [ ] Fee engine: dynamic calculation from fee_config table
- [ ] Create remittance endpoint: validates identity, creates record, generates claim token
- [ ] Claim token: UUID v4, single-use, 7-day expiry, stored with nullifier binding
- [ ] Email notification service (SendGrid/Resend) with template for claim link
- [ ] Idempotency keys for all mutating endpoints
- [ ] All Part III send remittance specs (SCR-002) implemented
- [ ] Unit tests >= 80% coverage on fee engine, token generation, validation

### Phase Validation Gate
> Fee calculation matches config. Claim tokens unique and non-guessable.
> Email sends in staging. Coverage report shows >= 80%.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-4-v1]`

## Phase 4: Onchain Verification & Claim Execution

**Section Tag:** `[PHASE-4-v1]` | **Feature Flag:** `FEAT_ONCHAIN`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 3 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] EmailRemittanceVerifier.sol upgraded: supports World ID nullifier verification onchain
- [ ] Multi-chain deployment scripts (Celo, Base, Optimism, World Chain) via Hardhat
- [ ] Upgradeable proxy pattern (UUPS) for verifier contract
- [ ] Claim execution endpoint: verifies identity proof + nullifier onchain, executes transfer
- [ ] Gas sponsorship for first claim (configurable limit)
- [ ] Transaction monitoring: watches for confirmation, updates remittance status
- [ ] All Part III claim specs (SCR-003) implemented
- [ ] Integration test: full flow send -> verify -> claim -> onchain confirm

### Phase Validation Gate
> Every external dependency has a passing mock-failure integration test.
> Circuit breaker activates correctly when a dependency is mocked as
> unavailable. On-chain verification cannot be bypassed by a stale cache.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-5-v1]`

## Phase 5: Admin, Analytics & Security Hardening

**Section Tag:** `[PHASE-5-v1]` | **Feature Flag:** `FEAT_ADMIN`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 4 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] Admin dashboard: fee config, user management, remittance oversight, metrics
- [ ] Platform metrics: volume, users, verification rates, error rates, latency p95
- [ ] Audit logs: all admin actions, identity verifications, remittance state changes
- [ ] Rate limiting: per-IP, per-user, per-endpoint (Redis-backed)
- [ ] Input validation: Zod schemas on all endpoints
- [ ] Secrets rotation protocol documented and tested
- [ ] Penetration test scope defined and executed (OWASP Top 10)
- [ ] All FAIL items from validate_blueprint.py resolved

### Phase Validation Gate
> Rate limiting blocks abuse. Admin actions audited. Pen test no critical
> findings. Blueprint 0 FAIL.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

> **Rollback Tag:** `[PHASE-6-v1]`

## Phase 6: Launch & Live Ops

**Section Tag:** `[PHASE-6-v1]` | **Feature Flag:** `ALL`
**Status:** `NOT STARTED` | **Assigned Agent:** _unassigned_
**Prerequisite:** Phase 5 must be `COMPLETE`

### Pre-Phase Gate
- [ ] Prior phase change log entry written and appended.
- [ ] Prior phase CI tests passing (green).
- [ ] Feature flag for this phase created and set to `disabled` in production.
- [ ] Database migration rollback files prepared for this phase.
- [ ] Agent assignment confirmed in `assignments.json`.

### Implementation Steps
- [ ] All feature flags enabled in production in defined rollout order
- [ ] Post-launch monitoring dashboards live (Sentry + custom metrics)
- [ ] Runbooks created for each P0 failure mode (what to do, who to page)
- [ ] Rollback procedure tested in staging: full rollback completes within 15 min
- [ ] Data export (GDPR) verified functional in production
- [ ] Final change log entry written documenting production launch
- [ ] Blueprint marked FINAL in document header

### Phase Validation Gate
> All flags enabled. Monitoring shows no anomalous error rates. Rollback
> tested. Final change log entry appended. Blueprint version updated.

### Agent Sign-Off
**Name:** _unassigned_ | **Date:** _TBD_ | **Commit:** _TBD_

---

# PART VII — QUALITY & COMPLIANCE STANDARDS

> **Rollback Tag:** `[QUALITY-v1]`

## Error Handling Standards (5-Level Hierarchy)

| Level | Description | Response |
|-------|-------------|----------|
| L1 - User Input | Invalid form data | 400 with friendly message, field-level details |
| L2 - Business Logic | Business rule violation | 409/422 with actionable guidance |
| L3 - External Dependency | Service unavailable | 503 with retry-after, circuit breaker state |
| L4 - System | Internal error | 500 with correlation ID, logged to Sentry, no stack traces to user |
| L5 - Critical | System failure | 500 with immediate alert, auto-rollback trigger, incident created |

## Testing Requirements

| Type | Coverage Target | Scope |
|------|----------------|-------|
| Unit | >= 80% | All modules, fee engine, validators, utils |
| Integration | 100% endpoints | Success + error cases for each API |
| E2E | Critical flows | Send->verify->claim, admin operations |
| Load | 2x expected | p95 < 500ms API, p95 < 2s claim execution |
| Security | OWASP Top 10 | Auth, injection, rate limit, secrets |

## Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Page Load (LCP) | < 2.5s | Vercel Analytics |
| API p95 | < 500ms | Custom middleware |
| Claim Execution p95 | < 30s (incl. onchain) | End-to-end timer |
| Background Job | < 60s | Queue processor |
| Database Query p95 | < 100ms | pg_stat_statements |

---

# CHANGE LOG

```
Date        : 2026-06-27 23:15 UTC
Contributor : enterprise-architect
Modules     : [MOD-001, MOD-002, MOD-003, MOD-004, MOD-005, MOD-006, MOD-007]
Section Tags: [[SYS-OVERVIEW-v1], [MODULE-REGISTRY-v1], [SPECS-v1], [DATA-ARCH-v1], [CHANGE-CONTROL-v1], [PHASE-0-v1], [PHASE-1-v1], [PHASE-2-v1], [PHASE-3-v1], [PHASE-4-v1], [PHASE-5-v1], [PHASE-6-v1], [QUALITY-v1]]
Files Changed: [blueprint.md (created)]
Description : Created enterprise-grade blueprint for Remittance-Pro post-hackathon transformation. Defines 7-module architecture with World ID + Human Passport identity layer, 6-phase implementation plan with validation gates, enterprise file tree standard, security hardening, and zero-placeholder policy. Identifies 30+ hackathon artifacts for archival and recommends World ID as primary free/secure onchain proof of human.
Tests Passing: N/A (blueprint creation)
Phase       : PHASE-0
Rollback Ref: N/A (initial creation)
```
