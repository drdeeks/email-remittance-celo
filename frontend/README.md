# Email Remittance Pro — Frontend

Send crypto to any email. Recipient claims with zero wallet setup.
Supports Celo · Base · Monad. Optional Self Protocol ZK verification.

---

## The Backend URL Problem (and the fix)

The frontend calls a backend API. If that backend is running on `localhost` or a temporary Cloudflare tunnel, **the URL changes every restart** — breaking all claim links in delivered emails.

**The fix: deploy the backend to a permanent host.** Once deployed, you get a URL like `https://email-remittance-pro.up.railway.app` that never changes. Set it once, forget it.

---

## Option A — Railway (Recommended, ~$5/month)

Railway gives you a permanent `*.up.railway.app` URL, auto-restarts on crash, and zero server management.

**Deploy in 3 steps:**

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `drdeeks/email-remittance-pro` (root directory, not `frontend/`)
3. Add environment variables in Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `WALLET_PRIVATE_KEY` | Your wallet private key |
   | `RESEND_API_KEY` | From resend.com |
   | `CELO_RPC_URL` | `https://forno.celo.org` |
   | `BASE_URL` | *(leave blank — Railway sets this automatically)* |
   | `DB_PATH` | `./remittance.db` |

4. Railway assigns a permanent URL. Copy it.

Then configure the frontend:
```bash
cd frontend
API_URL=https://your-app.up.railway.app node setup.js
```
Redeploy the Vercel frontend. Done — permanent URL, never changes.

---

## Option B — Render (Free tier available)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect `drdeeks/email-remittance-pro`
3. Set:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Add the same environment variables as above
5. Render assigns a permanent `*.onrender.com` URL

```bash
cd frontend
API_URL=https://your-app.onrender.com node setup.js
```

> **Note:** Free tier spins down after 15 min of inactivity. Paid tier stays always-on.

---

## Option C — Fly.io (Free tier, global low-latency)

```bash
npm install -g flyctl
cd ..  # root of email-remittance-pro
fly launch
fly secrets set WALLET_PRIVATE_KEY=0x... RESEND_API_KEY=re_...
fly deploy
```
Fly assigns a permanent `*.fly.dev` URL.

---

## Local Setup (no permanent URL — for testing only)

```bash
cd frontend
echo "API_URL=http://localhost:3001" > .env
node setup.js
```
Open `public/index.html`. Backend must be running on port 3001.

**To share temporarily** (claim links will break when tunnel restarts):
```bash
# Terminal 1
cd ..  && npm start

# Terminal 2
cloudflared tunnel --url http://localhost:3001 --no-autoupdate
# Gives you: https://xxxx-xxxx.trycloudflare.com

# Terminal 3
cd frontend
API_URL=https://xxxx-xxxx.trycloudflare.com node setup.js
```

---

## Deploy Frontend to Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `drdeeks/email-remittance-pro`
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `node setup.js`
   - **Output Directory:** `public`
3. Environment Variables:
   ```
   API_URL = https://your-permanent-backend-url.up.railway.app
   ```
4. Deploy.

**When backend URL changes:** update `API_URL` in Vercel → Redeploy. Nothing else.

---

## How setup.js works

One script, generates everything:

```bash
node setup.js                                    # reads from .env
API_URL=https://myapp.up.railway.app node setup.js  # from shell
```

Generates:
- `public/config.js` — runtime config loaded by all HTML pages
- `vercel.json` — Vercel rewrite rules with correct backend URL
- `.env.local` — local dev reference

Both `config.js` and `.env.local` are gitignored — environment-specific, never committed to the repo. Every deployer runs `node setup.js` once with their own URL.

---

## Pages

| Path | What it does |
|------|-------------|
| `/` | Send form — wallet connect, chain picker, email, auth toggle |
| `/claim/:token` | Claim — shows amount, wallet input or auto-generate, TX confirmation |

---

## Supported Chains

| Chain | Symbol | Chain ID |
|-------|--------|---------|
| Celo | CELO | 42220 |
| Base | ETH | 8453 |
| Monad | MON | 143 |
