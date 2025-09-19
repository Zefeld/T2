.PHONY: help install build up down restart logs clean test test-unit test-integration test-e2e lint format setup-models setup-env dev prod

# Цвета для вывода
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Показать справку
	@echo "$(GREEN)Career Platform - Управление проектом$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Установить зависимости для всех сервисов
	@echo "$(GREEN)Установка зависимостей...$(NC)"
	@cd apps/web-ui && npm install
	@cd services/gateway && npm install
	@cd services/auth-service && npm install
	@cd services/profile-service && npm install
	@cd services/gamification-service && npm install
	@cd services/analytics-service && npm install
	@cd services/jobs-matcher && npm install
	@cd packages/shared-types && npm install
	@cd packages/sdk && npm install
	@cd packages/ui-components && npm install
	@echo "$(GREEN)✓ Зависимости установлены$(NC)"

build: ## Собрать все Docker образы
	@echo "$(GREEN)Сборка Docker образов...$(NC)"
	@docker-compose build --no-cache
	@echo "$(GREEN)✓ Образы собраны$(NC)"

up: ## Запустить все сервисы
	@echo "$(GREEN)Запуск всех сервисов...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✓ Сервисы запущены$(NC)"
	@echo "$(YELLOW)Web UI: http://localhost:3000$(NC)"
	@echo "$(YELLOW)API Gateway: http://localhost:8080$(NC)"
	@echo "$(YELLOW)Swagger: http://localhost:8080/docs$(NC)"

down: ## Остановить все сервисы
	@echo "$(GREEN)Остановка сервисов...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✓ Сервисы остановлены$(NC)"

restart: down up ## Перезапустить все сервисы

logs: ## Показать логи всех сервисов
	@docker-compose logs -f

logs-service: ## Показать логи конкретного сервиса (make logs-service SERVICE=gateway)
	@docker-compose logs -f $(SERVICE)

clean: ## Очистить Docker ресурсы
	@echo "$(GREEN)Очистка Docker ресурсов...$(NC)"
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)✓ Ресурсы очищены$(NC)"

test: test-unit test-integration ## Запустить все тесты

test-unit: ## Запустить unit тесты
	@echo "$(GREEN)Запуск unit тестов...$(NC)"
	@cd apps/web-ui && npm run test
	@cd services/gateway && npm run test
	@cd services/auth-service && npm run test
	@cd services/profile-service && npm run test
	@cd services/gamification-service && npm run test
	@cd services/analytics-service && npm run test
	@cd services/jobs-matcher && npm run test
	@echo "$(GREEN)✓ Unit тесты выполнены$(NC)"

test-integration: ## Запустить интеграционные тесты
	@echo "$(GREEN)Запуск интеграционных тестов...$(NC)"
	@cd tests/integration && npm run test
	@echo "$(GREEN)✓ Интеграционные тесты выполнены$(NC)"

test-e2e: ## Запустить E2E тесты
	@echo "$(GREEN)Запуск E2E тестов...$(NC)"
	@cd tests/e2e && npm run test
	@echo "$(GREEN)✓ E2E тесты выполнены$(NC)"

lint: ## Проверить код линтерами
	@echo "$(GREEN)Проверка кода линтерами...$(NC)"
	@cd apps/web-ui && npm run lint
	@cd services/gateway && npm run lint
	@cd services/auth-service && npm run lint
	@cd services/profile-service && npm run lint
	@cd services/gamification-service && npm run lint
	@cd services/analytics-service && npm run lint
	@cd services/jobs-matcher && npm run lint
	@echo "$(GREEN)✓ Линтинг выполнен$(NC)"

format: ## Форматировать код
	@echo "$(GREEN)Форматирование кода...$(NC)"
	@cd apps/web-ui && npm run format
	@cd services/gateway && npm run format
	@cd services/auth-service && npm run format
	@cd services/profile-service && npm run format
	@cd services/gamification-service && npm run format
	@cd services/analytics-service && npm run format
	@cd services/jobs-matcher && npm run format
	@echo "$(GREEN)✓ Форматирование выполнено$(NC)"

setup-env: ## Создать .env файл из примера
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "$(GREEN)✓ Создан .env файл$(NC)"; \
		echo "$(YELLOW)⚠ Заполните необходимые переменные в .env файле$(NC)"; \
	else \
		echo "$(YELLOW)⚠ .env файл уже существует$(NC)"; \
	fi

setup-models: ## Настроить модели STT и TTS
	@echo "$(GREEN)Настройка моделей...$(NC)"
	@mkdir -p models/parakeet models/piper/voices storage/stt storage/tts
	@echo "$(YELLOW)Скачайте модели:$(NC)"
	@echo "1. Parakeet TDT 0.6b v3:"
	@echo "   wget -O models/parakeet/parakeet-tdt-0.6b-v3.nemo https://api.ngc.nvidia.com/v2/models/nvidia/nemo/parakeet_tdt_0_6b/versions/v0.6b/files/parakeet-tdt-0.6b-v3.nemo"
	@echo ""
	@echo "2. Piper voices (примеры):"
	@echo "   wget -O models/piper/voices/en_US-amy-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx"
	@echo "   wget -O models/piper/voices/en_US-amy-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json"
	@echo ""
	@echo "$(GREEN)✓ Структура каталогов создана$(NC)"

dev: setup-env ## Запустить в режиме разработки
	@echo "$(GREEN)Запуск в режиме разработки...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Режим разработки запущен$(NC)"

prod: ## Запустить в продакшн режиме
	@echo "$(GREEN)Запуск в продакшн режиме...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Продакшн режим запущен$(NC)"

migrate: ## Выполнить миграции базы данных
	@echo "$(GREEN)Выполнение миграций...$(NC)"
	@docker-compose exec postgres psql -U postgres -d career_platform -f /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql
	@echo "$(GREEN)✓ Миграции выполнены$(NC)"

seed: ## Заполнить базу демо-данными
	@echo "$(GREEN)Заполнение демо-данными...$(NC)"
	@docker-compose exec postgres psql -U postgres -d career_platform -f /docker-entrypoint-initdb.d/seeds/demo_data.sql
	@echo "$(GREEN)✓ Демо-данные загружены$(NC)"

backup: ## Создать бэкап базы данных
	@echo "$(GREEN)Создание бэкапа...$(NC)"
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U postgres career_platform > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Бэкап создан$(NC)"

restore: ## Восстановить базу из бэкапа (make restore BACKUP=backup_file.sql)
	@echo "$(GREEN)Восстановление из бэкапа...$(NC)"
	@docker-compose exec -T postgres psql -U postgres -d career_platform < backups/$(BACKUP)
	@echo "$(GREEN)✓ База восстановлена$(NC)"

health: ## Проверить состояние всех сервисов
	@echo "$(GREEN)Проверка состояния сервисов...$(NC)"
	@curl -f http://localhost:8080/health && echo "✓ Gateway: OK" || echo "✗ Gateway: FAIL"
	@curl -f http://localhost:8081/health && echo "✓ STT: OK" || echo "✗ STT: FAIL"
	@curl -f http://localhost:8082/health && echo "✓ TTS: OK" || echo "✗ TTS: FAIL"
	@curl -f http://localhost:8083/health && echo "✓ LLM Adapter: OK" || echo "✗ LLM Adapter: FAIL"
	@curl -f http://localhost:8084/health && echo "✓ Profile Service: OK" || echo "✗ Profile Service: FAIL"
	@curl -f http://localhost:8085/health && echo "✓ Gamification: OK" || echo "✗ Gamification: FAIL"
	@curl -f http://localhost:8086/health && echo "✓ Analytics: OK" || echo "✗ Analytics: FAIL"
	@curl -f http://localhost:8087/health && echo "✓ Jobs Matcher: OK" || echo "✗ Jobs Matcher: FAIL"
	@curl -f http://localhost:8088/health && echo "✓ Auth Service: OK" || echo "✗ Auth Service: FAIL"

watch: ## Следить за логами всех сервисов
	@docker-compose logs -f --tail=100

shell: ## Открыть shell в контейнере (make shell SERVICE=gateway)
	@docker-compose exec $(SERVICE) /bin/bash

psql: ## Подключиться к PostgreSQL
	@docker-compose exec postgres psql -U postgres -d career_platform

redis-cli: ## Подключиться к Redis
	@docker-compose exec redis redis-cli

docs: ## Генерировать документацию API
	@echo "$(GREEN)Генерация документации API...$(NC)"
	@cd services/gateway && npm run docs
	@echo "$(GREEN)✓ Документация сгенерирована$(NC)"

security-scan: ## Запустить проверки безопасности
	@echo "$(GREEN)Проверка безопасности...$(NC)"
	@cd infra/security && ./run_security_checks.sh
	@echo "$(GREEN)✓ Проверки безопасности выполнены$(NC)"

performance-test: ## Запустить нагрузочное тестирование
	@echo "$(GREEN)Нагрузочное тестирование...$(NC)"
	@cd tests/performance && npm run test
	@echo "$(GREEN)✓ Нагрузочные тесты выполнены$(NC)"
