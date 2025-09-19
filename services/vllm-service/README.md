# vLLM Service для SciBox

Этот сервис предоставляет высокопроизводительный inference для больших языковых моделей с использованием vLLM, оптимизированный для развертывания на платформе SciBox.

## 🚀 Особенности

- **Высокая производительность**: Использует vLLM для быстрого inference
- **GPU оптимизация**: Полная поддержка NVIDIA GPU с CUDA
- **Масштабируемость**: Поддержка tensor и pipeline parallelism
- **Мониторинг**: Интеграция с Prometheus для метрик
- **Гибкая конфигурация**: Настройка через YAML файлы и переменные окружения
- **Docker готовность**: Полностью контейнеризованное решение

## 📁 Структура проекта

```
vllm-service/
├── Dockerfile                 # Docker образ для vLLM
├── docker-compose.yml        # Композиция сервисов
├── config/                   # Конфигурационные файлы
│   ├── vllm_config.yaml     # Основная конфигурация vLLM
│   ├── prometheus.yml       # Конфигурация мониторинга
│   └── .env.example         # Пример переменных окружения
├── scripts/                  # Скрипты управления
│   ├── start.sh             # Скрипт запуска сервиса
│   ├── download_model.sh    # Скрипт загрузки моделей
│   └── health_check.sh      # Проверка здоровья сервиса
├── models/                   # Директория для моделей
└── logs/                     # Логи сервиса
```

## 🛠 Установка и запуск

### Предварительные требования

- Docker и Docker Compose
- NVIDIA GPU с драйверами
- NVIDIA Container Toolkit
- Минимум 8GB GPU памяти (рекомендуется 16GB+)

### Быстрый старт

1. **Клонируйте конфигурацию**:
   ```bash
   # Конфигурация уже готова в папке vllm-service/
   cd vllm-service/
   ```

2. **Настройте переменные окружения**:
   ```bash
   cp config/.env.example config/.env
   # Отредактируйте config/.env под ваши нужды
   ```

3. **Запустите сервис**:
   ```bash
   docker-compose up -d
   ```

4. **Проверьте статус**:
   ```bash
   docker-compose ps
   docker-compose logs vllm-service
   ```

### Проверка работоспособности

```bash
# Проверка здоровья сервиса
curl http://localhost:8000/health

# Список доступных моделей
curl http://localhost:8000/v1/models

# Тестовый запрос
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "microsoft/DialoGPT-medium",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

## ⚙️ Конфигурация

### Основные параметры

Основные настройки можно изменить в файле `config/.env`:

```bash
# Модель для использования
MODEL_NAME=microsoft/DialoGPT-medium

# Настройки сервера
VLLM_HOST=0.0.0.0
VLLM_PORT=8000

# Настройки производительности
MAX_MODEL_LEN=2048
GPU_MEMORY_UTILIZATION=0.9
TENSOR_PARALLEL_SIZE=1

# Настройки памяти
MAX_NUM_BATCHED_TOKENS=2048
MAX_NUM_SEQS=256
```

### Продвинутая конфигурация

Детальные настройки доступны в `config/vllm_config.yaml`:

- Параллельная обработка
- Управление памятью
- Настройки квантизации
- Параметры безопасности
- Конфигурация мониторинга

## 🔧 Управление сервисом

### Скрипты управления

1. **Загрузка модели**:
   ```bash
   docker-compose exec vllm-service /app/scripts/download_model.sh "microsoft/DialoGPT-medium"
   ```

2. **Проверка здоровья**:
   ```bash
   docker-compose exec vllm-service /app/scripts/health_check.sh
   ```

3. **Просмотр логов**:
   ```bash
   docker-compose logs -f vllm-service
   ```

### Масштабирование

Для использования нескольких GPU:

```bash
# В .env файле
TENSOR_PARALLEL_SIZE=2  # Для 2 GPU
PIPELINE_PARALLEL_SIZE=1
```

## 📊 Мониторинг

### Prometheus метрики

Сервис экспортирует метрики на порт 8001:
- Количество запросов
- Время ответа
- Использование GPU
- Статистика токенов

Доступ к Prometheus: http://localhost:9090

### Основные метрики

- `vllm_request_duration_seconds` - время обработки запросов
- `vllm_request_total` - общее количество запросов
- `vllm_gpu_memory_usage` - использование GPU памяти
- `vllm_active_sequences` - активные последовательности

## 🔒 Безопасность

### Рекомендации

1. **Ограничение доступа**: Используйте reverse proxy для ограничения доступа
2. **Аутентификация**: Добавьте API ключи для продакшена
3. **Сетевая изоляция**: Используйте Docker networks
4. **Мониторинг**: Настройте алерты на аномальную активность

### Переменные окружения для безопасности

```bash
# Отключение небезопасных функций
TRUST_REMOTE_CODE=false
DISABLE_SAFETY_CHECKER=false
MAX_INPUT_LENGTH=2048
```

## 🚨 Устранение неполадок

### Частые проблемы

1. **Недостаточно GPU памяти**:
   ```bash
   # Уменьшите использование памяти
   GPU_MEMORY_UTILIZATION=0.7
   MAX_MODEL_LEN=1024
   ```

2. **Модель не загружается**:
   ```bash
   # Проверьте доступность модели
   docker-compose exec vllm-service python3 -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('microsoft/DialoGPT-medium')"
   ```

3. **Сервис не отвечает**:
   ```bash
   # Проверьте логи
   docker-compose logs vllm-service
   
   # Проверьте здоровье
   docker-compose exec vllm-service /app/scripts/health_check.sh
   ```

### Логи и диагностика

```bash
# Просмотр логов в реальном времени
docker-compose logs -f vllm-service

# Проверка использования ресурсов
docker stats vllm-service

# Проверка GPU
docker-compose exec vllm-service nvidia-smi
```

## 📈 Производительность

### Оптимизация

1. **GPU память**: Увеличьте `GPU_MEMORY_UTILIZATION` до 0.95 для максимальной производительности
2. **Batch size**: Настройте `MAX_NUM_BATCHED_TOKENS` под ваши задачи
3. **Параллелизм**: Используйте `TENSOR_PARALLEL_SIZE` для нескольких GPU
4. **Кэширование**: Включите `ENABLE_PREFIX_CACHING` для повторяющихся запросов

### Бенчмарки

Типичная производительность на RTX 4090:
- Модель 7B: ~50 tokens/sec
- Модель 13B: ~25 tokens/sec
- Модель 30B: ~10 tokens/sec

## 🤝 Поддержка

### Полезные ссылки

- [vLLM Documentation](https://docs.vllm.ai/)
- [Hugging Face Models](https://huggingface.co/models)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)

### Контакты

Для вопросов по развертыванию на SciBox обращайтесь к команде поддержки платформы.

---

**Примечание**: Этот сервис оптимизирован для SciBox и может требовать адаптации для других платформ.