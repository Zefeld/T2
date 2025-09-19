# TTS Service - Piper TTS
FROM python:3.10-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    espeak-ng \
    espeak-ng-data \
    libespeak-ng1 \
    libsndfile1 \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Установка Piper TTS
RUN pip install --no-cache-dir \
    piper-tts==1.2.0 \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    redis==5.0.1 \
    python-multipart==0.0.6 \
    numpy==1.24.3 \
    soundfile==0.12.1 \
    aiofiles==23.2.1

# Создание рабочей директории
WORKDIR /app

# Копирование исходного кода
COPY src/ ./src/
COPY requirements.txt ./

# Установка дополнительных зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Создание директорий для моделей и хранилища
RUN mkdir -p /app/models /app/storage

# Переменные окружения
ENV PYTHONPATH=/app
ENV TTS_SERVICE_PORT=8082
ENV TTS_MODEL_PATH=/app/models/piper/voices
ENV TTS_DEFAULT_VOICE=en_US-amy-medium
ENV TTS_SAMPLE_RATE=22050
ENV TTS_ENABLE_STREAMING=true
ENV REDIS_URL=redis://redis:6379

# Открытие порта
EXPOSE 8082

# Команда запуска
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8082"]