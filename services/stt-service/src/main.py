"""STT Service - Speech-to-Text using NVIDIA NeMo Parakeet"""
import os
import logging
import hashlib
import json
import asyncio
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import redis
import tempfile
import soundfile as sf
import numpy as np
import torch
from datetime import datetime, timedelta

# NeMo imports
try:
    import nemo.collections.asr as nemo_asr
    from nemo.core.config import hydra_runner
    NEMO_AVAILABLE = True
except ImportError:
    NEMO_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("NeMo not available, running in mock mode")

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="STT Service",
    description="Speech-to-Text service using NVIDIA NeMo Parakeet-TDT-0.6b-v3",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене ограничить конкретными доменами
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальные переменные
asr_model = None
model_info = None
redis_client = None

# Конфигурация из переменных окружения
STT_MODEL_PATH = os.getenv("STT_MODEL_PATH", "/app/models/parakeet-tdt-0.6b-v3.nemo")
STT_DEVICE = os.getenv("STT_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
STT_BATCH_SIZE = int(os.getenv("STT_BATCH_SIZE", "4"))
STT_ENABLE_PUNCTUATION = os.getenv("STT_ENABLE_PUNCTUATION", "true").lower() == "true"
STT_ENABLE_TIMESTAMPS = os.getenv("STT_ENABLE_TIMESTAMPS", "true").lower() == "true"
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "multilang")
STT_SAMPLE_RATE = int(os.getenv("STT_SAMPLE_RATE", "16000"))
STT_MAX_DURATION = int(os.getenv("STT_MAX_DURATION", "300"))  # 5 минут максимум
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # 1 час

async def load_asr_model():
    """Загрузка модели ASR"""
    global asr_model, model_info
    
    if not NEMO_AVAILABLE:
        logger.warning("NeMo not available, using mock model")
        model_info = {
            "name": "parakeet-tdt-0.6b-v3-mock",
            "version": "mock",
            "device": STT_DEVICE,
            "sample_rate": STT_SAMPLE_RATE,
            "languages": ["ru", "en", "multilang"],
            "features": ["timestamps", "punctuation", "multilingual"]
        }
        return
    
    try:
        if os.path.exists(STT_MODEL_PATH):
            logger.info(f"Loading NeMo ASR model from {STT_MODEL_PATH}")
            asr_model = nemo_asr.models.ASRModel.restore_from(STT_MODEL_PATH)
            
            # Перемещение модели на нужное устройство
            if STT_DEVICE == "cuda" and torch.cuda.is_available():
                asr_model = asr_model.cuda()
                logger.info(f"Model moved to CUDA device")
            else:
                asr_model = asr_model.cpu()
                logger.info(f"Model running on CPU")
            
            # Установка режима оценки
            asr_model.eval()
            
            # Получение информации о модели
            model_info = {
                "name": "parakeet-tdt-0.6b-v3",
                "version": "0.6b-v3",
                "device": STT_DEVICE,
                "sample_rate": getattr(asr_model, 'sample_rate', STT_SAMPLE_RATE),
                "languages": ["ru", "en", "multilang"],
                "features": ["timestamps", "punctuation", "multilingual"],
                "vocab_size": getattr(asr_model, 'vocab_size', None),
                "num_params": sum(p.numel() for p in asr_model.parameters()) if asr_model else None
            }
            
            logger.info(f"ASR model loaded successfully: {model_info}")
            
        else:
            logger.error(f"Model file not found: {STT_MODEL_PATH}")
            raise FileNotFoundError(f"Model file not found: {STT_MODEL_PATH}")
            
    except Exception as e:
        logger.error(f"Failed to load ASR model: {e}")
        # Fallback to mock mode
        model_info = {
            "name": "parakeet-tdt-0.6b-v3-fallback",
            "version": "fallback",
            "device": STT_DEVICE,
            "sample_rate": STT_SAMPLE_RATE,
            "languages": ["ru", "en", "multilang"],
            "features": ["timestamps", "punctuation", "multilingual"],
            "error": str(e)
        }
        asr_model = None

def preprocess_audio(audio_data: np.ndarray, sample_rate: int) -> np.ndarray:
    """Предобработка аудио данных"""
    # Конвертация в моно если стерео
    if len(audio_data.shape) > 1:
        audio_data = np.mean(audio_data, axis=1)
    
    # Ресемплинг если необходимо
    if sample_rate != STT_SAMPLE_RATE:
        import librosa
        audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=STT_SAMPLE_RATE)
    
    # Нормализация
    if np.max(np.abs(audio_data)) > 0:
        audio_data = audio_data / np.max(np.abs(audio_data))
    
    return audio_data

def generate_cache_key(content: bytes, params: Dict[str, Any]) -> str:
    """Генерация ключа кэша"""
    content_hash = hashlib.md5(content).hexdigest()
    params_str = json.dumps(params, sort_keys=True)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()
    return f"stt:{content_hash}:{params_hash}"

async def transcribe_with_nemo(audio_path: str, language: str, enable_timestamps: bool) -> Dict[str, Any]:
    """Транскрибация с использованием NeMo модели"""
    if not asr_model:
        # Mock transcription
        audio_data, sr = sf.read(audio_path)
        duration = len(audio_data) / sr
        
        mock_texts = [
            "Пример транскрибации аудио файла с использованием NeMo Parakeet",
            "Example transcription of audio file using NeMo Parakeet",
            "Это тестовая транскрибация для демонстрации возможностей системы"
        ]
        
        text = mock_texts[hash(audio_path) % len(mock_texts)]
        
        result = {
            "text": text,
            "confidence": 0.95,
            "language": language,
            "duration": duration,
            "words": []
        }
        
        if enable_timestamps:
            words = text.split()
            word_duration = duration / len(words)
            result["words"] = [
                {
                    "word": word,
                    "start": i * word_duration,
                    "end": (i + 1) * word_duration,
                    "confidence": 0.9 + (hash(word) % 10) / 100
                }
                for i, word in enumerate(words)
            ]
        
        return result
    
    try:
        # Реальная транскрибация с NeMo
        transcriptions = asr_model.transcribe([audio_path])
        
        if hasattr(asr_model, 'transcribe_with_timestamps') and enable_timestamps:
            # Если модель поддерживает временные метки
            detailed_transcriptions = asr_model.transcribe_with_timestamps([audio_path])
            transcription = detailed_transcriptions[0]
        else:
            transcription = transcriptions[0]
        
        # Обработка результата
        if isinstance(transcription, str):
            result = {
                "text": transcription,
                "confidence": 0.95,  # NeMo не всегда возвращает confidence
                "language": language,
                "duration": 0.0,
                "words": []
            }
        else:
            # Если transcription содержит дополнительную информацию
            result = {
                "text": transcription.get("text", ""),
                "confidence": transcription.get("confidence", 0.95),
                "language": language,
                "duration": transcription.get("duration", 0.0),
                "words": transcription.get("words", [])
            }
        
        return result
        
    except Exception as e:
        logger.error(f"NeMo transcription error: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Инициализация сервиса при запуске"""
    global redis_client
    
    try:
        # Подключение к Redis
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await asyncio.get_event_loop().run_in_executor(None, redis_client.ping)
        logger.info("Connected to Redis")
        
        # Загрузка модели ASR
        await load_asr_model()
        
        logger.info("STT service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize STT service: {e}")
        raise

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": "stt-service",
        "model_path": STT_MODEL_PATH,
        "device": STT_DEVICE,
        "language": STT_LANGUAGE
    }

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Query("auto", description="Язык аудио (auto, ru, en)"),
    enable_timestamps: bool = Query(False, description="Включить временные метки"),
    enable_cache: bool = Query(True, description="Использовать кэширование")
):
    """Транскрибация аудио файла"""
    
    # Валидация файла
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")
    
    # Проверка формата файла
    allowed_formats = ['.wav', '.mp3', '.flac', '.ogg', '.m4a']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_formats:
        raise HTTPException(
            status_code=400, 
            detail=f"Неподдерживаемый формат файла. Поддерживаются: {', '.join(allowed_formats)}"
        )
    
    try:
        # Чтение содержимого файла
        content = await file.read()
        
        # Проверка размера файла (максимум 50MB)
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 50MB)")
        
        # Генерация ключа кэша
        cache_params = {
            "language": language,
            "enable_timestamps": enable_timestamps,
            "filename": file.filename
        }
        cache_key = generate_cache_key(content, cache_params)
        
        # Проверка кэша
        if enable_cache and redis_client:
            try:
                cached_result = redis_client.get(cache_key)
                if cached_result:
                    logger.info(f"Cache hit for {file.filename}")
                    return json.loads(cached_result)
            except Exception as e:
                logger.warning(f"Cache read error: {e}")
        
        # Создание временного файла
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Загрузка и предобработка аудио
            audio_data, sample_rate = sf.read(temp_path)
            
            # Проверка длительности
            duration = len(audio_data) / sample_rate
            if duration > STT_MAX_DURATION:
                raise HTTPException(
                    status_code=413, 
                    detail=f"Аудио слишком длинное (максимум {STT_MAX_DURATION} секунд)"
                )
            
            # Предобработка аудио
            processed_audio = preprocess_audio(audio_data, sample_rate)
            
            # Сохранение обработанного аудио
            sf.write(temp_path, processed_audio, STT_SAMPLE_RATE)
            
            # Транскрибация
            import time
            start_time = time.time()
            result = await transcribe_with_nemo(temp_path, language, enable_timestamps)
            processing_time = time.time() - start_time
            
            # Добавление метаданных
            result.update({
                "filename": file.filename,
                "file_size": len(content),
                "processing_time": round(processing_time, 3),
                "sample_rate": STT_SAMPLE_RATE,
                "model_info": model_info,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Сохранение в кэш
            if enable_cache and redis_client:
                try:
                    redis_client.setex(
                        cache_key, 
                        CACHE_TTL, 
                        json.dumps(result, ensure_ascii=False)
                    )
                    logger.info(f"Result cached for {file.filename}")
                except Exception as e:
                    logger.warning(f"Cache write error: {e}")
            
            logger.info(f"Transcription completed for {file.filename} in {processing_time:.3f}s")
            return result
            
        finally:
            # Удаление временного файла
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка транскрибации: {str(e)}")

@app.get("/models")
async def get_models():
    """Получение информации о доступных моделях"""
    return {
        "current_model": model_info,
        "available_models": [
            {
                "name": "parakeet-tdt-0.6b-v3",
                "description": "NVIDIA NeMo Parakeet TDT 0.6B v3 - многоязычная модель ASR",
                "languages": ["ru", "en", "multilang"],
                "features": ["timestamps", "punctuation", "multilingual"],
                "size": "0.6B parameters",
                "accuracy": "High",
                "speed": "Fast"
            }
        ],
        "device": STT_DEVICE,
        "sample_rate": STT_SAMPLE_RATE,
        "max_duration": STT_MAX_DURATION
    }

@app.get("/languages")
async def get_languages():
    """Получение списка поддерживаемых языков"""
    return {
        "languages": [
            {"code": "auto", "name": "Автоопределение", "native": "Auto-detect"},
            {"code": "ru", "name": "Русский", "native": "Русский"},
            {"code": "en", "name": "Английский", "native": "English"},
            {"code": "multilang", "name": "Многоязычный", "native": "Multilingual"}
        ],
        "default": "auto",
        "model_languages": model_info.get("languages", []) if model_info else []
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)