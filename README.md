# Email Remittance Pro - Enterprise-Grade Crypto Remittance Platform

**Send crypto to anyone with just their email address. No wallet required to receive.**

Email Remittance Pro is an enterprise-grade, autonomous agent-powered remittance system that enables secure, compliant, and user-friendly cryptocurrency transfers to any email address. Recipients receive funds directly to auto-generated wallets or their existing wallets with zero technical knowledge required.

## 🌐 Key Features

- **7-Day Escrow Mechanics**: Secure 7-day claim window with 1.5% storage fee for expired remittances
- **Zero Platform Gas Costs**: Users pay all gas fees - platform never subsidizes transactions
- **Auto-Generated Wallets**: Recipients without wallets receive auto-generated wallets with clear import instructions
- **Multi-Chain Support**: Celo, Base, and Monad with automatic chain detection
- **Enterprise-Grade Compliance**: Self Protocol ZK identity verification, Venice AI fraud analysis, and Mandate policy enforcement
- **Two Funding Modes**: Service wallet (platform-fronted) and personal wallet (user-funded) options
- **Gift Card Integration**: Support for gift card redemption flows

## 📁 Project Structure

```
email-remittance-pro/
├── src/
│   ├── controllers/            # Route handlers and API endpoints
│   │   ├── transactionController.ts  # Core remittance logic including 7-day escrow
│   │   └── ...
│   ├── services/               # Business logic and integrations
│   │   ├── remittanceService.ts      # 7-day expiration, storage fee logic
│   │   ├── feeService.ts             # Zero-platform-gas fee calculations
│   │   └── ...
│   ├── db/                    # Database schema and migrations
│   │   └── database.ts            # Storage_fee and returned_to_sender columns
│   └── index.ts               # Server entry point
├── frontend/                 # Next.js frontend application
│   ├── src/app/claim/[token]/page.tsx  # UI for returned remittances with storage fee info
│   └── ...
├── tests/                    # Test suites
│   ├── expired-remittance.test.ts     # Tests for 7-day expiration and storage fee
│   ├── fee-model.test.ts             # Tests for zero-platform-gas fee model
│   └── personal-wallet-auto-wallet.test.ts  # Tests for auto-generated wallets
├── Email_Remittance_Pro_Pitch_Deck.pptx  # Enterprise pitch deck
├── README.md                 # This file
├── .env.example              # Environment variable template
└── package.json              # Project dependencies and scripts
```

## 🔐 Mandatory Environment Variables

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `WALLET_PRIVATE_KEY` | Platform wallet private key for sending transactions | ✅ Yes | `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d` |
| `RESEND_API_KEY` | Resend API key for email delivery | ✅ Yes | `re_xxxxxxxxxxxxxxxx` |
| `BASE_URL` | Public URL for claim links | ✅ Yes | `https://your-domain.com` |
| `PORT` | Server port | ❌ No | `3001` |
| `DB_PATH` | SQLite database path | ❌ No | `./remittance.db` |
| `MANDATE_RUNTIME_KEY` | Mandate policy engine key | ❌ No | `mndt_live_xxxxxxxxxxxxxxxx` |
| `VENICE_API_KEY` | Venice AI fraud analysis key | ❌ No | `VENICE_INFERENCE_KEY_xxxxxxxx` |
| `UNISWAP_API_KEY` | Uniswap API key for swaps | ❌ No | `your-uniswap-developer-api-key` |

## ⚡ Quickstart

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/drdeeks/email-remittance-pro.git
cd email-remittance-pro

# Install dependencies
npm install

# Build project
npm run build
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Run the Platform

```bash
# Start backend server
npm start

# In a separate terminal, start frontend (from frontend directory)
cd frontend
npm install
npm run build
npm start
```

## 🚀 Deployment Options

### Railway (Recommended)

1. Sign up at [railway.app](https://railway.app)
2. Create new project and connect GitHub repository
3. Set environment variables in Railway dashboard
4. Deploy - Railway automatically assigns a public URL

### Render

1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `npm run build`
5. Set start command: `npm start`
6. Add environment variables in Render dashboard
7. Deploy

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch application
fly launch

# Set secrets
fly secrets set WALLET_PRIVATE_KEY=0x... RESEND_API_KEY=re_... BASE_URL=https://your-app.fly.dev

# Deploy
fly deploy
```

### Self-Hosted VPS

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2

# Start application
pm2 start dist/index.js --name "email-remittance-pro"

# Set up Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/remittance
```

```nginx
server {
    server_name remittance.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site and install SSL
sudo ln -s /etc/nginx/sites-available/remittance /etc/nginx/sites-enabled
sudo certbot --nginx -d remittance.yourdomain.com
```

## 🔗 Official Documentation Links

| Service | Documentation | Purpose |
|---------|---------------|---------|
| **Celo** | [docs.celo.org](https://docs.celo.org) | Blockchain documentation |
| **Base** | [docs.base.org](https://docs.base.org) | Base chain documentation |
| **Monad** | [docs.monad.xyz](https://docs.monad.xyz) | Monad chain documentation |
| **Resend** | [resend.com/docs](https://resend.com/docs) | Email delivery |
| **Self Protocol** | [developer.self.xyz](https://developer.self.xyz) | ZK identity verification |
| **Venice AI** | [venice.ai/docs](https://venice.ai/docs) | Private fraud analysis |
| **Mandate** | [mandate.md](https://mandate.md) | Policy enforcement |
| **Uniswap** | [docs.uniswap.org](https://docs.uniswap.org) | Token swaps and bridges |
| **Express.js** | [expressjs.com](https://expressjs.com) | Backend framework |
| **Next.js** | [nextjs.org/docs](https://nextjs.org/docs) | Frontend framework |
| **RainbowKit** | [rainbowkit.com/docs](https://rainbowkit.com/docs) | Wallet connection |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:expired-remittance
npm run test:fee-model
npm run test:personal-wallet
```

## 📊 Enterprise Pitch Deck

The [Email_Remittance_Pro_Pitch_Deck.pptx](Email_Remittance_Pro_Pitch_Deck.pptx) file contains:

- Market opportunity analysis
- Competitive landscape
- Technical architecture overview
- Business model and revenue streams
- Compliance and regulatory strategy
- Implementation roadmap
- Investor and partner opportunities

## 🔒 Security Best Practices

1. **Never commit private keys**: `.env` is in `.gitignore`
2. **Use environment variables**: All sensitive data should be in `.env`
3. **Enable Mandate policies**: Set transaction limits to prevent abuse
4. **Use Venice AI**: Enable fraud analysis for production deployments
5. **Verify Self Protocol**: Enable ZK identity verification for compliance
6. **Monitor wallet balances**: Set up alerts for low balances
7. **Use HTTPS**: Always deploy with SSL/TLS encryption

## 🆘 Support

For enterprise support, custom integrations, or partnership opportunities:
- Email: enterprise@emailremittance.pro
- Website: [emailremittance.pro](https://emailremittance.pro)
- GitHub Issues: [github.com/drdeeks/email-remittance-pro/issues](https://github.com/drdeeks/email-remittance-pro/issues)

## 📜 License

MIT © 2026 Email Remittance Pro