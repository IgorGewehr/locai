#!/bin/bash

# Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="agente-imobiliaria"
DEPLOY_USER="deploy"
BACKUP_RETENTION_DAYS=7
MAX_DEPLOY_TIME=600  # 10 minutes

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create backup
create_backup() {
    log "Creating backup..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    if [ -d ".next" ]; then
        mkdir -p "$backup_dir"
        cp -r .next "$backup_dir/"
        cp -r public "$backup_dir/" 2>/dev/null || true
        cp package.json "$backup_dir/"
        cp package-lock.json "$backup_dir/" 2>/dev/null || true
        
        success "Backup created: $backup_dir"
    else
        warning "No previous build found to backup"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if [ -d "backups" ]; then
        find backups -type d -name "*_*" -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
        success "Old backups cleaned up"
    fi
}

# Function to validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check Node.js version
    if ! command_exists node; then
        error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        error "Node.js version $node_version is too old. Minimum required: $required_version"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV=production
    fi
    
    if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
        error "No environment file found. Please create .env or .env.local"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Function to install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Clean install
    if [ -f "package-lock.json" ]; then
        npm ci --production=false
    else
        npm install
    fi
    
    success "Dependencies installed"
}

# Function to run production checks
run_production_checks() {
    log "Running production readiness checks..."
    
    if [ -f "scripts/production-check.js" ]; then
        if node scripts/production-check.js; then
            success "Production checks passed"
        else
            error "Production checks failed"
            exit 1
        fi
    else
        warning "Production check script not found, skipping..."
    fi
}

# Function to run linting
run_linting() {
    log "Running linting..."
    
    if npm run lint; then
        success "Linting passed"
    else
        warning "Linting failed, but continuing..."
    fi
}

# Function to run type checking
run_type_check() {
    log "Running TypeScript type checking..."
    
    if npm run type-check; then
        success "Type checking passed"
    else
        warning "Type checking failed, but continuing..."
    fi
}

# Function to build application
build_application() {
    log "Building application..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build with timeout
    timeout $MAX_DEPLOY_TIME npm run build
    
    if [ $? -eq 0 ]; then
        success "Application built successfully"
    else
        error "Build failed"
        exit 1
    fi
}

# Function to test built application
test_build() {
    log "Testing built application..."
    
    # Start the application in background
    npm start &
    local app_pid=$!
    
    # Wait for application to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        success "Application health check passed"
    else
        error "Application health check failed"
        kill $app_pid 2>/dev/null || true
        exit 1
    fi
    
    # Kill the test instance
    kill $app_pid 2>/dev/null || true
    
    success "Build test completed"
}

# Function to optimize for production
optimize_production() {
    log "Optimizing for production..."
    
    # Remove development dependencies
    if [ -f "package-lock.json" ]; then
        npm ci --production
    else
        npm install --production
    fi
    
    # Remove unnecessary files
    find . -name "*.test.*" -delete 2>/dev/null || true
    find . -name "*.spec.*" -delete 2>/dev/null || true
    rm -rf __tests__ 2>/dev/null || true
    rm -rf coverage 2>/dev/null || true
    
    success "Production optimization completed"
}

# Function to setup PM2 ecosystem
setup_pm2() {
    log "Setting up PM2 ecosystem..."
    
    if ! command_exists pm2; then
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    success "PM2 ecosystem configured"
}

# Function to deploy with PM2
deploy_with_pm2() {
    log "Deploying with PM2..."
    
    # Stop existing application
    pm2 stop $APP_NAME 2>/dev/null || true
    
    # Start application
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    success "Application deployed with PM2"
}

# Function to setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Install PM2 monitoring
    if command_exists pm2; then
        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 10M
        pm2 set pm2-logrotate:retain 30
        pm2 set pm2-logrotate:compress true
    fi
    
    success "Monitoring setup completed"
}

# Function to run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    # Wait for application to be ready
    sleep 15
    
    # Test critical endpoints
    local endpoints=(
        "/api/health"
        "/api/health?detailed=true"
        "/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "http://localhost:3000$endpoint" >/dev/null 2>&1; then
            success "✓ $endpoint"
        else
            error "✗ $endpoint"
            exit 1
        fi
    done
    
    success "Smoke tests passed"
}

# Function to display deployment summary
display_summary() {
    echo ""
    echo "=============================================="
    echo "🚀 DEPLOYMENT SUMMARY"
    echo "=============================================="
    echo "Application: $APP_NAME"
    echo "Environment: $NODE_ENV"
    echo "Deploy Time: $(date)"
    echo "Node Version: $(node --version)"
    echo "npm Version: $(npm --version)"
    echo ""
    echo "URLs:"
    echo "  Application: http://localhost:3000"
    echo "  Health Check: http://localhost:3000/api/health"
    echo ""
    echo "Management Commands:"
    echo "  View Logs: pm2 logs $APP_NAME"
    echo "  Monitor: pm2 monit"
    echo "  Restart: pm2 restart $APP_NAME"
    echo "  Stop: pm2 stop $APP_NAME"
    echo "=============================================="
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    # Validate environment
    validate_environment
    
    # Create backup
    create_backup
    
    # Install dependencies
    install_dependencies
    
    # Run production checks
    run_production_checks
    
    # Run linting
    run_linting
    
    # Run type checking
    run_type_check
    
    # Build application
    build_application
    
    # Test build
    test_build
    
    # Optimize for production
    optimize_production
    
    # Setup PM2
    setup_pm2
    
    # Deploy with PM2
    deploy_with_pm2
    
    # Setup monitoring
    setup_monitoring
    
    # Run smoke tests
    run_smoke_tests
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Display summary
    display_summary
    
    success "🎉 Deployment completed successfully!"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"