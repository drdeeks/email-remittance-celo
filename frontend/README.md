# Email Remittance — Frontend

> **The public face.** Anyone can use this — no wallet, no crypto knowledge required.
> Send crypto to an email address. Claim it with one click.

Built with Next.js 14, RainbowKit, wagmi, and Tailwind CSS. Deploys to Vercel in one click.

---

## What it does

**Send page (/):**
- Connect your wallet (MetaMask, Coinbase Wallet, any EVM wallet)
- Pick your chain: Celo, Base, or Monad
- Enter recipient email + amount
- Choose: **Secure** (Self Protocol ZK verification required to claim) or **Open** (anyone with the link can claim)
- Hit send — recipient gets an email with a claim button

**Claim page (/claim/[token]):**
- Recipient clicks the email link → lands here
- Shows amount + sender — no wallet needed yet
- Two options:
  - Paste their own wallet address
  - Click "Generate wallet for me" → get a private key → import into any wallet app
- If sender chose "Secure mode" → Self Protocol identity check first
- On success: TX hash + explorer link + wallet import instructions

**No technical knowledge required to receive.** That's the point.

---

## Deploy to Vercel (5 minutes)

### Step 1 — Get a WalletConnect Project ID (free)
1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign in → New Project → name it anything
3. Copy the **Project ID**

### Step 2 — Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/drdeeks/email-remittance-celo&root=frontend)

Or via CLI:
```bash
cd frontend
npx vercel
```

### Step 3 — Set environment variables in Vercel dashboard

Go to your project → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | Your backend URL (Railway/Render/tunnel) | ✅ |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From Step 1 | ✅ |

### Step 4 — Tell your backend about the Vercel URL

In your backend `.env`:
```env
FRONTEND_URL=https://your-app.vercel.app
```

This makes claim links in emails point to the Vercel frontend instead of the raw API. Restart your backend after updating.

### Step 5 — Update vercel.json

Edit `frontend/vercel.json` to point at your actual backend URL:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.up.railway.app/api/:path*"
    }
  ]
}
```

---

## Local Development

```bash
cd frontend
cp .env.example .env.local
# Fill in NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Make sure the backend is running on port 3001.

---

## The Vision

Traditional remittance apps require the recipient to:
1. Download an app
2. Create an account
3. Set up a wallet
4. Learn what a seed phrase is
5. Wait 3-5 days
6. Pay 8-12% in fees

**This requires:**
1. Click the link in the email
2. Done

The Vercel URL is the single public-facing hub. Anyone on earth with an email can receive crypto. The sender controls the security level. The recipient controls the wallet. Nobody has to be a developer.

---

## Supported Chains

| Chain | Currency | Chain ID |
|-------|---------|---------|
| Celo | CELO | 42220 |
| Base | ETH | 8453 |
| Monad | MON | 143 |
