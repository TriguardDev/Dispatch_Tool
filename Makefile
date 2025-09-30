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
	@echo "  make dev-down  - Stop and remove dev containers and volumes"
	@echo "  make clean     - Clean Docker system"
	@echo "  make test      - Run tests"
	@echo "  make backup    - Backup development database"
	@echo "  make restore   - Restore development database from backup (requires BACKUP=filename.sql)"
	@echo "  make prod-backup - Backup production database"
	@echo "  make prod-restore - Restore production database from backup (requires BACKUP=filename.sql)"
	@echo "  make add-test-data - Add test data to the database"
	
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

dev-bg-data:
	@echo "Starting development environment in background with test data..."
	docker-compose -f docker-compose.dev.yml up --build -d
	./scripts/add_test_data.sh

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

add-test-data:
	@echo "Adding test data..."
	./scripts/add_test_data.sh

# Run tests (placeholder)
test:
	@echo "Running tests..."
	cd backend && python -m pytest
	cd frontend && npm test

# Backup development database
backup:
	@echo "Creating development database backup..."
	docker exec dev-database mysqldump -u root -psupersecret dev > backup_dev_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Development backup created: backup_dev_$(shell date +%Y%m%d_%H%M%S).sql"

# Restore development database from backup
restore:
	@echo "Available backup files:"
	@ls -la backup_*.sql 2>/dev/null || echo "No backup files found"
	@echo ""
	@echo "Usage: make restore BACKUP=backup_dev_YYYYMMDD_HHMMSS.sql"
	@if [ -z "$(BACKUP)" ]; then \
		echo "Please specify BACKUP file: make restore BACKUP=filename.sql"; \
		exit 1; \
	fi
	@if [ ! -f "$(BACKUP)" ]; then \
		echo "Backup file $(BACKUP) not found"; \
		exit 1; \
	fi
	@echo "Restoring development database from $(BACKUP)..."
	docker exec -i dev-database mysql -u root -psupersecret dev < $(BACKUP)
	@echo "Development database restored successfully"

# Backup production database  
prod-backup:
	@echo "Creating production database backup..."
	@echo "Note: This requires the production database to be running (make prod or make prod-bg)"
	@if ! docker ps | grep -q prod-database; then \
		echo "Error: Production database container 'prod-database' is not running"; \
		echo "Start it with: make prod-bg"; \
		exit 1; \
	fi
	@# Extract password from production env file
	@MYSQL_ROOT_PASSWORD=$$(grep MYSQL_ROOT_PASSWORD ./backend/.env.prod | cut -d '=' -f2); \
	docker exec prod-database mysqldump -u root -p$$MYSQL_ROOT_PASSWORD dev > backup_prod_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Production backup created: backup_prod_$(shell date +%Y%m%d_%H%M%S).sql"

# Restore production database from backup
prod-restore:
	@echo "Available backup files:"
	@ls -la backup_*.sql 2>/dev/null || echo "No backup files found"
	@echo ""
	@echo "Usage: make prod-restore BACKUP=backup_prod_YYYYMMDD_HHMMSS.sql"
	@echo "WARNING: This will overwrite the production database!"
	@if [ -z "$(BACKUP)" ]; then \
		echo "Please specify BACKUP file: make prod-restore BACKUP=filename.sql"; \
		exit 1; \
	fi
	@if [ ! -f "$(BACKUP)" ]; then \
		echo "Backup file $(BACKUP) not found"; \
		exit 1; \
	fi
	@if ! docker ps | grep -q prod-database; then \
		echo "Error: Production database container 'prod-database' is not running"; \
		echo "Start it with: make prod-bg"; \
		exit 1; \
	fi
	@echo "Restoring production database from $(BACKUP)..."
	@MYSQL_ROOT_PASSWORD=$$(grep MYSQL_ROOT_PASSWORD ./backend/.env.prod | cut -d '=' -f2); \
	docker exec -i prod-database mysql -u root -p$$MYSQL_ROOT_PASSWORD dev < $(BACKUP)
	@echo "Production database restored successfully"