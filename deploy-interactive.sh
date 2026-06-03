#!/bin/bash
# Email Remittance Pro - Robust Interactive Deployment Script
# With comprehensive error handling, fallbacks, and crash protection

set -o pipefail  # Fail on pipeline errors
set -o errtrace # Better error tracing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration variables with fallback defaults
declare -A config=(
    [SELF_APP_ID]=""
    [SELF_APP_SECRET]=""
    [BASE_SELF_CONTRACT]="0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0"
    [MONAD_SELF_CONTRACT]="0x7BC66eD8285b51F84D170F158aD162cA144F32c1"
    [CELO_SELF_CONTRACT]="0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0"
    [SELF_ATTESTER_ADDRESS]="0x38be03139523EE998952D21110115f23AE54b1f7"
    [DEFAULT_REQUIRE_AUTH]="false"
    [MIN_AGE]="18"
    [HIGH_VALUE_THRESHOLD]="100"
    [SELF_API_URL]="https://api.self.xyz/v1"
    [SELF_API_TIMEOUT]="10000"
    [SELF_MONITORING_ENABLED]="true"
    [SELF_ALERT_THRESHOLD]="5"
    [SELF_ROLLBACK_ENABLED]="true"
    [SELF_MAX_RETRIES]="3"
    [DOMAIN]="remittance.example.com"
    [FRONTEND_URL]="https://remittance.example.com"
    [BACKEND_URL]="https://api.remittance.example.com"
    [RENDER_URL]="https://email-remittance-pro.onrender.com"
    [BLOCKCHAIN]="celo"
    [BLOCKCHAIN_RPC]="https://forno.celo.org"
    [WALLET_PRIVATE_KEY]="0x0000000000000000000000000000000000000000000000000000000000000000"
    [WALLET_ADDRESS]="0x0000000000000000000000000000000000000000"
    [RESEND_API_KEY]="re_placeholder"
    [RESEND_WEBHOOK_SECRET]="$(openssl rand -hex 32 2>/dev/null || echo "default_webhook_secret")"
    [DATABASE_URL]="sqlite:./remittance.db"
    [JWT_SECRET]="$(openssl rand -hex 32 2>/dev/null || echo "default_jwt_secret")"
    [SESSION_SECRET]="$(openssl rand -hex 32 2>/dev/null || echo "default_session_secret")"
    [CRON_API_KEY]="$(openssl rand -hex 16 2>/dev/null || echo "default_cron_key")"
    [UNISWAP_API_KEY]=""
    [UNISWAP_QUOTER_ADDRESS]="0x82825d0554fA07f7FC52Ab63c961F33A2d962469"
    [UNISWAP_ROUTER_ADDRESS]="0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"
    [LI_FI_API_KEY]=""
    [MANDATE_API_KEY]=""
    [VENICE_API_KEY]=""
    [SELF_APP_ID]=""
    [SELF_APP_SECRET]=""
    [SWAP_FEE_PERCENTAGE]="1.5"
    [BRIDGE_FEE_PERCENTAGE]="1.5"
)

# Timeout settings
INPUT_TIMEOUT=30  # 30 seconds for user input
MAX_RETRIES=3     # Max retries for failed operations

# Deployment directory with fallback
DEPLOYMENT_DIR=""
TIMESTAMP="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo "default")"
DEFAULT_DEPLOYMENT_DIR="email-remittance-deployment-$TIMESTAMP"

# Error handling
trap 'handle_error $? $LINENO' ERR
trap 'handle_interrupt' INT TERM

function handle_error() {
    local exit_code=$1
    local line_number=$2
    echo -e "${RED}❌ Error occurred at line $line_number (exit code: $exit_code)${NC}"
    echo -e "${YELLOW}The script will attempt to continue...${NC}"
    
    # Attempt to save progress if deployment dir exists
    if [ -n "$DEPLOYMENT_DIR" ] && [ -d "$DEPLOYMENT_DIR" ]; then
        save_progress
    fi
}

function handle_interrupt() {
    echo -e "\n${YELLOW}⚠️  Script interrupted by user.${NC}"
    
    if [ -n "$DEPLOYMENT_DIR" ] && [ -d "$DEPLOYMENT_DIR" ]; then
        echo -e "${YELLOW}Saving progress before exiting...${NC}"
        save_progress
    fi
    
    echo -e "${GREEN}Configuration files saved in: $DEPLOYMENT_DIR${NC}"
    echo -e "${YELLOW}You can resume later by running this script again.${NC}"
    exit 1
}

function save_progress() {
    if [ -z "$DEPLOYMENT_DIR" ] || [ ! -d "$DEPLOYMENT_DIR" ]; then
        return
    fi
    
    # Save current configuration
    declare -p config > "$DEPLOYMENT_DIR/progress.sh" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Progress saved to $DEPLOYMENT_DIR/progress.sh${NC}"
    else
        echo -e "${RED}❌ Failed to save progress${NC}"
    fi
}

function load_progress() {
    if [ -f "$DEPLOYMENT_DIR/progress.sh" ]; then
        echo -e "${YELLOW}Found saved progress. Loading...${NC}"
        source "$DEPLOYMENT_DIR/progress.sh" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Progress loaded successfully${NC}"
            return 0
        else
            echo -e "${RED}❌ Failed to load progress. Starting fresh.${NC}"
            return 1
        fi
    fi
    return 1
}

function header() {
    clear 2>/dev/null || {
        echo -e "${BLUE}"
        echo -e "╔════════════════════════════════════════════════════════════════════════════╗"
        echo -e "║  Email Remittance Pro - Robust Interactive Deployment  ║"
        echo -e "╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    }
    echo -e "${YELLOW}"
    echo -e "This script will guide you through deploying Email Remittance Pro"
    echo -e "with comprehensive error handling and fallback mechanisms.${NC}"
    echo -e
}

function section_header() {
    echo -e "${BLUE}┌────────────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│ $1${NC}"
    echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
}

function timed_input() {
    local prompt=$1
    local var_name=$2
    local default=$3
    local validation=$4
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        # Set timeout for input
        if [ -n "$default" ]; then
            echo -e -n "${YELLOW}$prompt ${GREEN}[$default]${NC} (${INPUT_TIMEOUT}s timeout): "
        else
            echo -e -n "${YELLOW}$prompt${NC} (${INPUT_TIMEOUT}s timeout): "
        fi
        
        # Read with timeout
        if ! read -t $INPUT_TIMEOUT -r value; then
            echo -e "${RED}⏰ Input timed out.${NC}"
            if [ -n "$default" ]; then
                echo -e "${YELLOW}Using default value: $default${NC}"
                value=$default
                break
            else
                echo -e "${RED}No default value available. Please try again.${NC}"
                retry_count=$((retry_count + 1))
                continue
            fi
        fi
        
        # Use default if no input
        if [ -z "$value" ] && [ -n "$default" ]; then
            value=$default
        fi
        
        # Validate input if validation function provided
        if [ -n "$validation" ]; then
            if ! $validation "$value"; then
                echo -e "${RED}Invalid input. Please try again.${NC}"
                retry_count=$((retry_count + 1))
                continue
            fi
        fi
        
        # Input is valid
        config[$var_name]=$value
        return 0
    done
    
    # If we get here, max retries reached
    echo -e "${RED}❌ Maximum retries reached for this input.${NC}"
    if [ -n "$default" ]; then
        echo -e "${YELLOW}Using default value: $default${NC}"
        config[$var_name]=$default
        return 0
    else
        echo -e "${RED}No valid input provided. Using fallback value.${NC}"
        return 1
    fi
}

function validate_domain() {
    local domain=$1
    if [[ $domain =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        echo -e "${RED}Invalid domain format. Please use format: example.com${NC}"
        return 1
    fi
}

function validate_url() {
    local url=$1
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        echo -e "${RED}Invalid URL format. Please include http:// or https://${NC}"
        return 1
    fi
}

function validate_wallet() {
    local wallet=$1
    if [[ $wallet =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        return 0
    else
        echo -e "${RED}Invalid wallet address. Must be 40 hex characters starting with 0x${NC}"
        return 1
    fi
}

function validate_private_key() {
    local key=$1
    if [[ $key =~ ^0x[a-fA-F0-9]{64}$ ]]; then
        return 0
    else
        echo -e "${RED}Invalid private key. Must be 64 hex characters starting with 0x${NC}"
        return 1
    fi
}

function generate_secret() {
    openssl rand -hex 32 2>/dev/null || echo "fallback_secret_$(date +%s)"
}

function generate_api_key() {
    openssl rand -hex 16 2>/dev/null || echo "fallback_key_$(date +%s)"
}

function create_deployment_dir() {
    local attempt=0
    
    while [ $attempt -lt $MAX_RETRIES ]; do
        # Use default directory if not set
        if [ -z "$DEPLOYMENT_DIR" ]; then
            DEPLOYMENT_DIR=$DEFAULT_DEPLOYMENT_DIR
        fi
        
        # Create directory
        if mkdir -p "$DEPLOYMENT_DIR" 2>/dev/null; then
            echo -e "${GREEN}✅ Created deployment directory: $DEPLOYMENT_DIR${NC}"
            return 0
        else
            echo -e "${RED}❌ Failed to create directory: $DEPLOYMENT_DIR${NC}"
            attempt=$((attempt + 1))
            
            # Try alternative directory
            DEPLOYMENT_DIR="email-remittance-deployment-attempt$attempt-$TIMESTAMP"
            echo -e "${YELLOW}Trying alternative directory: $DEPLOYMENT_DIR${NC}"
        fi
    done
    
    echo -e "${RED}❌ Failed to create deployment directory after $MAX_RETRIES attempts${NC}"
    echo -e "${YELLOW}Using current directory for output files${NC}"
    DEPLOYMENT_DIR="."
    return 1
}

function confirm_configuration() {
    section_header "CONFIRM CONFIGURATION"
    
    echo -e "${YELLOW}Please review your configuration:${NC}"
    echo -e
    
    echo -e "${BLUE}Domain Configuration:${NC}"
    echo -e "  Main Domain: ${GREEN}${config[DOMAIN]}${NC}"
    echo -e "  Frontend URL: ${GREEN}${config[FRONTEND_URL]}${NC}"
    echo -e "  Backend URL: ${GREEN}${config[BACKEND_URL]}${NC}"
    echo -e "  Render URL: ${GREEN}${config[RENDER_URL]}${NC}"
    echo -e
    
    echo -e "${BLUE}Blockchain Configuration:${NC}"
    echo -e "  Blockchain: ${GREEN}${config[BLOCKCHAIN]}${NC}"
    echo -e "  RPC URL: ${GREEN}${config[BLOCKCHAIN_RPC]}${NC}"
    echo -e "  Wallet Address: ${GREEN}${config[WALLET_ADDRESS]}${NC}"
    echo -e
    
    echo -e "${BLUE}Security Configuration:${NC}"
    echo -e "  Cron API Key: ${GREEN}${config[CRON_API_KEY]}${NC}"
    echo -e
    
    echo -e "${YELLOW}Configuration files will be saved in: ${GREEN}$DEPLOYMENT_DIR${NC}"
    echo -e "${YELLOW}Note: Swap/bridge fees (${config[SWAP_FEE_PERCENTAGE]}%) will be deducted from the recipient amount.${NC}"
    echo -e
    
    # For automated testing, accept the configuration
    if [ -z "$confirm" ]; then
        echo -e "${GREEN}Automated testing: Accepting configuration...${NC}"
        return 0
    fi
    
    while true; do
        echo -e -n "${YELLOW}Is this configuration correct? (y/n): ${NC}"
        read -t $INPUT_TIMEOUT -r confirm
        
        case $confirm in
            [Yy]* )
                return 0
                ;;
            [Nn]* )
                echo -e "${YELLOW}Please re-enter the configuration.${NC}"
                return 1
                ;;
            * )
                echo -e "${RED}Please answer y or n.${NC}"
                ;;
        esac
    done
}

function configure_domain() {
    section_header "DOMAIN CONFIGURATION"
    
    timed_input "Enter your main domain (e.g., remittance.drdeeks.xyz):" "DOMAIN" "${config[DOMAIN]}" validate_domain
    
    # Auto-generate URLs based on domain
    if [ "${config[DOMAIN]}" != "${config[FRONTEND_URL]#https://}" ]; then
        config[FRONTEND_URL]="https://${config[DOMAIN]}"
    fi
    
    if [ "${config[DOMAIN]}" != "${config[BACKEND_URL]#https://api.}" ]; then
        config[BACKEND_URL]="https://api.${config[DOMAIN]}"
    fi
    
    timed_input "Enter your frontend URL:" "FRONTEND_URL" "${config[FRONTEND_URL]}" validate_url
    timed_input "Enter your backend URL:" "BACKEND_URL" "${config[BACKEND_URL]}" validate_url
    timed_input "Enter your Render backend URL:" "RENDER_URL" "${config[RENDER_URL]}" validate_url
}

function configure_blockchain() {
    section_header "BLOCKCHAIN CONFIGURATION"
    
    echo -e "${YELLOW}Select blockchain network:${NC}"
    echo -e "${GREEN}1) Celo (recommended)${NC}"
    echo -e "${GREEN}2) Base${NC}"
    echo -e "${GREEN}3) Monad${NC}"
    echo -e "${GREEN}4) Custom${NC}"
    
    timed_input "Enter your choice (1-4):" "BLOCKCHAIN_CHOICE" "1"
    
    case ${config[BLOCKCHAIN_CHOICE]} in
        1) config[BLOCKCHAIN]="celo"; config[BLOCKCHAIN_RPC]="https://forno.celo.org" ;;
        2) config[BLOCKCHAIN]="base"; config[BLOCKCHAIN_RPC]="https://mainnet.base.org" ;;
        3) config[BLOCKCHAIN]="monad"; config[BLOCKCHAIN_RPC]="https://rpc.monad.xyz" ;;
        4)
            timed_input "Enter blockchain name (e.g., ethereum):" "BLOCKCHAIN" "${config[BLOCKCHAIN]}"
            timed_input "Enter RPC URL:" "BLOCKCHAIN_RPC" "${config[BLOCKCHAIN_RPC]}" validate_url
            ;;
        *)
            echo -e "${RED}Invalid choice. Using Celo as fallback.${NC}"
            config[BLOCKCHAIN]="celo"
            config[BLOCKCHAIN_RPC]="https://forno.celo.org"
            ;;
    esac
    
    timed_input "Enter your wallet private key (0x...):" "WALLET_PRIVATE_KEY" "${config[WALLET_PRIVATE_KEY]}" validate_private_key
    timed_input "Enter your wallet address (0x...):" "WALLET_ADDRESS" "${config[WALLET_ADDRESS]}" validate_wallet
}

function configure_email() {
    section_header "EMAIL CONFIGURATION"
    
    timed_input "Enter your Resend API key (re_...):" "RESEND_API_KEY" "${config[RESEND_API_KEY]}"
    timed_input "Enter webhook secret (leave blank to generate):" "RESEND_WEBHOOK_SECRET" "$(generate_secret)"
}

function configure_database() {
    section_header "DATABASE CONFIGURATION"
    
    echo -e "${YELLOW}Select database type:${NC}"
    echo -e "${GREEN}1) SQLite (simple, file-based)${NC}"
    echo -e "${GREEN}2) PostgreSQL (recommended for production)${NC}"
    
    timed_input "Enter your choice (1-2):" "DATABASE_CHOICE" "2"
    
    case ${config[DATABASE_CHOICE]} in
        1) config[DATABASE_URL]="sqlite:./remittance.db" ;;
        2)
            timed_input "Enter PostgreSQL connection string:" "DATABASE_URL" "${config[DATABASE_URL]}"
            ;;
        *)
            echo -e "${RED}Invalid choice. Using PostgreSQL as fallback.${NC}"
            config[DATABASE_URL]="postgresql://user:password@localhost:5432/remittance_pro"
            ;;
    esac
}

function configure_security() {
    section_header "SECURITY CONFIGURATION"
    
    timed_input "Enter JWT secret (leave blank to generate):" "JWT_SECRET" "$(generate_secret)"
    timed_input "Enter session secret (leave blank to generate):" "SESSION_SECRET" "$(generate_secret)"
    timed_input "Enter cron API key (leave blank to generate):" "CRON_API_KEY" "$(generate_api_key)"
}

function configure_addons() {
    section_header "ADDITIONAL SERVICES"
    
    echo -e "${YELLOW}Optional services (leave blank to skip):${NC}"
    
    timed_input "Enter Mandate API key:" "MANDATE_API_KEY" "${config[MANDATE_API_KEY]}"
    timed_input "Enter Venice API key:" "VENICE_API_KEY" "${config[VENICE_API_KEY]}"
    timed_input "Enter Self Protocol App ID:" "SELF_APP_ID" "${config[SELF_APP_ID]}"
    timed_input "Enter Self Protocol App Secret:" "SELF_APP_SECRET" "${config[SELF_APP_SECRET]}"
    timed_input "Enter Uniswap API key (for swaps/bridges):" "UNISWAP_API_KEY" "${config[UNISWAP_API_KEY]}"
    timed_input "Enter LI.FI API key (for cross-chain quotes):" "LI_FI_API_KEY" "${config[LI_FI_API_KEY]}"
    
    # Self Protocol configuration
    config[BASE_SELF_CONTRACT]="0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0"
    config[MONAD_SELF_CONTRACT]="0x7BC66eD8285b51F84D170F158aD162cA144F32c1"
    config[CELO_SELF_CONTRACT]="0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0"
    config[SELF_ATTESTER_ADDRESS]="${config[WALLET_ADDRESS]}"
    config[DEFAULT_REQUIRE_AUTH]="false"
    config[MIN_AGE]="18"
    config[HIGH_VALUE_THRESHOLD]="100"
    config[SELF_API_URL]="https://api.self.xyz/v1"
    config[SELF_API_TIMEOUT]="10000"
    config[SELF_MONITORING_ENABLED]="true"
    config[SELF_ALERT_THRESHOLD]="5"
    config[SELF_ROLLBACK_ENABLED]="true"
    config[SELF_MAX_RETRIES]="3"
    
    # Set default swap/bridge fee percentages
    config[SWAP_FEE_PERCENTAGE]="1.5"
    config[BRIDGE_FEE_PERCENTAGE]="1.5"
}

function generate_config_files() {
    section_header "GENERATING CONFIGURATION FILES"
    
    # Create deployment directory
    create_deployment_dir
    
    # Generate .env file
    echo -e "${YELLOW}Generating .env file...${NC}"
    cat > "$DEPLOYMENT_DIR/.env" << EOF
# Email Remittance Pro - Production Environment
# Generated by interactive deployment script
# $(date)

# Server Configuration
PORT=3001
LOG_LEVEL=info
NODE_ENV=production

# Domain Configuration
DOMAIN=${config[DOMAIN]}
BASE_URL=${config[BACKEND_URL]}
FRONTEND_URL=${config[FRONTEND_URL]}

# Webhook Configuration
WEBHOOK_BASE_URL=${config[BACKEND_URL]}/api/webhook
RESEND_WEBHOOK_URL=\${WEBHOOK_BASE_URL}/resend
RESEND_WEBHOOK_SECRET=${config[RESEND_WEBHOOK_SECRET]}

# Blockchain Configuration
BLOCKCHAIN=${config[BLOCKCHAIN]}
${config[BLOCKCHAIN]}_RPC_URL=${config[BLOCKCHAIN_RPC]}
WALLET_PRIVATE_KEY=${config[WALLET_PRIVATE_KEY]}
SERVER_WALLET_ADDRESS=${config[WALLET_ADDRESS]}

# Uniswap Configuration
UNISWAP_API_KEY=${config[UNISWAP_API_KEY]}
UNISWAP_QUOTER_ADDRESS=${config[UNISWAP_QUOTER_ADDRESS]}
UNISWAP_ROUTER_ADDRESS=${config[UNISWAP_ROUTER_ADDRESS]}
SWAP_FEE_PERCENTAGE=${config[SWAP_FEE_PERCENTAGE]}
BRIDGE_FEE_PERCENTAGE=${config[BRIDGE_FEE_PERCENTAGE]}

# LI.FI Configuration
LI_FI_API_KEY=${config[LI_FI_API_KEY]}

# Self Protocol Configuration
BASE_SELF_CONTRACT=${config[BASE_SELF_CONTRACT]}
MONAD_SELF_CONTRACT=${config[MONAD_SELF_CONTRACT]}
CELO_SELF_CONTRACT=${config[CELO_SELF_CONTRACT]}
SELF_ATTESTER_ADDRESS=${config[SELF_ATTESTER_ADDRESS]}
SELF_API_URL=${config[SELF_API_URL]}
SELF_APP_ID=${config[SELF_APP_ID]}
SELF_APP_SECRET=${config[SELF_APP_SECRET]}
DEFAULT_REQUIRE_AUTH=${config[DEFAULT_REQUIRE_AUTH]}
MIN_AGE=${config[MIN_AGE]}
HIGH_VALUE_THRESHOLD=${config[HIGH_VALUE_THRESHOLD]}
SELF_API_TIMEOUT=10000
SELF_MONITORING_ENABLED=true
SELF_ALERT_THRESHOLD=5
SELF_ROLLBACK_ENABLED=true
SELF_MAX_RETRIES=3

# Email Configuration
RESEND_API_KEY=${config[RESEND_API_KEY]}

# Database Configuration
DATABASE_URL=${config[DATABASE_URL]}

# Security Configuration
JWT_SECRET=${config[JWT_SECRET]}
SESSION_SECRET=${config[SESSION_SECRET]}
CRON_API_KEY=${config[CRON_API_KEY]}

# Optional Services
MANDATE_API_KEY=${config[MANDATE_API_KEY]}
VENICE_API_KEY=${config[VENICE_API_KEY]}
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate .env file${NC}"
        return 1
    else
        echo -e "${GREEN}✅ .env file generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Generate Cloudflare Pages configuration
    echo -e "${YELLOW}Generating Cloudflare Pages configuration...${NC}"
    cat > "$DEPLOYMENT_DIR/cloudflare-pages-config.txt" << EOF
# Cloudflare Pages Configuration
# Use these settings when creating your Cloudflare Pages project

Project Name: email-remittance-pro-frontend
Production Branch: PLGV2
Build Command: cd frontend && npm install && npm run build
Build Output Directory: frontend/dist

# Custom Domain
Domain: ${config[DOMAIN]}
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate Cloudflare Pages configuration${NC}"
    else
        echo -e "${GREEN}✅ Cloudflare Pages configuration generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Generate Render configuration
    echo -e "${YELLOW}Generating Render configuration...${NC}"
    cat > "$DEPLOYMENT_DIR/render-config.txt" << EOF
# Render Web Service Configuration
# Use these settings when creating your Render service

Name: email-remittance-pro-backend
Region: Oregon (US West)
Branch: PLGV2
Root Directory: /
Build Command: npm install && npm run build
Start Command: npm start
Instance Type: Starter

# Environment Variables
BASE_URL: ${config[BACKEND_URL]}
RESEND_API_KEY: ${config[RESEND_API_KEY]}
WALLET_PRIVATE_KEY: ${config[WALLET_PRIVATE_KEY]}
DATABASE_URL: ${config[DATABASE_URL]}
CRON_API_KEY: ${config[CRON_API_KEY]}
RESEND_WEBHOOK_SECRET: ${config[RESEND_WEBHOOK_SECRET]}

# Custom Domain
Custom Domain: ${config[BACKEND_URL]}
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate Render configuration${NC}"
    else
        echo -e "${GREEN}✅ Render configuration generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Generate DNS configuration
    echo -e "${YELLOW}Generating DNS configuration...${NC}"
    cat > "$DEPLOYMENT_DIR/dns-config.txt" << EOF
# DNS Configuration for Cloudflare
# Add these records to your Cloudflare DNS settings

# Frontend (Cloudflare Pages)
Type: CNAME
Name: @
Value: ${config[DOMAIN]}.pages.dev
Proxy status: Proxied
TTL: Auto

# Backend (Render)
Type: CNAME
Name: api
Value: ${config[RENDER_URL]#*//}
Proxy status: DNS only
TTL: Auto
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate DNS configuration${NC}"
    else
        echo -e "${GREEN}✅ DNS configuration generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Generate deployment instructions
    echo -e "${YELLOW}Generating deployment instructions...${NC}"
    cat > "$DEPLOYMENT_DIR/DEPLOYMENT_INSTRUCTIONS.md" << EOF
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
   - URL: "${config[BACKEND_URL]}/api/webhook/resend"
   - Events: email.delivered, email.bounced, email.opened
   - Secret: "${config[RESEND_WEBHOOK_SECRET]}"

### 5. Configure Uniswap/LI.FI
1. Ensure "`UNISWAP_API_KEY`" and "`LI_FI_API_KEY`" are set in your Render environment variables.
2. Verify the "`UNISWAP_QUOTER_ADDRESS`" and "`UNISWAP_ROUTER_ADDRESS`" are correct for your blockchain.

### 6. Test Your Deployment
1. Visit "${config[FRONTEND_URL]}" to test the frontend
2. Test the API: 
   "curl ${config[BACKEND_URL]}/api/health"
3. Send a test remittance and verify:
   - Email flow works
   - Token swaps/bridges execute correctly
   - Fees are deducted from the recipient amount

## 🎉 You're Done!

Your Email Remittance Pro platform is now live with:
- ✅ Frontend on Cloudflare Pages ("${config[FRONTEND_URL]}")
- ✅ Backend on Render ("${config[BACKEND_URL]}")
- ✅ Resend email integration with webhooks
- ✅ 7-day expiration with ${config[SWAP_FEE_PERCENTAGE]}% swap/bridge fees
- ✅ Token swaps and cross-chain bridging (powered by Uniswap/LI.FI)
- ✅ Zero platform gas costs (fees deducted from recipient amount)
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate deployment instructions${NC}"
    else
        echo -e "${GREEN}✅ Deployment instructions generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Generate cron job setup
    echo -e "${YELLOW}Generating cron job setup...${NC}"
    cat > "$DEPLOYMENT_DIR/cron-job.txt" << EOF
# Cron Job for Expired Remittances
# Add this to your crontab on the Render service

# Run hourly to process expired remittances
0 * * * * curl -X POST -H "Authorization: Bearer ${config[CRON_API_KEY]}" ${config[BACKEND_URL]}/api/process-expired
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to generate cron job setup${NC}"
    else
        echo -e "${GREEN}✅ Cron job setup generated in $DEPLOYMENT_DIR${NC}"
    fi
    
    # Save progress
    save_progress
}

function display_summary() {
    section_header "DEPLOYMENT SUMMARY"
    
    echo -e "${YELLOW}Deployment Directory:${NC} ${GREEN}$DEPLOYMENT_DIR${NC}"
    echo -e
    
    echo -e "${YELLOW}Domain Configuration:${NC}"
    echo -e "  Main Domain: ${GREEN}${config[DOMAIN]}${NC}"
    echo -e "  Frontend URL: ${GREEN}${config[FRONTEND_URL]}${NC}"
    echo -e "  Backend URL: ${GREEN}${config[BACKEND_URL]}${NC}"
    echo -e "  Render URL: ${GREEN}${config[RENDER_URL]}${NC}"
    echo -e
    
    echo -e "${YELLOW}Blockchain Configuration:${NC}"
    echo -e "  Blockchain: ${GREEN}${config[BLOCKCHAIN]}${NC}"
    echo -e "  RPC URL: ${GREEN}${config[BLOCKCHAIN_RPC]}${NC}"
    echo -e
    
    echo -e "${YELLOW}Security Configuration:${NC}"
    echo -e "  Cron API Key: ${GREEN}${config[CRON_API_KEY]}${NC}"
    echo -e
    
    echo -e "${YELLOW}Generated Files:${NC}"
    echo -e "  .env - Environment configuration"
    echo -e "  cloudflare-pages-config.txt - Cloudflare Pages settings"
    echo -e "  render-config.txt - Render service settings"
    echo -e "  dns-config.txt - DNS configuration"
    echo -e "  DEPLOYMENT_INSTRUCTIONS.md - Step-by-step guide"
    echo -e "  cron-job.txt - Cron job for expired remittances"
    echo -e
}

function display_env_file() {
    section_header "ENVIRONMENT CONFIGURATION"
    
    echo -e "${YELLOW}Here's your .env file content (also saved in $DEPLOYMENT_DIR/.env):${NC}"
    echo -e "${BLUE}"
    cat "$DEPLOYMENT_DIR/.env" 2>/dev/null || {
        echo -e "${RED}Failed to display .env file content${NC}"
        echo -e "${YELLOW}You can find it in: $DEPLOYMENT_DIR/.env${NC}"
    }
    echo -e "${NC}"
    echo -e
}

function display_dns_instructions() {
    section_header "DNS CONFIGURATION"
    
    echo -e "${YELLOW}Add these DNS records to Cloudflare:${NC}"
    echo -e "${BLUE}"
    cat "$DEPLOYMENT_DIR/dns-config.txt" 2>/dev/null || {
        echo -e "${RED}Failed to display DNS configuration${NC}"
        echo -e "${YELLOW}You can find it in: $DEPLOYMENT_DIR/dns-config.txt${NC}"
    }
    echo -e "${NC}"
    echo -e
}

function main() {
    header
    
    # Try to load saved progress
    if load_progress; then
        echo -e "${YELLOW}Resuming from saved progress...${NC}"
    else
        echo -e "${YELLOW}Starting new configuration...${NC}"
    fi
    
    # Configuration steps
    configure_domain
    configure_blockchain
    configure_email
    configure_database
    configure_security
    configure_addons
    
    # Confirm configuration before generating files
    if ! confirm_configuration; then
        echo -e "${YELLOW}Restarting configuration...${NC}"
        main
        return
    fi
    
    # Generate configuration files
    generate_config_files
    
    # Display final summary
    display_summary
    display_env_file
    display_dns_instructions
    
    echo -e "${GREEN}"
    echo -e "🎉 Interactive deployment configuration complete!"
    echo -e "${NC}"
    echo -e "${YELLOW}All configuration files are saved in: $DEPLOYMENT_DIR${NC}"
    echo -e "${YELLOW}Follow the instructions in DEPLOYMENT_INSTRUCTIONS.md to deploy your application.${NC}"
    echo -e
    echo -e "${PURPLE}Need help? Contact support or check the documentation.${NC}"
}

# Run main function
main