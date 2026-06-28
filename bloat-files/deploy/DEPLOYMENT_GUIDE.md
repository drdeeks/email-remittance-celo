# Email Remittance Pro - Complete Deployment Guide

## 🚀 Table of Contents
- [1. Blockchain Configuration](#-blockchain-configuration)
- [2. API Key Sources](#-api-key-sources)
- [3. Smart Contract Addresses](#-smart-contract-addresses)
- [4. Fee Structure](#-fee-structure)
- [5. Deployment Steps](#-deployment-steps)
- [6. Security Considerations](#-security-considerations)
- [7. Monitoring & Maintenance](#-monitoring--maintenance)
- [8. Troubleshooting](#-troubleshooting)

---

## 🌐 Blockchain Configuration

### **Supported Chains**
| Chain   | Chain ID | Native Token | RPC URL (Default)                     | Explorer                     |
|---------|----------|--------------|---------------------------------------|-------------------------------|
| Celo    | 42220    | CELO         | https://forno.celo.org                | https://celoscan.io           |
| Base    | 8453     | ETH          | https://mainnet.base.org              | https://basescan.org          |
| Monad   | 143      | MON          | https://rpc.monad.xyz                 | https://monadscan.com         |

### **RPC Configuration**
```env
# .env file
CELO_RPC_URL=https://forno.celo.org
BASE_RPC_URL=https://mainnet.base.org
MONAD_RPC_URL=https://rpc.monad.xyz
```

### **Token Contract Addresses**
| Chain   | Token    | Address                                    | Decimals |
|---------|----------|--------------------------------------------|----------|
| Celo    | CELO     | 0x471EcE3750Da237f93B8E339c536989b8978a438  | 18       |
| Celo    | cUSD     | 0x765DE816845861e75A25fCA122bb6898B8B1282a  | 18       |
| Base    | ETH      | 0x4200000000000000000000000000000000000006  | 18       |
| Base    | USDC     | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  | 6        |
| Monad   | MON      | 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE  | 18       |
| Monad   | USDC     | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  | 6        |

---

## 🔑 API Key Sources

### **1. Self Protocol Configuration**

#### **Purpose**
Self Protocol provides enterprise-grade identity verification with:
- Zero-knowledge proof verification
- OFAC compliance checks
- Age verification
- Multi-chain support
- Privacy-preserving KYC

#### **Get API Credentials**
1. Visit [Self Protocol Developer Portal](https://developer.self.xyz/)
2. Sign up for a developer account
3. Create a new application
4. Generate API credentials (App ID and Secret)
5. Note the contract addresses for supported chains

#### **Configuration**
```env
# Required for Self Protocol integration
BASE_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
MONAD_SELF_CONTRACT=0x7BC66eD8285b51F84D170F158aD162cA144F32c1
CELO_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
SELF_ATTESTER_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7
SELF_APP_ID=your_self_app_id_here
SELF_APP_SECRET=your_self_app_secret_here

# Optional configuration
SELF_API_URL=https://api.self.xyz/v1  # Default: https://api.self.xyz/v1
SELF_API_TIMEOUT=10000  # Default: 10000
DEFAULT_REQUIRE_AUTH=false  # Default: false - Require recipient verification
MIN_AGE=18  # Default: 18 - Minimum age for verification
HIGH_VALUE_THRESHOLD=100  # Default: 100 - Threshold for high-value transactions
SELF_MONITORING_ENABLED=true  # Default: true - Enable monitoring
SELF_ALERT_THRESHOLD=5  # Default: 5 - Failures before alert
SELF_ROLLBACK_ENABLED=true  # Default: true - Enable rollback
SELF_MAX_RETRIES=3  # Default: 3 - Maximum retry attempts
SELF_STAGING=false  # Default: false - Enable staging mode
```

#### **Verification Flow**
1. **Sender Verification** (Service Wallet Mode):
   - Required for platform-fronted transactions
   - Verifies name, date of birth, nationality, and OFAC status
   - Cached per session (30 minutes)

2. **Recipient Verification** (Optional):
   - Businesses can require verification for specific transactions
   - Verifies minimum age (18+) and OFAC status
   - Configured via `requireAuth` parameter when creating remittance

#### **Testing Configuration**
For development and testing, enable staging mode:
```env
SELF_STAGING=true  # Enables mock passports for testing
```

### **2. Resend API Key**
- **Purpose**: Email delivery and webhooks
- **Get it from**: [Resend API Keys](https://resend.com/api-keys)
- **Documentation**: [Resend API Docs](https://resend.com/docs/api-reference/introduction)
- **Configuration**:
  ```env
  RESEND_API_KEY=re_YourApiKeyHere
  ```

### **2. Uniswap API Key**
- **Purpose**: Token swaps and cross-chain quotes
- **Get it from**: [Uniswap Developer Portal](https://docs.uniswap.org/contracts/universal-router/developers)
- **Documentation**: [Uniswap Trading API](https://docs.uniswap.org/contracts/universal-router/deployments)
- **Configuration**:
  ```env
  UNISWAP_API_KEY=_mRz_oNgmJbCZwp1KPYcqmw_YhteFUB7UtgDfQ2NYqo
  ```

### **3. LI.FI API Key**
- **Purpose**: Cross-chain bridging
- **Get it from**: [LI.FI Developer Portal](https://docs.li.fi/)
- **Documentation**: [LI.FI API Docs](https://docs.li.fi/products/more-integration-options/li.fi-api)
- **Configuration**:
  ```env
  LI_FI_API_KEY=05d1d8de-ad53-436f-8c56-24ffdb27de74.5b8496b4-0788-497c-9fd6-739ff403b822
  ```

### **4. Wallet Private Key**
- **Purpose**: Executing swaps and bridges
- **Security Note**: Use a dedicated wallet, never your personal wallet
- **Configuration**:
  ```env
  WALLET_PRIVATE_KEY=0xYourPrivateKeyHere
  SERVER_WALLET_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7
  ```

---

## 📜 Smart Contract Addresses

### **Uniswap Contracts**
| Chain   | Contract Type       | Address                                    |
|---------|----------------------|--------------------------------------------|
| Celo    | Universal Router     | 0x5302086A3a25d473aAbBc0eC8586573516cF2099  |
| Celo    | Quoter V2            | 0x82825d0554fA07f7FC52Ab63c961F33A2d962469  |
| Base    | Universal Router     | 0x2626664c2603336E57B271c5C0b26F421741e481  |
| Base    | Quoter V2            | 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a  |
| Monad   | Universal Router     | 0x182a927119d56008d921126764bf884221b10f59  |

### **LI.FI Contracts**
| Chain   | Contract Type       | Address                                    |
|---------|----------------------|--------------------------------------------|
| Celo    | LI.FI Diamond        | 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE  |
| Base    | LI.FI Diamond        | 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE  |
| Monad   | LI.FI Diamond        | 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE  |

### **Wrapped Native Tokens**
| Chain   | Token    | Address                                    |
|---------|----------|--------------------------------------------|
| Celo    | WCELO    | 0x471EcE3750Da237f93B8E339c536989b8978a438  |
| Base    | WETH     | 0x4200000000000000000000000000000000000006  |
| Monad   | WMON     | 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE  |

---

## 💰 Fee Structure

### **1. Protocol Fees**
| Fee Type          | Percentage | Deducted From          | Configuration Variable   |
|-------------------|------------|------------------------|--------------------------|
| Swap Fee          | 1.5%       | Recipient amount       | `SWAP_FEE_PERCENTAGE=1.5` |
| Bridge Fee        | 1.5%       | Recipient amount       | `BRIDGE_FEE_PERCENTAGE=1.5` |
| Storage Fee       | 1.5%       | Expired remittances    | (Handled in code)        |
| Protocol Fee      | 0%         | N/A                    | (Future implementation)  |

### **2. Fee Collection**
- **Current Implementation**: Fees are sent to `SERVER_WALLET_ADDRESS`
- **Future Implementation**: Smart contract with:
  - Fee splitting
  - Timelock upgrades
  - Governance control

### **3. Example Fee Calculation**
```
# Sender sends 100 CELO
# Recipient requests base→USDC
# System bridges CELO → ETH (Base)
# System swaps ETH → USDC
# Total fees: 1.5% bridge + 1.5% swap = 3%

100 CELO → [1.5% bridge fee] → 98.5 CELO → [bridge] → 0.985 ETH → [1.5% swap fee] → 0.9702 ETH → [swap] → 1940.4 USDC

# Recipient receives: ~1940 USDC (after 3% total fees)
```

---

## 🛠 Deployment Steps

### **1. Self Protocol Setup**

Before deploying, set up Self Protocol integration:

1. **Register for Self Protocol**:
   - Visit [Self Protocol Developer Portal](https://developer.self.xyz/)
   - Create a developer account
   - Create a new application
   - Note your App ID and Secret

2. **Configure Contract Addresses**:
   - Get the latest contract addresses for Base, Monad, and Celo chains
   - Configure the attester address

3. **Set Environment Variables**:
   ```bash
   # Add to your .env file
   BASE_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
   MONAD_SELF_CONTRACT=0x7BC66eD8285b51F84D170F158aD162cA144F32c1
   CELO_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
   SELF_ATTESTER_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7
   SELF_APP_ID=your_app_id_here
   SELF_APP_SECRET=your_app_secret_here
   ```

4. **Test Verification Flow**:
   - Enable staging mode for testing: `SELF_STAGING=true`
   - Test sender and recipient verification flows
   - Verify error handling and fallback mechanisms

### **2. Backend Deployment (Render)**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Configure with:
   - **Name**: `email-remittance-pro-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `PLGV2`
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter
5. Add all environment variables from `.env`
6. Click "Create Web Service"

### **2. Frontend Deployment (Cloudflare Pages)**
1. Go to [Cloudflare Pages](https://dash.cloudflare.com/)
2. Click "Create project" → "Connect GitHub account"
3. Select repository
4. Configure with:
   - **Project Name**: `email-remittance-pro-frontend`
   - **Production Branch**: `PLGV2`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Build Output Directory**: `frontend/dist`
5. Click "Save and Deploy"

### **3. DNS Configuration (Cloudflare)**
1. Go to [Cloudflare DNS](https://dash.cloudflare.com/)
2. Select `drdeeks.xyz` zone
3. Add these records:

| Type  | Name | Value                                      | Proxy status | TTL  |
|-------|------|--------------------------------------------|--------------|------|
| CNAME | @    | `remittance.drdeeks.xyz.pages.dev`        | Proxied      | Auto |
| CNAME | api  | `email-remittance-pro.onrender.com`       | DNS only     | Auto |

### **4. Resend Webhook Setup**
1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Configure with:
   - **URL**: `https://api.remittance.drdeeks.xyz/api/webhook/resend`
   - **Events**: `email.delivered`, `email.bounced`, `email.opened`
   - **Signing Secret**: (Leave blank, Resend provides this)
4. Click "Create Webhook"

### **5. Cron Job Setup (Render)**
1. Go to your Render service dashboard
2. Navigate to "Cron Jobs" section
3. Create new cron job with:
   - **Schedule**: `0 * * * *` (hourly)
   - **Command**: `curl -X POST -H "Authorization: Bearer $CRON_API_KEY" https://api.remittance.drdeeks.xyz/api/process-expired`
   - **HTTP Method**: POST

---

## 🔒 Security Considerations

### **1. Secret Management**
| Secret                  | Storage Location       | Rotation Frequency |
|-------------------------|------------------------|--------------------|
| `WALLET_PRIVATE_KEY`    | Render secrets manager | Quarterly          |
| `RESEND_API_KEY`        | Render secrets manager | Quarterly          |
| `UNISWAP_API_KEY`       | Render secrets manager | Quarterly          |
| `LI_FI_API_KEY`         | Render secrets manager | Quarterly          |
| `RESEND_WEBHOOK_SECRET` | Render secrets manager | Per deployment     |
| `CRON_API_KEY`          | Render secrets manager | Per deployment     |

### **2. Wallet Security**
- Use a **dedicated wallet** for fee collection
- **Never use personal wallets** for protocol operations
- **Monitor wallet balance** regularly
- **Set up transaction alerts** for large withdrawals

### **3. Smart Contract Security (Future)**
- **Audit requirements**: $5k-$15k for professional audit
- **Timelock**: 48-hour delay for upgrades
- **Pause mechanism**: Emergency stop functionality
- **Governance**: DAO-controlled parameter changes

### **4. API Security**
- **Rate limiting**: 100 requests/minute per IP
- **Input validation**: Strict validation for all API inputs
- **Webhook verification**: Always verify Resend webhook signatures
- **CORS**: Restrict to frontend domain only

---

## 📊 Monitoring & Maintenance

### **1. Key Metrics to Monitor**
| Metric                     | Target Value          | Monitoring Tool          |
|----------------------------|-----------------------|--------------------------|
| API uptime                 | >99.9%                | Render dashboard         |
| Webhook success rate       | >99.5%                | Custom logging           |
| Swap success rate          | >99%                  | Custom logging           |
| Bridge success rate        | >98%                  | Custom logging           |
| Email delivery rate        | >99%                  | Resend dashboard         |
| Database response time     | <100ms                | Render metrics           |
| Blockchain RPC latency     | <500ms                | Custom monitoring        |

### **2. Alerting Setup**
- **Failed webhooks**: Alert when >5 failures/hour
- **Failed swaps/bridges**: Alert when >3 failures/hour
- **Low wallet balance**: Alert when <1 ETH equivalent
- **High error rates**: Alert when API errors >1%
- **Deployment failures**: Immediate alert on failed deployments

### **3. Maintenance Tasks**
| Task                          | Frequency       | Responsible Party |
|-------------------------------|-----------------|-------------------|
| Rotate API keys               | Quarterly       | DevOps            |
| Update dependencies           | Monthly         | Developers        |
| Review security logs          | Weekly          | Security team     |
| Test backup/restore           | Quarterly       | DevOps            |
| Review fee structure          | Annually        | Finance           |
| Audit smart contracts         | Annually        | Security team     |

---

## 🛠 Troubleshooting

### **1. Self Protocol Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| Verification fails with 401 | Invalid Self Protocol credentials | Verify `SELF_APP_ID` and `SELF_APP_SECRET` |
| Contract not found | Incorrect contract address | Verify `BASE_SELF_CONTRACT`, `MONAD_SELF_CONTRACT`, `CELO_SELF_CONTRACT` |
| Attester not found | Incorrect attester address | Verify `SELF_ATTESTER_ADDRESS` |
| Verification timeout | API timeout too short | Increase `SELF_API_TIMEOUT` (default: 10000) |
| Missing verification fields | Incomplete verification request | Ensure all required fields are provided: proof, pubSignals, attestationId, userContextData |
| Verification succeeds but data missing | Incorrect attestation ID | Verify attestation ID matches expected values (1=passport, 2=EU ID, 3=Aadhaar) |
| OFAC validation fails | User on OFAC list | Check user details against OFAC SDN list |
| Age validation fails | User under minimum age | Verify `MIN_AGE` setting and user's date of birth |

### **2. Common Deployment Issues**
| Issue                          | Solution                                                                 |
|--------------------------------|--------------------------------------------------------------------------|
| Build fails on Render          | Check `npm install` and `npm run build` logs, increase memory limit     |
| Webhook verification fails     | Verify `RESEND_WEBHOOK_SECRET` matches your configuration               |
| Swap/bridge failures            | Check `UNISWAP_API_KEY` and `LI_FI_API_KEY` permissions                  |
| Database connection errors      | Verify `DATABASE_URL` format and network access                         |
| Wallet transaction failures     | Check `WALLET_PRIVATE_KEY` has sufficient gas tokens                    |
| DNS propagation delays          | Wait up to 24 hours, check with `dig remittance.drdeeks.xyz`            |
| Cloudflare Pages build fails    | Check frontend build logs, ensure `frontend/dist` exists                |

### **2. Common Runtime Issues**
| Issue                          | Solution                                                                 |
| Emails not sending              | Check Resend API key and webhook configuration                           |
| Swaps not executing             | Verify Uniswap API key has sufficient permissions                       |
| Bridges not executing           | Check LI.FI API key and supported routes                                 |
| Fees not deducted               | Verify `SWAP_FEE_PERCENTAGE` and `BRIDGE_FEE_PERCENTAGE` are set         |
| Wallet out of gas               | Fund wallet with native tokens for gas                                   |
| Database timeouts               | Check database connection pool settings                                  |
| High API latency                | Check Render instance size, consider upgrading                           |

### **3. Debugging Tools**
```bash
# Check API health
curl https://api.remittance.drdeeks.xyz/api/health

# Check database connection
npx prisma migrate status

# Check wallet balance
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x38be03139523EE998952D21110115f23AE54b1f7", "latest"],"id":1}' https://forno.celo.org

# Check Resend webhook logs
# (Check your application logs for webhook events)

# Check Uniswap API status
curl -H "X-API-KEY: _mRz_oNgmJbCZwp1KPYcqmw_YhteFUB7UtgDfQ2NYqo" https://trading-api.uniswap.org/v1/status
```

---

## 📚 Additional Resources

### **1. Official Documentation**
- [Uniswap Developer Docs](https://docs.uniswap.org/)
- [LI.FI Integration Guide](https://docs.li.fi/)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Render Deployment Guide](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

### **2. Community Resources**
- [Celo Developer Forum](https://forum.celo.org/)
- [Base Developer Discord](https://base.org/discord)
- [Monad Developer Docs](https://docs.monad.xyz/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [Ethers.js Documentation](https://docs.ethers.org/v5/)

### **3. Security Resources**
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Blockchain Security Contacts](https://github.com/crytic/blockchain-security-contacts)

---

## 🎯 Deployment Checklist

- [ ] All API keys obtained and configured
- [ ] Wallet private key securely stored
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Cloudflare Pages
- [ ] DNS records configured
- [ ] Resend webhook configured
- [ ] Cron job for expired remittances set up
- [ ] Monitoring and alerting configured
- [ ] Backup and restore procedures tested
- [ ] Security audit completed (future)
- [ ] Smart contract for fee collection implemented (future)

---

🚀 **Your Email Remittance Pro platform is now ready for production!**