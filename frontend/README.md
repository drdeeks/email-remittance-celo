# Email Remittance — Frontend

Send crypto to any email. Recipient claims with zero wallet setup.
Supports Celo · Base · Monad. Self Protocol ZK auth optional.

---

## Local Setup (3 commands)

```bash
cd frontend
echo "API_URL=http://localhost:3001" > .env
node setup.js
```

Then open `public/index.html` in your browser.
Make sure the backend is running on port 3001 first (`npm start` from the root).

---

## Deploy to Vercel

**Step 1 — Import the repo**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `github.com/drdeeks/email-remittance-celo`
3. Set these in the Vercel project settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `node setup.js`
   - **Output Directory:** `public`

**Step 2 — Add one environment variable**

In Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `API_URL` | Your backend URL (e.g. `https://your-app.up.railway.app`) |

**Step 3 — Deploy**

Vercel runs `node setup.js` automatically on every deploy.
It reads `API_URL`, generates `public/config.js` and `vercel.json`, done.

**When your backend URL changes:** update `API_URL` in Vercel dashboard → Redeploy. Nothing else to touch.

---

## How setup.js works

`node setup.js` reads environment variables and generates two files:

- `public/config.js` — runtime config loaded by the HTML pages
- `vercel.json` — Vercel rewrite rules pointing `/api/*` at your backend

Both files are in `.gitignore` (environment-specific, never committed).

Reads from (in order of priority):
1. Shell environment: `API_URL=https://... node setup.js`
2. `.env` file in the frontend directory
3. Vercel's injected `VERCEL_URL` environment variable

---

## Backend Hosting Options

The frontend is a static site. It needs a running backend to call.

| Option | Cost | Setup time |
|--------|------|-----------|
| **Local + Cloudflare tunnel** | Free | 2 min |
| **Railway** | ~$5/mo | 5 min |
| **Render** | Free tier | 5 min |
| **Fly.io** | Free tier | 10 min |

**Quickest (local + public tunnel):**
```bash
# Terminal 1 — start backend
cd ..  # root of email-remittance-celo
npm start

# Terminal 2 — expose it publicly
cloudflared tunnel --url http://localhost:3001 --no-autoupdate
# Copy the URL it gives you, e.g. https://xxxx.trycloudflare.com

# Terminal 3 — configure frontend
cd frontend
API_URL=https://xxxx.trycloudflare.com node setup.js
```

Then redeploy Vercel with that URL as `API_URL`.

---

## Pages

| Path | What it does |
|------|-------------|
| `/` | Send form — wallet connect, chain picker, email input, auth toggle |
| `/claim/:token` | Claim page — shows amount, wallet input or auto-generate, TX confirmation |

---

## Supported Chains

| Chain | Symbol | Chain ID |
|-------|--------|---------|
| Celo | CELO | 42220 |
| Base | ETH | 8453 |
| Monad | MON | 143 |
