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
                   Claim link → auto-generates wallet
                            ↓
                   Funds on-chain. Done.
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

**Two live mainnet transactions. Real email delivered. Real wallet auto-generated. Real CELO claimed — from a mobile phone, via a public URL, with zero wallet setup by the recipient.**

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

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- Celo wallet with CELO (for sending)
- Resend API key (free tier works — 3,000 emails/month)
- Venice AI API key (optional — for fraud analysis)

### Installation

```bash
git clone https://github.com/drdeeks/email-remittance-celo.git
cd email-remittance-celo
npm install
npm run build
```

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

### Supported Chains & Auto-Switching

The `chain` field auto-routes to the correct network. No manual RPC switching needed.

| `chain` value | Network | Native Currency | Explorer |
|--------------|---------|----------------|---------|
| `celo` | Celo Mainnet | CELO | celoscan.io |
| `base` | Base Mainnet | ETH | basescan.org |

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
git clone https://github.com/drdeeks/email-remittance-celo.git
cd email-remittance-celo
npm install && npm run build

# Set up as a systemd service
cat > /etc/systemd/system/remittance.service << EOF
[Unit]
Description=Email Remittance Celo
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/email-remittance-celo
EnvironmentFile=/home/ubuntu/email-remittance-celo/.env
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

**16 tests passing** — covering remittance flow, email delivery, policy enforcement, and claim processing.

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
email-remittance-celo/
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
└── tests/                  # Jest test suite (16 passing)
```

---

## 🎯 TRACK ELIGIBILITY

### 🥇 Best Agent on Celo ($5k)
Real Celo mainnet activity. Email as identity layer. Autonomous remittance flow. Zero human intervention after sender initiates. Live TX proof on celoscan.

### 🔐 Best Self Protocol Integration ($1k)
ZK verification for compliance without doxxing. Prove sender/recipient identity without revealing PII. Compliance-ready while preserving privacy.

### 🕵️ Private Agents, Trusted Actions / Venice ($11.5k)
Venice AI fraud analysis — private inference, zero data retention. Every remittance analyzed for risk without storing transaction details.

### 🍳 Let the Agent Cook ($4k)
Built autonomously by Titan Agent. Zero human code written. ThinkPad, 3.7GB RAM, $0 budget. Full autonomous build from concept to mainnet.

### 📜 Agents With Receipts / ERC-8004 ($4k)
`agent.json` + `agent_log.json` present. On-chain identity via ERC-8004. Every transaction logged with reasoning. Full provenance chain.

---

## 🤖 Built by Titan Agent

**Autonomous build on OpenClaw (claude-opus-4-5)**

- Agent: Titan | Platform: OpenClaw
- Hardware: ThinkPad, 3.7GB RAM | Budget: $0
- Agent wallet: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`

This entire project — architecture, code, tests, deployment — was built autonomously by an AI agent. The human provided the goal; the agent did everything else.

---

## License

MIT © 2026 Titan Agent
