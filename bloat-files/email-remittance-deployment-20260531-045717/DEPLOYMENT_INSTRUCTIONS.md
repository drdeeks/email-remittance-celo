# Email Remittance Pro - Deployment Instructions

## 🚀 Deployment Steps

### 1. Deploy Backend on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use the settings from "render-config.txt"
5. Click "Create Web Service"

### 2. Deploy Frontend on Cloudflare Pages
1. Go to [Cloudflare Pages](https://dash.cloudflare.com/04c92088b3b62196801377ad11137305/workers-and-pages/create/pages)
2. Click "Connect GitHub account"
3. Select your repository
4. Use the settings from "cloudflare-pages-config.txt"
5. Click "Save and Deploy"

### 3. Configure DNS
1. Go to [Cloudflare DNS](https://dash.cloudflare.com/04c92088b3b62196801377ad11137305/dns)
2. Add the DNS records from "dns-config.txt"

### 4. Set Up Resend Webhook
1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Configure with:
   - URL: "https://api.remittance.drdeeks.xyz/api/webhook/resend"
   - Events: email.delivered, email.bounced, email.opened
   - Secret: "uniswap_test_key"

### 5. Configure Uniswap/LI.FI
1. Ensure "[0;31m❌ Error occurred at line 574 (exit code: 127)[0m
[1;33mThe script will attempt to continue...[0m
[0;32m✅ Progress saved to email-remittance-deployment-20260531-045717/progress.sh[0m" and "[0;31m❌ Error occurred at line 574 (exit code: 127)[0m
[1;33mThe script will attempt to continue...[0m
[0;32m✅ Progress saved to email-remittance-deployment-20260531-045717/progress.sh[0m" are set in your Render environment variables.
2. Verify the "[0;31m❌ Error occurred at line 574 (exit code: 127)[0m
[1;33mThe script will attempt to continue...[0m
[0;32m✅ Progress saved to email-remittance-deployment-20260531-045717/progress.sh[0m" and "[0;31m❌ Error occurred at line 574 (exit code: 127)[0m
[1;33mThe script will attempt to continue...[0m
[0;32m✅ Progress saved to email-remittance-deployment-20260531-045717/progress.sh[0m" are correct for your blockchain.

### 6. Test Your Deployment
1. Visit "https://remittance.drdeeks.xyz" to test the frontend
2. Test the API: 
   "curl https://api.remittance.drdeeks.xyz/api/health"
3. Send a test remittance and verify:
   - Email flow works
   - Token swaps/bridges execute correctly
   - Fees are deducted from the recipient amount

## 🎉 You're Done!

Your Email Remittance Pro platform is now live with:
- ✅ Frontend on Cloudflare Pages ("https://remittance.drdeeks.xyz")
- ✅ Backend on Render ("https://api.remittance.drdeeks.xyz")
- ✅ Resend email integration with webhooks
- ✅ 7-day expiration with 1.5% swap/bridge fees
- ✅ Token swaps and cross-chain bridging (powered by Uniswap/LI.FI)
- ✅ Zero platform gas costs (fees deducted from recipient amount)
