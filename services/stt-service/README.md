# STT Service - Speech-to-Text с NeMo Parakeet

Микросервис для преобразования речи в текст с использованием NVIDIA NeMo Parakeet-TDT-0.6b-v3.

## Возможности

- 🎯 **Высокоточная транскрибация** с использованием NeMo Parakeet-TDT-0.6b-v3
- 🌍 **Многоязычная поддержка** (русский, английский, автоопределение)
- ⏱️ **Временные метки** для каждого слова
- 🚀 **Кэширование результатов** в Redis
- 📊 **Предобработка аудио** (нормализация, ресемплинг)
- 🔧 **Гибкая конфигурация** через переменные окружения
- 📈 **Мониторинг производительности**

## Поддерживаемые форматы

- WAV, MP3, FLAC, OGG, M4A
- Максимальный размер файла: 50MB
- Максимальная длительность: 300 секунд (настраивается)

## API Endpoints

### POST /transcribe
Транскрибация аудио файла

**Параметры:**
- `file`: Аудио файл (multipart/form-data)
- `language`: Язык ("auto", "ru", "en", "multilang")
- `enable_timestamps`: Включить временные метки (boolean)
- `enable_cache`: Использовать кэширование (boolean)

**Пример ответа:**
```json
{
  "text": "Пример транскрибации аудио файла",
  "confidence": 0.95,
  "language": "ru",
  "duration": 5.2,
  "words": [
    {
      "word": "Пример",
      "start": 0.0,
      "end": 0.8,
      "confidence": 0.98
    }
  ],
  "filename": "audio.wav",
  "processing_time": 1.234,
  "model_info": {...}
}
```

### GET /models
Информация о доступных моделях

### GET /languages
Список поддерживаемых языков

### GET /health
Проверка состояния сервиса

## Переменные окружения

```bash
# Основные настройки
STT_MODEL_PATH=/models/parakeet-tdt-0.6b-v3.nemo
STT_DEVICE=cuda  # или cpu
STT_LANGUAGE=auto
PORT=8001

# Параметры обработки
STT_SAMPLE_RATE=16000
STT_MAX_DURATION=300
STT_ENABLE_TIMESTAMPS=true
STT_ENABLE_PUNCTUATION=true

# Redis кэширование
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=3600

# Логирование
LOG_LEVEL=INFO
```

## Установка и запуск

### Docker (рекомендуется)

```bash
# Сборка образа
docker build -t t2-stt-service .

# Запуск контейнера
docker run -d \
  --name stt-service \
  --gpus all \
  -p 8001:8001 \
  -v /path/to/models:/models \
  -e STT_MODEL_PATH=/models/parakeet-tdt-0.6b-v3.nemo \
  -e REDIS_URL=redis://redis:6379/0 \
  t2-stt-service
```

### Локальная установка

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервиса
python src/main.py
```

## Модель NeMo Parakeet-TDT-0.6b-v3

Для работы сервиса требуется загрузить модель:

```bash
# Загрузка модели (пример)
wget https://api.ngc.nvidia.com/v2/models/nvidia/nemo/parakeet_tdt_0_6b_v3/versions/1.22.0/files/parakeet-tdt-0.6b-v3.nemo
```

## Производительность

- **GPU (CUDA)**: ~0.1x реального времени
- **CPU**: ~0.5x реального времени
- **Точность**: >95% для качественного аудио
- **Языки**: Русский, английский, многоязычный режим

## Мониторинг

Сервис предоставляет метрики:
- Время обработки
- Использование кэша
- Статистика по языкам
- Информация о модели

## Интеграция с T2 Platform

Сервис интегрирован с основной платформой T2:
- Единая система аутентификации
- Централизованное логирование
- Мониторинг через Prometheus
- Трейсинг запросов