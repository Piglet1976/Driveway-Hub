#!/bin/bash

# Production Management Commands for Driveway Hub Tesla App

DEPLOY_DIR="/opt/driveway-hub"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

case "$1" in
    "status")
        print_status "Driveway Hub Production Status"
        
        echo "System Service:"
        sudo systemctl status driveway-hub --no-pager -l
        
        echo -e "\nDocker Containers:"
        cd $DEPLOY_DIR && docker-compose ps
        
        echo -e "\nDisk Usage:"
        df -h $DEPLOY_DIR
        
        echo -e "\nSSL Certificate Status:"
        sudo certbot certificates
        ;;
        
    "logs")
        print_status "Application Logs"
        cd $DEPLOY_DIR
        if [ "$2" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f --tail=100
        fi
        ;;
        
    "restart")
        print_status "Restarting Driveway Hub"
        if [ "$2" ]; then
            print_warning "Restarting service: $2"
            cd $DEPLOY_DIR && docker-compose restart "$2"
        else
            print_warning "Restarting all services"
            sudo systemctl restart driveway-hub
        fi
        print_success "Restart completed"
        ;;
        
    "update")
        print_status "Updating Application"
        cd $DEPLOY_DIR
        
        print_warning "Pulling latest code..."
        git pull origin main
        
        print_warning "Rebuilding containers..."
        docker-compose -f docker-compose.yml -f docker-compose.production.yml build
        
        print_warning "Restarting services..."
        sudo systemctl restart driveway-hub
        
        print_success "Update completed"
        ;;
        
    "backup")
        print_status "Creating Database Backup"
        BACKUP_FILE="$DEPLOY_DIR/backups/backup-$(date +%Y%m%d-%H%M%S).sql"
        mkdir -p "$DEPLOY_DIR/backups"
        
        docker exec driveway-hub-postgres pg_dump -U postgres driveway_hub_prod > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            print_success "Backup created: $BACKUP_FILE"
        else
            print_error "Backup failed"
        fi
        ;;
        
    "ssl-renew")
        print_status "Renewing SSL Certificates"
        sudo certbot renew
        
        if [ $? -eq 0 ]; then
            # Copy renewed certificates
            sudo cp /etc/letsencrypt/live/driveway-hub.app/fullchain.pem $DEPLOY_DIR/nginx/ssl/cert.pem
            sudo cp /etc/letsencrypt/live/driveway-hub.app/privkey.pem $DEPLOY_DIR/nginx/ssl/key.pem
            
            # Restart nginx
            cd $DEPLOY_DIR && docker-compose restart nginx
            
            print_success "SSL certificates renewed and nginx restarted"
        else
            print_error "SSL renewal failed"
        fi
        ;;
        
    "test-tesla")
        print_status "Testing Tesla API Integration"
        
        echo "Testing API health..."
        curl -s https://driveway-hub.app/api/health | jq .
        
        echo -e "\nTesting login..."
        TOKEN=$(curl -s -X POST https://driveway-hub.app/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email":"driver@test.com"}' | jq -r .token)
        
        if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
            print_success "Login successful"
            
            echo "Testing Tesla OAuth URL..."
            curl -s https://driveway-hub.app/api/auth/tesla \
                -H "Authorization: Bearer $TOKEN" | jq .
        else
            print_error "Login failed"
        fi
        ;;
        
    "monitor")
        print_status "Live Monitoring (Press Ctrl+C to exit)"
        cd $DEPLOY_DIR
        
        echo "Showing live logs and container status..."
        while true; do
            clear
            echo -e "${BLUE}=== Container Status ===${NC}"
            docker-compose ps
            
            echo -e "\n${BLUE}=== Recent Logs ===${NC}"
            docker-compose logs --tail=10 app
            
            sleep 5
        done
        ;;
        
    "shell")
        print_status "Accessing Application Shell"
        if [ "$2" = "db" ]; then
            docker exec -it driveway-hub-postgres psql -U postgres driveway_hub_prod
        elif [ "$2" = "redis" ]; then
            docker exec -it driveway-hub-redis redis-cli
        else
            docker exec -it driveway-hub-app /bin/sh
        fi
        ;;
        
    "env")
        print_status "Environment Configuration"
        echo "Current production environment file:"
        echo "Location: $DEPLOY_DIR/.env.production.local"
        echo ""
        echo "To edit: nano $DEPLOY_DIR/.env.production.local"
        echo "After changes, restart: ./production-commands.sh restart"
        ;;
        
    *)
        echo "Driveway Hub Tesla App - Production Management"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  status           - Show system and container status"
        echo "  logs [service]   - Show logs (optional: specify service)"
        echo "  restart [service]- Restart services (optional: specify service)"
        echo "  update          - Pull code and rebuild containers"
        echo "  backup          - Create database backup"
        echo "  ssl-renew       - Renew SSL certificates"
        echo "  test-tesla      - Test Tesla API integration"
        echo "  monitor         - Live monitoring dashboard"
        echo "  shell [db|redis]- Access shell (app, db, or redis)"
        echo "  env             - Show environment configuration info"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 logs app"
        echo "  $0 restart nginx"
        echo "  $0 shell db"
        echo ""
        ;;
esac