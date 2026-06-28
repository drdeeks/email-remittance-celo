#!/bin/bash
# Email Remittance Pro - Domain Setup Script
# Configures remittance.drdeeks.xyz with SSL and Nginx

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="remittance.drdeeks.xyz"
APP_DIR="/var/www/email-remittance-pro"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

function install_dependencies() {
    echo -e "${YELLOW}📦 Installing required dependencies...${NC}"
    
    sudo apt-get update
    sudo apt-get install -y nginx certbot python3-certbot-nginx
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

function configure_nginx() {
    echo -e "${YELLOW}🔧 Configuring Nginx for $DOMAIN...${NC}"
    
    # Create Nginx configuration
    sudo bash -c "cat > $NGINX_CONFIG << 'EOF'
$(cat nginx.conf)
EOF"
    
    # Enable the site
    sudo ln -sf $NGINX_CONFIG $NGINX_ENABLED
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configured for $DOMAIN${NC}"
}

function setup_ssl() {
    echo -e "${YELLOW}🔐 Setting up SSL with Let's Encrypt...${NC}"
    
    # Obtain SSL certificate
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@drdeeks.xyz
    
    # Set up auto-renewal
    sudo bash -c "echo '0 3 * * * /usr/bin/certbot renew --quiet' > /etc/cron.d/certbot-renewal"
    
    echo -e "${GREEN}✅ SSL certificate installed for $DOMAIN${NC}"
}

function deploy_application() {
    echo -e "${YELLOW}🚀 Deploying Email Remittance Pro...${NC}"
    
    # Create application directory
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # Copy application files
    cp -r . $APP_DIR/
    
    # Install dependencies
    cd $APP_DIR
    npm install
    
    # Build application
    npm run build
    
    # Set up environment
    cp .env.production $APP_DIR/.env
    
    echo -e "${GREEN}✅ Application deployed to $APP_DIR${NC}"
}

function setup_systemd() {
    echo -e "${YELLOW}⚙️  Setting up systemd service...${NC}"
    
    # Create systemd service file
    sudo bash -c "cat > /etc/systemd/system/email-remittance.service << 'EOF'
[Unit]
Description=Email Remittance Pro
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
EOF"
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable email-remittance
    sudo systemctl start email-remittance
    
    echo -e "${GREEN}✅ Systemd service configured${NC}"
}

function verify_setup() {
    echo -e "${YELLOW}🔍 Verifying setup...${NC}"
    
    # Check Nginx
    if curl -s http://localhost | grep -q "Email Remittance"; then
        echo -e "${GREEN}✅ Nginx serving content${NC}"
    else
        echo -e "${RED}❌ Nginx not serving content${NC}"
    fi
    
    # Check SSL
    if curl -s https://$DOMAIN | grep -q "Email Remittance"; then
        echo -e "${GREEN}✅ SSL configured correctly${NC}"
    else
        echo -e "${RED}❌ SSL not working${NC}"
    fi
    
    # Check API
    if curl -s https://$DOMAIN/api/health | grep -q "OK"; then
        echo -e "${GREEN}✅ API endpoint working${NC}"
    else
        echo -e "${RED}❌ API endpoint not working${NC}"
    fi
    
    # Check service status
    sudo systemctl status email-remittance --no-pager
}

function main() {
    echo -e "${GREEN}🚀 Starting Email Remittance Pro domain setup${NC}"
    echo -e "${YELLOW}Domain: $DOMAIN${NC}"
    echo -e "${YELLOW}===========================================${NC}"
    
    install_dependencies
    configure_nginx
    setup_ssl
    deploy_application
    setup_systemd
    verify_setup
    
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}🎉 Domain setup completed successfully!${NC}"
    echo -e "${YELLOW}"
    echo -e "   Domain: https://$DOMAIN${NC}"
    echo -e "${YELLOW}"
    echo -e "   Next Steps:${NC}"
    echo -e "     1. Configure Resend webhook: https://resend.com/webhooks"
    echo -e "     2. Set up cron job for expired remittances"
    echo -e "     3. Monitor logs: journalctl -u email-remittance -f"
    echo -e "${YELLOW}===========================================${NC}"
}

# Run main function
main