# Email Remittance Pro - Business Plan

## Executive Summary

Email Remittance Pro enables anyone to send cryptocurrency to any email address, with recipients able to claim funds as either crypto (auto-generated wallet) or instant gift cards (Amazon, Visa, Target, etc.) — **no wallet setup required, no blockchain knowledge needed**.

We’re solving the last-mile problem in global remittances: the $600B/year market where 8-12% fees and 2-5 day settlement times burden the world’s most vulnerable populations. By using blockchain rails for settlement and offering gift card offramps, we deliver instant value transfer at 1.5% fees — **undercutting Western Union by 6.5 percentage points**.

**The Innovation:** Recipient optionality. Power users get crypto wallets. Everyone else gets gift cards. One product, zero friction.

-----

## Problem Statement

### The Remittance Market is Broken

**For Senders:**

- Traditional services (Western Union, MoneyGram) charge 3-8% fees
- Bank transfers (SWIFT) take 2-5 business days and cost $25-50
- Crypto solutions require recipient to already have a wallet + know how to use it

**For Recipients:**

- 1.4 billion people globally are unbanked — no access to traditional banking
- Setting up crypto wallets requires technical literacy (seed phrases, gas fees, exchange navigation)
- Cash pickup locations are inconvenient and often in unsafe areas
- Elderly recipients struggle with both banking apps AND crypto wallets

**The Core Friction:**
You can’t send crypto to someone who doesn’t have a wallet. Traditional onboarding (download MetaMask, secure seed phrase, understand gas fees) has 70-90% drop-off rates.

### Real-World Impact

A Filipino domestic worker in Dubai sending $200/month to her mother in rural Luzon:

- **Western Union:** $16-24 fee (8-12%), 2-3 days, mother travels 45 minutes to pickup location
- **Bank wire:** $35-50 fee, 3-5 days, mother needs bank account
- **Crypto wallet:** Mother is 67 years old and doesn’t own a computer

**Email Remittance Pro:** $3 fee (1.5%), instant delivery, mother clicks email link → selects Amazon gift card → uses it immediately at local store.

-----

## Solution

### Product Overview

**How It Works:**

**Step 1 — Sender (2 minutes):**

1. Connect crypto wallet or use service wallet mode
1. Enter recipient email address
1. Select amount in CELO/ETH/MON
1. Optional: require identity verification (Self Protocol ZK)
1. Approve transaction

**Step 2 — System (automated):**

1. Funds move to escrow smart contract
1. Venice AI fraud analysis (private inference, no data retention)
1. Mandate Protocol enforces policy limits ($100/tx, $1000/day)
1. Email sent to recipient with claim link

**Step 3 — Recipient (30 seconds):**

1. Click claim link in email
1. Choose delivery method:
- **Crypto Wallet** (auto-generated, exportable to any wallet app)
- **Gift Card** (Amazon, Visa, Target, Walmart, etc.)
1. Funds/gift card delivered instantly

**Key Features:**

- **No wallet required** — recipient chooses crypto OR gift card
- **Email as identity layer** — no phone numbers, no KYC documents
- **ZK verification optional** — prove age/nationality without revealing passport
- **Multi-chain support** — Celo (low fees), Base (Ethereum L2), Monad (high throughput)
- **Fraud prevention** — Venice AI analyzes every transaction privately
- **Smart contract escrow** — sender can reclaim after 30 days if unclaimed

-----

## Target Market

### Primary Segments

**1. Diaspora Remittances ($600B/year global market)**

**Target Users:**

- Migrant workers sending money to family back home
- 280+ million international migrants (World Bank, 2024)
- Top corridors: USA→Mexico, UAE→India, Saudi Arabia→Pakistan, USA→Philippines

**Pain Point:**
High fees eat 8-12% of transfer value. Recipients often elderly/unbanked and struggle with both traditional banking and crypto wallets.

**Our Advantage:**
Email + gift card option = zero technical barriers. Mother in rural Mexico gets Soriana gift card, uses it immediately.

**2. Crypto-to-Fiat Freelancer Payments**

**Target Users:**

- DAOs paying global contributors
- Web3 projects distributing bounties
- Crypto companies paying remote contractors

**Pain Point:**
Paying a developer in Nigeria with ETH requires them to:

1. Set up crypto wallet (10% drop-off)
1. Navigate exchanges (KYC requirements, 20% drop-off)
1. Withdraw to bank account (fees + time)

**Our Advantage:**
Pay in crypto, they get gift card instantly. No exchange friction, no KYC, usable value in 30 seconds.

**3. Unbanked/Underbanked Populations**

**Target Users:**

- 1.4 billion adults without bank accounts globally
- Smartphone penetration in emerging markets: 60-85%
- Email access: higher than bank account access

**Pain Point:**
Can’t receive traditional bank transfers. Cash pickup requires travel and is unsafe.

**Our Advantage:**
Email access is the ONLY requirement. Gift card offramp means they get usable value immediately without needing crypto knowledge.

### Market Sizing

**Total Addressable Market (TAM):**

- Global remittance market: $600B/year (World Bank, 2024)
- Average fee: 6.5%
- Total fees paid annually: $39B

**Serviceable Addressable Market (SAM):**

- Digital remittance market: $150B/year (growing 15% YoY)
- Corridors where crypto + gift cards solve real pain: ~40% = $60B
- Potential fee revenue at 1.5%: $900M

**Serviceable Obtainable Market (SOM - Year 1):**

- Conservative 0.1% market share = $60M volume
- At 1.5% fee = $900k revenue
- Assumes viral adoption in 2-3 high-volume corridors (UAE→India, USA→Mexico)

-----

## Business Model

### Revenue Streams

**1. Transaction Fees (Primary)**

- **1.5% on all transfers**
- Competitive positioning: 50-80% cheaper than Western Union/MoneyGram
- Split:
  - 0.5% blockchain gas + infrastructure
  - 0.3% gift card API fees (varies by provider)
  - 0.7% gross margin

**2. FX Spread (Secondary)**

- When converting crypto → gift card, capture 0.2-0.5% on FX
- Example: User sends $100 CELO → we buy $99.50 gift card, keep $0.50 spread
- Only applies to gift card claims, not wallet claims

**3. Premium Features (Future)**

- **Instant claim** ($1 fee) — bypass 10-minute settlement for immediate gift card
- **Batch sending** ($5/month) — send to 100+ recipients at once
- **Business API** ($50/month + per-transaction fees) — white-label for platforms

### Unit Economics (Steady State)

**Per $100 Transaction:**

|Item                        |Amount |%      |
|----------------------------|-------|-------|
|**Revenue**                 |$1.50  |1.5%   |
|Blockchain gas (Celo)       |$0.001 |0.001% |
|Gift card API fee           |$0.30  |0.3%   |
|Email delivery (Resend)     |$0.0003|0.0003%|
|Venice AI fraud check       |$0.01  |0.01%  |
|Infrastructure (AWS/Railway)|$0.02  |0.02%  |
|**Total COGS**              |$0.33  |0.33%  |
|**Gross Profit**            |$1.17  |1.17%  |

**Gross Margin: 78%**

**Break-Even Analysis:**

- Fixed costs (infra, salaries, compliance): ~$15k/month
- Break-even volume: $1.28M/month ($15k ÷ 1.17%)
- At $100 avg transaction: 12,800 transactions/month or ~420/day

### Pricing Strategy

**Core Offering:**

- 1.5% flat fee on all transactions
- No hidden fees, no FX markup (beyond gift card spread)
- Transparent pricing page showing exact fees vs competitors

**Competitive Comparison:**

|Provider                |Fee     |Settlement Time|Recipient Requirements|
|------------------------|--------|---------------|----------------------|
|Western Union           |8-12%   |2-3 days       |ID + pickup location  |
|Remitly                 |3-5%    |1-3 days       |Bank account or pickup|
|Wise                    |0.5-2%  |1-3 days       |Bank account          |
|**Email Remittance Pro**|**1.5%**|**Instant**    |**Email only**        |

-----

## Competitive Landscape

### Direct Competitors

**1. Traditional Remittance (Western Union, MoneyGram, Remitly)**

**Their Advantages:**

- Established brand trust
- Physical pickup locations globally
- Regulatory licenses in 100+ countries

**Our Advantages:**

- 5-7 percentage points cheaper
- Instant settlement (vs 2-5 days)
- No physical location needed (email + gift card)
- Better UX for digital-native younger senders

**2. Digital Remittance (Wise, WorldRemit, Xe)**

**Their Advantages:**

- Low fees (0.5-2%)
- Bank integration in many countries
- Strong compliance infrastructure

**Our Advantages:**

- **No bank account required** for recipient (gift card option)
- Crypto rails = works in countries with restricted banking
- Faster settlement (minutes vs 1-3 days)

**3. Crypto Remittance (Strike, Machankura, BitPesa)**

**Their Advantages:**

- Even lower fees (0.1-1%)
- Peer-to-peer, no intermediaries

**Our Advantages:**

- **Gift card offramp** = recipient doesn’t need to understand crypto
- Auto-wallet generation = zero setup friction
- Email-based = simpler than Lightning invoices or wallet addresses

### Competitive Moats

**1. Recipient Optionality**

- Only product offering BOTH crypto wallet AND gift card in one flow
- Everyone else forces you to pick their rails (bank account, crypto wallet, cash pickup)

**2. Email as Identity Layer**

- No phone number required (privacy + global access)
- Works in countries where SIM registration is difficult
- More accessible than wallet addresses for senders

**3. Compliance Without Surveillance**

- Self Protocol ZK verification = prove identity without storing passport data
- Venice AI fraud analysis = zero data retention after inference
- No centralized KYC database = lower regulatory liability

**4. Multi-Chain Infrastructure**

- Celo (low fees), Base (Ethereum ecosystem), Monad (high throughput)
- Not locked into one chain’s fee structure or uptime

-----

## Go-to-Market Strategy

### Phase 1: Proof of Concept (Months 1-3)

**Goal:** Validate product-market fit in one high-volume corridor

**Target:** UAE → India remittances

- 2nd largest remittance corridor globally ($20B/year)
- High smartphone penetration in India (70%+)
- Cultural affinity for gift cards (Amazon India, Flipkart)

**Tactics:**

1. **Influencer partnerships** — Indian expat YouTubers/TikTokers in UAE (10k-50k followers)
1. **WhatsApp group seeding** — expat worker communities share product virally
1. **Referral incentives** — sender gets $5 credit for every new sender they refer
1. **Community events** — sponsor cultural events in Dubai/Abu Dhabi with live demos

**Success Metrics:**

- 500 transactions in Month 3
- 40% gift card claim rate (validates the feature)
- <5% fraud rate (Venice AI + Mandate Protocol working)
- NPS >50 (strong word-of-mouth potential)

### Phase 2: Corridor Expansion (Months 4-9)

**Add 2 More High-Volume Corridors:**

1. **USA → Mexico** ($60B/year)
- Target: Hispanic community in Texas, California, Arizona
- Gift cards: Walmart, Soriana, Oxxo
1. **USA → Philippines** ($18B/year)
- Target: Filipino nurses, caregivers in USA
- Gift cards: SM Store, Robinson’s, Puregold

**Tactics:**

1. **SEO content** — “How to send money to Philippines instantly” (target 10k/mo search volume)
1. **Partnership with remittance comparison sites** — list on savvynewcanadians.com, exiap.com
1. **Community ambassadors** — pay $100/month to active expat community leaders for promotion
1. **Facebook/Instagram ads** — target expats aged 25-45 in top sending countries

**Success Metrics:**

- 5,000 transactions/month by Month 9
- $500k monthly volume
- 3 active corridors with >1,000 users each
- 60% month-over-month growth

### Phase 3: B2B2C Partnerships (Months 10-18)

**White-Label API for Platforms:**

**Target Partners:**

1. **DAOs/Web3 projects** — Gitcoin, Superfluid, Coordinape (bounty distribution)
1. **Freelance platforms** — Upwork, Fiverr (crypto-to-gift-card payout option)
1. **Crypto exchanges** — Coinbase, Binance (fiat offramp via gift cards)
1. **Payroll platforms** — Deel, Remote (pay remote workers in crypto → gift cards)

**Value Prop:**
“Add instant crypto-to-gift-card payouts to your platform with 3 lines of code. We handle compliance, fraud, and settlement.”

**Pricing:**

- $500/month API access
- 1% transaction fee (we keep 0.5%, they keep 0.5% as revenue share)

**Success Metrics:**

- 3 B2B partners signed by Month 18
- 30% of volume coming from B2B by Month 18
- $2M monthly volume

-----

## Technology & Product

### Current Architecture

**Backend:**

- **Express.js API** — REST endpoints for send/claim/status
- **SQLite database** — lightweight, migrates to PostgreSQL at scale
- **Multi-chain support** — Celo, Base, Monad via viem library
- **Email delivery** — Resend API (3,000 free emails/month, scales to millions)

**Smart Contracts:**

- **EmailRemittanceVerifier.sol** — deployed and verified on all 3 chains
- Escrow logic: funds locked until claimed or 30-day expiry
- Self Protocol integration for ZK identity verification
- Admin attestation fallback for chains without Self Hub

**Integrations:**

- **Self Protocol** — ZK passport verification (age, nationality, OFAC screening)
- **Venice AI** — fraud analysis with zero data retention
- **Mandate Protocol** — policy enforcement ($100/tx, $1000/day limits)

**Gift Card Integration (In Development):**

- **Tango Card API** — 1,000+ retailers globally (Amazon, Visa, Walmart, etc.)
- **Reloadly API** — alternative provider with broader emerging market coverage
- Fallback chain: Tango → Reloadly → manual processing

### Product Roadmap

**Q2 2026 (Months 1-3):**

- ✅ Multi-chain support (Celo, Base, Monad)
- ✅ Email delivery working
- ✅ Auto-wallet generation
- 🚧 Gift card claim flow (Tango Card integration)
- 🚧 Mobile-responsive claim page
- 🚧 Transaction history dashboard for senders

**Q3 2026 (Months 4-6):**

- Batch sending (CSV upload → send to 100+ recipients)
- Recurring remittances (monthly auto-send)
- SMS notifications (in addition to email)
- Multi-language support (Spanish, Tagalog, Hindi, Arabic)

**Q4 2026 (Months 7-9):**

- White-label API for B2B partners
- Webhook support for platforms
- Advanced fraud detection (velocity limits, device fingerprinting)
- Compliance dashboard (transaction monitoring, flagged users)

**2027:**

- Stablecoin support (USDC, USDT for price stability)
- Fiat on-ramp (buy crypto with card → send immediately)
- Loyalty program (earn points on transactions → redeem for fee discounts)
- Mobile app (iOS/Android for easier sending)

### Security & Compliance

**Smart Contract Security:**

- Escrow funds never controlled by backend (only smart contract)
- Formal verification planned for production contracts
- Multi-sig for admin functions (3-of-5)

**Privacy:**

- Self Protocol ZK = prove identity without revealing passport data
- Venice AI = fraud analysis with zero retention
- No user data sold to third parties (ever)

**Compliance:**

- OFAC sanctions screening via Self Protocol
- Transaction monitoring (Mandate Protocol)
- Age verification (18+ required for sending)
- AML compliance via Chainalysis API (planned for regulated markets)

-----

## Traction

### Hackathon Performance (March 2026)

**The Synthesis Hackathon:**

- Built in 72 hours by autonomous AI agent (Titan)
- 4 tracks entered: Venice Private Agents, Bankr, Let the Agent Cook, ERC-8004
- Live mainnet proof:
  - **Send TX:** [Celoscan](https://celoscan.io/tx/0x835a196c2f623fb7255cfb744226683697c4b7b8a0b7c3b448f3c47d49011f96)
  - **Claim TX:** [Celoscan](https://celoscan.io/tx/0x286065753240aac433f3c69f7af57d94fb4d73ad507cd088ff5a230807a1bb02)
- Real email delivery verified (proof in repo)
- 150 tests passing

**Technical Validation:**

- Smart contracts deployed and verified on 3 chains
- End-to-end flow working on mainnet (not testnet)
- Professional codebase with enterprise patterns
- Full documentation and setup guide

### Current Metrics (Pre-Launch)

- **GitHub Stars:** 0 (repo just published)
- **Email List:** 0 (no marketing yet)
- **Beta Users:** 0 (launching post-hackathon)
- **Test Transactions:** 4 mainnet TXs (personal wallet + service wallet modes)

**Next 30 Days:**

- Launch beta in UAE→India corridor
- Target: 50 beta testers (expat workers in Dubai)
- Goal: 100 test transactions to validate UX

-----

## Financial Projections

### Revenue Forecast (Conservative)

|Metric             |Month 3|Month 6|Month 12|Month 24|
|-------------------|-------|-------|--------|--------|
|**Transactions**   |500    |2,000  |10,000  |50,000  |
|**Avg Transaction**|$100   |$100   |$120    |$150    |
|**Monthly Volume** |$50k   |$200k  |$1.2M   |$7.5M   |
|**Revenue (1.5%)** |$750   |$3,000 |$18,000 |$112,500|
|**Annual Run Rate**|$9k    |$36k   |$216k   |$1.35M  |

### Expense Forecast (Conservative)

|Category            |Monthly (Month 3)|Monthly (Month 12)|Monthly (Month 24)|
|--------------------|-----------------|------------------|------------------|
|**Infrastructure**  |$200             |$500              |$2,000            |
|**Gift Card Fees**  |$150             |$600              |$3,750            |
|**Salaries**        |$0               |$10,000           |$30,000           |
|**Marketing**       |$500             |$2,000            |$10,000           |
|**Compliance/Legal**|$100             |$500              |$2,000            |
|**Total**           |$950             |$13,600           |$47,750           |

### Profitability Timeline

- **Month 3:** -$200/month (covers infra, barely)
- **Month 6:** -$10,600/month (need funding or revenue growth)
- **Month 12:** +$4,400/month (break-even crossed)
- **Month 24:** +$64,750/month (profitable, scales from here)

### Funding Requirements

**Seed Round: $150k (12-month runway)**

**Use of Funds:**

- $60k — Engineering (1 full-stack engineer for 12 months)
- $40k — Marketing/growth (influencer partnerships, ads, community)
- $20k — Compliance (legal structure, licenses for regulated corridors)
- $15k — Infrastructure (servers, APIs, blockchain gas)
- $15k — Buffer/contingency

**Milestones:**

- Month 6: 2,000 transactions/month, 3 active corridors
- Month 12: 10,000 transactions/month, 1 B2B partner signed
- Month 18: Break-even, 30,000 transactions/month
- Month 24: $1.35M annual revenue, ready for Series A

-----

## Team

### Current Team

**Titan (AI Agent) — Technical Founder**

- Built entire MVP autonomously in 72 hours
- FID: 3083838 (Farcaster), @titan-agent
- Agent wallet: 0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4a
- ERC-8004 on-chain identity verified

**Dr. Deeks (Human Founder) — Product & Strategy**

- Single father, full-stack developer
- GitHub: @drdeeks
- ENS: drdeeks.base.eth
- Built on: ThinkPad, 3.7GB RAM, $0 budget
- Prior work: OpenClaw (multi-agent orchestration), Web3 tools

### Hiring Plan (Post-Seed)

**Month 3-6:**

- **Full-Stack Engineer** ($5k/month) — React, Node.js, Solidity
- **Growth/Marketing Lead** (contractor, $2k/month) — expat community marketing

**Month 9-12:**

- **Compliance Officer** (part-time, $3k/month) — licensing, KYC/AML
- **Customer Support** (contractor, $1.5k/month) — handle user inquiries

**Month 18+:**

- **Head of Partnerships** ($8k/month) — B2B deals, white-label API
- **Mobile Engineer** ($6k/month) — iOS/Android app

-----

## Risks & Mitigation

### Key Risks

**1. Regulatory Compliance**

**Risk:** Money transmission licenses required in many jurisdictions. Crypto regulations vary wildly by country.

**Mitigation:**

- Start with crypto-friendly jurisdictions (UAE, El Salvador, Switzerland)
- Partner with licensed entities (Tango Card already handles gift card compliance)
- Self Protocol ZK verification = built-in KYC/AML from day 1
- Legal counsel before entering regulated markets (USA, EU)

**2. Gift Card Liquidity**

**Risk:** If Tango Card or Reloadly shuts down API access, gift card claims break.

**Mitigation:**

- Multi-provider fallback (Tango → Reloadly → manual processing)
- Build direct relationships with retailers (Amazon, Walmart) for bulk gift card purchasing
- Crypto wallet option always available as backup

**3. Fraud/Scams**

**Risk:** Stolen credit cards → buy crypto → send via our platform → cash out as gift cards.

**Mitigation:**

- Venice AI fraud analysis on every transaction
- Mandate Protocol enforces $100/tx, $1000/day limits
- Self Protocol verification for high-value sends
- Transaction monitoring dashboard flags suspicious patterns
- 24-hour hold on first transaction per sender wallet

**4. Crypto Volatility**

**Risk:** CELO/ETH price swings during settlement could cause losses.

**Mitigation:**

- Add stablecoin support (USDC, USDT) for price-stable transfers
- Instant settlement (seconds, not hours) minimizes exposure
- FX hedging via DEX swaps (Uniswap) if needed

**5. User Adoption**

**Risk:** Senders don’t trust new platform, recipients don’t understand how to claim.

**Mitigation:**

- Video tutorials in claim emails (30-second walkthrough)
- 24/7 support via WhatsApp/Telegram (expat-friendly)
- Referral program (senders become advocates)
- Partner with trusted community leaders in expat groups

-----

## Success Metrics (KPIs)

### Product Metrics

- **Transaction Volume** (target: $1M/month by Month 12)
- **Transaction Count** (target: 10,000/month by Month 12)
- **Claim Rate** (% of emails that get claimed, target: >80%)
- **Gift Card vs Wallet Split** (hypothesis: 60% gift card, 40% wallet)
- **Time to Claim** (target: <2 hours median)

### Growth Metrics

- **Monthly Active Senders** (target: 3,000 by Month 12)
- **Repeat Rate** (% who send 2+ times, target: >40%)
- **Referral Rate** (% of new users from referrals, target: >25%)
- **CAC (Customer Acquisition Cost)** (target: <$10)
- **LTV (Lifetime Value)** (target: >$50)

### Operational Metrics

- **Fraud Rate** (target: <2%)
- **Failed Transactions** (target: <1%)
- **Support Tickets per 1000 TXs** (target: <5)
- **Email Delivery Rate** (target: >99%)
- **Claim Page Load Time** (target: <2 seconds)

-----

## Why Now?

**1. Crypto Infrastructure Maturity**

- Layer 2s (Base, Optimism, Arbitrum) = $0.01-0.10 transaction fees
- Stablecoins = remove volatility risk
- Celo = mobile-first blockchain with 6-second blocks

**2. Remittance Market Digitization**

- COVID accelerated digital remittance adoption
- 45% of remittances now sent digitally (up from 28% in 2019)
- Younger generation sending = more comfortable with crypto

**3. Privacy Tech Maturity**

- Self Protocol ZK verification = compliant identity without surveillance
- Venice AI = fraud detection without data retention
- On-chain compliance possible without centralized KYC databases

**4. Gift Card Acceptance**

- Amazon operates in 100+ countries
- Visa/Mastercard gift cards accepted everywhere
- Gift cards = default “cash alternative” for digital-native users

**5. Regulatory Tailwinds**

- UAE: crypto-friendly regulations, no cap gains tax
- El Salvador: Bitcoin legal tender
- MiCA (EU): clear framework for crypto services
- Clearer rules = easier to build compliant product

-----

## Appendix

### Technical Deep Dive

**Smart Contract Architecture:**

```solidity
contract EmailRemittanceVerifier {
    struct Escrow {
        address sender;
        uint256 amount;
        bytes32 emailHash;  // keccak256(email)
        uint256 expiresAt;
        bool claimed;
    }
    
    // Recipient claims with ZK proof or admin attestation
    function claim(bytes32 emailHash, zkProof, recipientAddress) external;
    
    // Sender reclaims after 30 days if unclaimed
    function reclaim(bytes32 emailHash) external;
}
```

**API Endpoints:**

```
POST /api/remittance/send
  - Body: { senderEmail, recipientEmail, amount, chain, walletMode, requireAuth }
  - Returns: { remittanceId, claimToken, txHash, claimUrl }

GET /api/remittance/claim/:token
  - Query: ?wallet=0x... OR ?giftCard=amazon
  - Returns: { txHash, walletAddress, privateKey } OR { giftCardCode, retailer }

GET /api/remittance/status/:id
  - Returns: { status, amount, chain, claimedAt, expiresAt }
```

### Competitor Analysis

|Feature         |Western Union     |Wise             |Strike          |**Email Remittance Pro**|
|----------------|------------------|-----------------|----------------|------------------------|
|Fee             |8-12%             |0.5-2%           |0.5%            |**1.5%**                |
|Settlement      |2-3 days          |1-3 days         |Instant         |**Instant**             |
|Recipient Needs |ID + pickup       |Bank account     |Lightning wallet|**Email only**          |
|Gift Card Option|❌                 |❌                |❌               |**✅**                   |
|Crypto Option   |❌                 |❌                |✅               |**✅**                   |
|Global Coverage |✅ (200+ countries)|✅ (80+ countries)|❌ (10 countries)|**🚧 (launching)**       |

### Press & Media

**Hackathon Coverage:**

- The Synthesis Hackathon: [Project Listing](https://devfolio.co/projects/email-remittance-pro)
- Moltbook: [@titan_192](https://www.moltbook.com/u/titan_192)
- Farcaster: [@titan-agent](https://farcaster.xyz/titan-agent)

**Planned Media Outreach:**

- TechCrunch: pitch to crypto/fintech reporters
- CoinDesk: “AI agent builds remittance product in 72 hours”
- Product Hunt: launch post-beta
- Expat community blogs/podcasts

-----

## Contact

**Email:** titan_192@outlook.com  
**GitHub:** https://github.com/drdeeks/email-remittance-pro  
**Demo:** [YouTube Short](https://youtube.com/shorts/PqpikcI95UQ?si=CmP7q37dKw9DNqs4)  
**Agent Wallet (Celo/Base):** 0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A

-----

*Last Updated: March 2026*  
*Version: 1.0*  
*Status: Pre-Launch, Post-Hackathon*