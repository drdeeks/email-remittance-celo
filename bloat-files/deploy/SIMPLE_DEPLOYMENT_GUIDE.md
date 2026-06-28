# Email Remittance Pro - Simple Deployment Guide

## 🚀 Quick Start
This guide provides **only the essential information** needed to deploy Email Remittance Pro.

---

## 💰 Fee Structure (Simple)
| Fee Type          | Percentage | When Applied                     | Deducted From          |
|-------------------|------------|----------------------------------|------------------------|
| **Platform Fee**  | 1.5%       | On all successful claims         | Recipient amount       |
| **Storage Fee**   | 1.5%       | When unclaimed after 7 days      | Sender refund amount   |

**Key Points:**
- **1.5% flat fee** on all successful claims (regardless of swaps/bridges)
- **1.5% storage fee** only on unclaimed remittances
- **Gas fees** come out of the recipient amount (platform pays nothing)
- **No additional fees** for bridging or swapping

---

## 🔧 Backend Deployment (Render)
### **Environment Variables (Add to Render)**
```env
# Domain
DOMAIN=remittance.drdeeks.xyz
BASE_URL=https://api.remittance.drdeeks.xyz
FRONTEND_URL=https://remittance.drdeeks.xyz

# Node.js version
NODE_VERSION=22

# Email (Resend)
RESEND_API_KEY=re_DKwmFCbw_4BNfcfcocrsv8DvLAC12sotN
RESEND_WEBHOOK_SECRET=02a332bd2bb3a31d335468410c235c2042097edda0d93afcd5061e8a0e293c78

# Blockchain
BLOCKCHAIN=celo
CELO_RPC_URL=https://forno.celo.org
BASE_RPC_URL=https://mainnet.base.org
MONAD_RPC_URL=https://rpc.monad.xyz
WALLET_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
SERVER_WALLET_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7

# Swaps & Bridges
UNISWAP_API_KEY=_mRz_oNgmJbCZwp1KPYcqmw_YhteFUB7UtgDfQ2NYqo
LI_FI_API_KEY=05d1d8de-ad53-436f-8c56-24ffdb27de74.5b8496b4-0788-497c-9fd6-739ff403b822

# Fees
PLATFORM_FEE_PERCENTAGE=1.5  # 1.5% fee on all successful claims
STORAGE_FEE_PERCENTAGE=1.5  # 1.5% fee on unclaimed remittances
```

### **Render Settings**
- **Name**: `email-remittance-pro-backend`
- **Region**: Oregon (US West)
- **Branch**: `PLGV2`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

---

## 🖥 Frontend Deployment (Cloudflare Pages)
### **Cloudflare Pages Settings**
- **Project Name**: `email-remittance-pro-frontend`
- **Production Branch**: `PLGV2`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Build Output Directory**: `frontend/dist`
- **Custom Domain**: `remittance.drdeeks.xyz`

---

## 🌐 DNS Configuration (Cloudflare)
| Type  | Name | Value                                      | Proxy Status |
|-------|------|--------------------------------------------|--------------|
| CNAME | @    | `remittance.drdeeks.xyz.pages.dev`        | Proxied      |
| CNAME | api  | `email-remittance-pro.onrender.com`       | DNS Only     |

---

## 📧 Resend Webhook Configuration
- **URL**: `https://api.remittance.drdeeks.xyz/api/webhook/resend`
- **Events**: `email.delivered`, `email.bounced`, `email.opened`
- **Secret**: `02a332bd2bb3a31d335468410c235c2042097edda0d93afcd5061e8a0e293c78`

---

## ⏰ Cron Job (Render)
- **Schedule**: `0 * * * *` (hourly)
- **Command**: `curl -X POST -H "Authorization: Bearer e6ed92b09aa4c5d844fa30483805f5bb" https://api.remittance.drdeeks.xyz/api/process-expired`

---

## 🔐 Critical Notes
1. **Wallet Private Key**: Never share this. Add it directly in Render's secrets manager.
2. **Node.js Version**: Must be **22.x** to avoid compatibility issues.
3. **Fees**: 1.5% platform fee on all successful claims, 1.5% storage fee on unclaimed remittances.
4. **Gas Fees**: Paid by users from their received amount (platform pays nothing).

---

## 📋 Deployment Checklist
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Cloudflare Pages
- [ ] DNS records configured
- [ ] Resend webhook set up
- [ ] Cron job configured
- [ ] Tested with small remittance

---

🚀 **Your Email Remittance Pro platform is ready!**