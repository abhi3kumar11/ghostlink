#!/bin/bash

# GhostLink Deployment Script
# This script handles the complete deployment of GhostLink platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ghostlink"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
JWT_SECRET_PLACEHOLDER="ghostlink_jwt_secret_placeholder"

# Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check for docker-compose (v1) or docker compose (v2)
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install it first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Generate environment file
generate_env() {
    log_info "Generating environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        cat > "$ENV_FILE" << EOF
# GhostLink Environment Configuration
NODE_ENV=production
PORT=3000
CORS_ORIGIN=http://localhost:8080

# Security Keys (Auto-generated)
ENCRYPTION_KEY=$(openssl rand -hex 32)
ANON_SALT=$(openssl rand -hex 16)
JWT_SECRET=${JWT_SECRET_PLACEHOLDER}

# Database Configuration
REDIS_URL=redis://redis:6379

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=ghostlink_admin_$(openssl rand -hex 8)

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=7

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Privacy Settings
DATA_RETENTION_MESSAGES=300000
DATA_RETENTION_MEETINGS=14400000
DATA_RETENTION_SESSIONS=86400000
EOF
        log_success "Environment file created: $ENV_FILE"

        # Replace JWT secret placeholder with a real secret
        NEW_JWT_SECRET=$(openssl rand -hex 64)
        sed -i "s/${JWT_SECRET_PLACEHOLDER}/${NEW_JWT_SECRET}/" "$ENV_FILE"
        log_info "Generated and set a secure JWT_SECRET."
    else
        log_warning "Environment file already exists: $ENV_FILE"
    fi
}

# Build and deploy
deploy() {
    log_info "Starting GhostLink deployment..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true
    
    # Build images
    log_info "Building Docker images..."
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Start services
    log_info "Starting services..."
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to become healthy
    log_info "Waiting for services to become healthy..."
    TIMEOUT=180 # 3 minutes
    INTERVAL=5
    ELAPSED=0

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" ps | grep 'ghostlink-backend' | grep -q '(healthy)'; then
            log_success "Backend is healthy."
            break
        fi
        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
        log_info "Waiting... (${ELAPSED}s / ${TIMEOUT}s)"
    done

    if [ $ELAPSED -ge $TIMEOUT ]; then
        log_error "Timeout waiting for backend to become healthy."
        $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" logs ghostlink-backend
        exit 1
    fi
    
    # Final health checks
    check_health
    
    log_success "GhostLink deployment completed successfully!"
    show_access_info
}

# Health checks
check_health() {
    log_info "Performing health checks..."
    
    # Check backend health via proxy
    if curl -f --silent --output /dev/null http://localhost:8080/api/health; then
        log_success "Backend service is healthy"
    else
        log_error "Backend service health check failed"
        return 1
    fi
    
    # Check frontend health via proxy
    if curl -f --silent --output /dev/null http://localhost:8080/health; then
        log_success "Frontend service is healthy"
    else
        log_error "Frontend service health check failed"
        return 1
    fi
    
    # Check monitoring services
    if curl -f --silent --output /dev/null http://localhost:9090/-/healthy; then
        log_success "Prometheus is healthy"
    else
        log_warning "Prometheus health check failed"
    fi
    
    if curl -f --silent --output /dev/null http://localhost:3001/api/health; then
        log_success "Grafana is healthy"
    else
        log_warning "Grafana health check failed"
    fi
}

# Show access information
show_access_info() {
    echo ""
    echo "🚀 GhostLink is now running!"
    echo ""
    echo "📱 Application Access:"
    echo "   Frontend: http://localhost:8080"
    echo "   Backend API (via proxy): http://localhost:8080/api"
    echo ""
    echo "📊 Monitoring Access:"
    echo "   Grafana: http://localhost:3001 (admin/$(grep GRAFANA_ADMIN_PASSWORD .env | cut -d'=' -f2))"
    echo "   Prometheus: http://localhost:9090"
    echo ""
    echo "🔧 Management Commands (using '$COMPOSE_CMD'):"
    echo "   View logs: $COMPOSE_CMD logs -f"
    echo "   Stop services: $COMPOSE_CMD down"
    echo "   Restart services: $COMPOSE_CMD restart"
    echo "   Update services: ./deploy.sh update"
    echo ""
}

# Update deployment
update() {
    log_info "Updating GhostLink deployment..."
    
    # Pull latest images
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" pull
    
    # Rebuild and restart
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    log_success "GhostLink updated successfully!"
}

# Backup data
backup() {
    log_info "Creating backup..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup volumes
    docker run --rm -v ghostlink_redis-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/redis-data.tar.gz -C /data .
    docker run --rm -v ghostlink_grafana-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/grafana-data.tar.gz -C /data .
    docker run --rm -v ghostlink_prometheus-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/prometheus-data.tar.gz -C /data .
    
    # Backup configuration
    cp -r monitoring "$BACKUP_DIR/"
    cp docker-compose.yml "$BACKUP_DIR/"
    cp .env "$BACKUP_DIR/"
    
    log_success "Backup created: $BACKUP_DIR"
}

# Restore data
restore() {
    log_info "Restoring from backup..."
    
    BACKUP_DIR="$2"
    if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not provided or does not exist. Usage: ./deploy.sh restore <backup-directory>"
        exit 1
    fi

    log_warning "This will overwrite existing data. Are you sure you want to continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Restore operation cancelled."
        exit 0
    fi

    log_info "Stopping services before restore..."
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down

    log_info "Restoring volumes..."
    docker run --rm -v ghostlink_redis-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/redis-data.tar.gz -C /data"
    docker run --rm -v ghostlink_grafana-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/grafana-data.tar.gz -C /data"
    docker run --rm -v ghostlink_prometheus-data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/prometheus-data.tar.gz -C /data"

    log_info "Restoring configuration from $BACKUP_DIR..."
    cp "$BACKUP_DIR/.env" .

    log_success "Restore completed. Restarting services..."
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d
}

# Cleanup
cleanup() {
    log_info "Cleaning up GhostLink deployment..."
    
    # Stop and remove containers
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down --volumes --remove-orphans
    
    # Remove images
    docker images | grep ghostlink | awk '{print $3}' | xargs docker rmi -f || true
    
    # Clean up unused resources
    docker system prune -f
    
    log_success "Cleanup completed"
}

# Show logs
logs() {
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-}"
}

# Show status
status() {
    log_info "GhostLink Service Status:"
    $COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        check_prerequisites
        generate_env
        deploy
        ;;
    "update")
        update
        ;;
    "backup")
        backup
        ;;
    "restore")
        restore "$@"
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        logs "$@"
        ;;
    "status")
        status
        ;;
    "health")
        check_health
        ;;
    *)
        echo "Usage: $0 {deploy|update|backup|cleanup|logs|status|health}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy GhostLink platform"
        echo "  update  - Update existing deployment"
        echo "  backup  - Create backup of data and configuration"
        echo "  restore <dir> - Restore from a backup directory"
        echo "  cleanup - Remove all containers and images"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  health  - Check service health"
        exit 1
        ;;
esac
