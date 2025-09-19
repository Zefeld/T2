# STT Service - NVIDIA NeMo Parakeet
FROM nvcr.io/nvidia/pytorch:23.10-py3

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    sox \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
RUN pip install --no-cache-dir \
    nemo-toolkit[asr]==1.22.0 \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    redis==5.0.1 \
    python-multipart==0.0.6 \
    librosa==0.10.1 \
    soundfile==0.12.1

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
ENV STT_SERVICE_PORT=8081
ENV STT_MODEL_PATH=/app/models/parakeet-tdt-0.6b-v3.nemo
ENV STT_DEVICE=cuda
ENV STT_BATCH_SIZE=1
ENV STT_ENABLE_PUNCTUATION=true
ENV STT_ENABLE_TIMESTAMPS=true
ENV STT_LANGUAGE=multilang
ENV REDIS_URL=redis://redis:6379

# Открытие порта
EXPOSE 8081

# Команда запуска
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8081"]