#!/bin/bash

# Deployment script for Dispatch Tool V3
# This script is run by GitHub Actions on the EC2 instance

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found. Are you in the project root?"
    exit 1
fi

# Pull latest changes
print_status "Fetching latest changes from git..."
git fetch origin
git reset --hard origin/master

# Stop current containers gracefully
print_status "Stopping current containers..."
make down || print_warning "No containers were running"

# Clean up old images and containers to save space
print_status "Cleaning up old Docker resources..."
docker system prune -f

# Remove old images to save space
print_status "Removing old images..."
docker images --filter "dangling=true" -q | xargs -r docker rmi

# Build and start production environment
print_status "Building and starting production environment..."
make prod-bg

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check if containers are running
print_status "Container status:"
docker-compose -f docker-compose.prod.yml ps

# Test services
print_status "Testing service endpoints..."

# Test frontend
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "Frontend is healthy"
else
    print_warning "Frontend health check failed"
fi

# Test backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "Backend is healthy"
else
    print_warning "Backend health check failed"
fi

# Show final status
print_status "Deployment completed!"
print_status "Application is available at:"
echo "  Frontend: http://$(curl -s http://app.salesdispatcher.com"
echo "  Backend:  http://$(curl -s http://app.salesdispatcher.com/api"

print_status "Deployment script finished successfully! 🎉"