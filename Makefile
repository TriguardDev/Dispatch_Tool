# Dispatch Tool Development Makefile

.PHONY: help dev prod clean setup logs down

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup     - Install all dependencies"
	@echo "  make dev       - Start development environment"
	@echo "  make dev-bg    - Start development environment in background"
	@echo "  make prod      - Start production environment"
	@echo "  make prod-bg   - Start production environment in background"
	@echo "  make logs      - View development logs"
	@echo "  make down      - Stop all containers"
	@echo "  make clean     - Clean Docker system"
	@echo "  make test      - Run tests"
	@echo "  make backup    - Backup database"

# Setup dependencies
setup:
	@echo "Installing dependencies..."
	cd frontend && npm install
	@echo "Setup complete!"

# Development environment
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up --build

dev-bg:
	@echo "Starting development environment in background..."
	docker-compose -f docker-compose.dev.yml up --build -d

# Production environment
prod:
	@echo "Starting production environment..."
	docker-compose -f docker-compose.prod.yml up --build

prod-bg:
	@echo "Starting production environment in background..."
	docker-compose -f docker-compose.prod.yml up --build -d

# View logs
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
down:
	@echo "Stopping all containers..."
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.prod.yml down

# Stop and remove containers, networks, volumes
dev-down:
	@echo "Removing dev volume..."
	docker-compose -f docker-compose.dev.yml down -v

# Clean Docker system
clean:
	@echo "Cleaning Docker system..."
	docker system prune -a --volumes -f

# Run tests (placeholder)
test:
	@echo "Running tests..."
	cd backend && python -m pytest
	cd frontend && npm test

# Backup database (placeholder)
backup:
	@echo "Creating database backup..."
	docker exec -it dispatch_tool_v3-mysql-1 mysqldump -u root -p dispatch_tool > backup_$(shell date +%Y%m%d_%H%M%S).sql