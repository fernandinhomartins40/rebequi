.PHONY: help up down build rebuild restart logs ps clean dev-postgres install migrate seed studio

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all services
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost/api"
	@echo "Health: http://localhost/api/health"

down: ## Stop all services
	docker-compose down
	@echo "✅ Services stopped!"

build: ## Build all services
	docker-compose build
	@echo "✅ Build completed!"

rebuild: down ## Rebuild and restart all services
	docker-compose up --build -d
	@echo "✅ Services rebuilt and started!"

restart: ## Restart all services
	docker-compose restart
	@echo "✅ Services restarted!"

logs: ## Show logs (make logs SERVICE=backend)
	@if [ -z "$(SERVICE)" ]; then \
		docker-compose logs -f; \
	else \
		docker-compose logs -f $(SERVICE); \
	fi

ps: ## Show running containers
	docker-compose ps

clean: ## Stop and remove all containers, networks, and volumes
	docker-compose down -v
	@echo "✅ Cleaned up! (containers, networks, and volumes removed)"

dev-postgres: ## Start only PostgreSQL for local development
	docker-compose up -d postgres
	@echo "✅ PostgreSQL started on port 5432"

install: ## Install dependencies in all workspaces
	npm install
	@echo "✅ Dependencies installed!"

migrate: ## Run Prisma migrations
	docker-compose exec backend npx prisma migrate deploy
	@echo "✅ Migrations applied!"

seed: ## Seed the database
	docker-compose exec backend npx prisma db seed
	@echo "✅ Database seeded!"

studio: ## Open Prisma Studio
	docker-compose exec backend npx prisma studio

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-postgres: ## Open PostgreSQL CLI
	docker-compose exec postgres psql -U rebequi -d rebequi

health: ## Check health of all services
	@echo "Checking services health..."
	@curl -s http://localhost/api/health || echo "❌ Backend unhealthy"
	@curl -s http://localhost/health || echo "❌ Frontend unhealthy"
	@echo "✅ Health check completed!"

stats: ## Show container resource usage
	docker stats

test-api: ## Test API endpoints
	@echo "Testing API endpoints..."
	@curl -s http://localhost/api/health | jq '.' || echo "Backend health check failed"
	@curl -s http://localhost/api/categories | jq '.' || echo "Categories endpoint failed"
	@curl -s http://localhost/api/products | jq '.' || echo "Products endpoint failed"
	@echo "✅ API tests completed!"

backup-db: ## Backup PostgreSQL database
	docker-compose exec postgres pg_dump -U rebequi rebequi > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backed up!"

restore-db: ## Restore PostgreSQL database (make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Please specify backup file: make restore-db FILE=backup.sql"; \
	else \
		docker-compose exec -T postgres psql -U rebequi rebequi < $(FILE); \
		echo "✅ Database restored from $(FILE)!"; \
	fi
