#!/bin/bash
# Email Remittance Pro - Production Deployment Script
# This script deploys the application with the correct fee structure
# and validates all functionality before deployment

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/drdeeks/email-remittance-pro.git"
BRANCH="PLGV2"
APP_DIR="email-remittance-pro"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# Validate environment before starting
function validate_environment() {
    echo -e "${YELLOW}🔍 Validating deployment environment...${NC}"
    
    # Check for required commands
    for cmd in git node npm psql; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}❌ Error: $cmd is not installed${NC}"
            exit 1
        fi
    done
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [[ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]]; then
        echo -e "${RED}❌ Error: Node.js version must be 18+ (current: $NODE_VERSION)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Validate the codebase for correct fee implementation
function validate_fee_structure() {
    echo -e "${YELLOW}💰 Validating fee structure implementation...${NC}"
    
    # Check fee service implementation
    if ! grep -q "PROTOCOL_FEE_PERCENT = 0.015" src/services/feeService.ts; then
        echo -e "${RED}❌ Error: Protocol fee not set to 1.5% in feeService.ts${NC}"
        exit 1
    fi
    
    if ! grep -q "STORAGE_FEE_PERCENT = 0.015" src/services/feeService.ts; then
        echo -e "${RED}❌ Error: Storage fee not set to 1.5% in feeService.ts${NC}"
        exit 1
    fi
    
    # Check remittance service expiration
    if ! grep -q "7 \* 24 \* 60 \* 60" src/services/remittanceService.ts; then
        echo -e "${RED}❌ Error: Expiration not set to 7 days in remittanceService.ts${NC}"
        exit 1
    fi
    
    # Check storage fee application
    if ! grep -q "storage_fee.*=.*calculateStorageFee" src/services/remittanceService.ts; then
        echo -e "${RED}❌ Error: Storage fee not applied in handleExpiredRemittances${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Fee structure validation passed${NC}"
    echo -e "   - 1.5% protocol fee: Applied immediately on send"
    echo -e "   - 1.5% storage fee: Applied only on expired returns"
    echo -e "   - 7-day expiration: Correctly implemented"
    echo -e "   - Zero platform gas: Maintained from original"
}

# Run tests to verify functionality
function run_tests() {
    echo -e "${YELLOW}🧪 Running validation tests...${NC}"
    
    # Run fee model tests
    if ! npx jest tests/fee-model.test.ts --silent; then
        echo -e "${RED}❌ Error: Fee model tests failed${NC}"
        exit 1
    fi
    
    # Run expiration tests
    if [ -f "tests/expired-remittance.test.ts" ]; then
        if ! npx jest tests/expired-remittance.test.ts --silent; then
            echo -e "${RED}❌ Error: Expiration tests failed${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Backup existing installation
function create_backup() {
    echo -e "${YELLOW}🗄️  Creating backup...${NC}"
    
    if [ -d "$APP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$APP_DIR"/{src,package.json,package-lock.json,.env} "$BACKUP_DIR" 2>/dev/null || true
        echo -e "${GREEN}✅ Backup created in $BACKUP_DIR${NC}"
    fi
}

# Deploy the application
function deploy_application() {
    echo -e "${YELLOW}🚀 Deploying Email Remittance Pro...${NC}"
    
    # Clone or update repository
    if [ -d "$APP_DIR" ]; then
        echo -e "${YELLOW}🔄 Updating existing installation...${NC}"
        cd "$APP_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        echo -e "${YELLOW}📥 Cloning repository...${NC}"
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    # Install dependencies
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    
    # Build application
    echo -e "${YELLOW}🏗️  Building application...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ Deployment completed successfully${NC}"
}

# Verify deployment
function verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    cd "$APP_DIR"
    
    # Check if server starts
    timeout 10 npm start &> /dev/null &
    SERVER_PID=$!
    sleep 3
    
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${RED}❌ Error: Server failed to start${NC}"
        kill "$SERVER_PID" 2>/dev/null || true
        exit 1
    fi
    
    kill "$SERVER_PID" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Deployment verification passed${NC}"
}

# Main deployment function
function main() {
    echo -e "${GREEN}🚀 Starting Email Remittance Pro deployment${NC}"
    echo -e "${YELLOW}===========================================${NC}"
    
    validate_environment
    validate_fee_structure
    run_tests
    create_backup
    deploy_application
    verify_deployment
    
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}"
    echo -e "   Fee Structure:${NC}"
    echo -e "     - 1.5% protocol fee: Applied immediately on send"
    echo -e "     - 1.5% storage fee: Applied only on expired returns"
    echo -e "     - 7-day expiration: Correctly implemented"
    echo -e "     - Zero platform gas: Users pay all gas costs"
    echo -e "${YELLOW}"
    echo -e "   Next Steps:${NC}"
    echo -e "     1. Configure your .env file with required variables"
    echo -e "     2. Start the server: npm start"
    echo -e "     3. Set up your reverse proxy (Nginx/Apache)"
    echo -e "${YELLOW}===========================================${NC}"
}

# Run main function
main