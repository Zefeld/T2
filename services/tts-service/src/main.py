"""
TTS Service - Text-to-Speech using Piper TTS
"""
import os
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import redis
import tempfile
import io
import wave

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TTS Service",
    description="Text-to-Speech service using Piper TTS",
    version="1.0.0"
)

# Модели данных
class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    speed: Optional[float] = 1.0
    pitch: Optional[float] = 1.0
    volume: Optional[float] = 1.0

class VoiceInfo(BaseModel):
    id: str
    name: str
    language: str
    gender: str
    sample_rate: int

# Глобальные переменные
tts_engine = None
redis_client = None
available_voices = {}

# Конфигурация из переменных окружения
TTS_MODEL_PATH = os.getenv("TTS_MODEL_PATH", "/app/models/piper/voices")
TTS_DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE", "en_US-amy-medium")
TTS_SAMPLE_RATE = int(os.getenv("TTS_SAMPLE_RATE", "22050"))
TTS_ENABLE_STREAMING = os.getenv("TTS_ENABLE_STREAMING", "true").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

@app.on_event("startup")
async def startup_event():
    """Инициализация сервиса при запуске"""
    global tts_engine, redis_client, available_voices
    
    try:
        # Подключение к Redis
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info("Connected to Redis")
        
        # Инициализация Piper TTS (заглушка - требует установки Piper)
        logger.info(f"Loading TTS models from {TTS_MODEL_PATH}")
        
        # Заглушка для доступных голосов
        available_voices = {
            "en_US-amy-medium": {
                "name": "Amy (US English)",
                "language": "en-US",
                "gender": "female",
                "sample_rate": 22050
            },
            "en_GB-alan-medium": {
                "name": "Alan (British English)",
                "language": "en-GB", 
                "gender": "male",
                "sample_rate": 22050
            },
            "ru_RU-dmitri-medium": {
                "name": "Dmitri (Russian)",
                "language": "ru-RU",
                "gender": "male",
                "sample_rate": 22050
            }
        }
        
        logger.info("TTS service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize TTS service: {e}")
        raise

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": "tts-service",
        "model_path": TTS_MODEL_PATH,
        "default_voice": TTS_DEFAULT_VOICE,
        "sample_rate": TTS_SAMPLE_RATE,
        "streaming_enabled": TTS_ENABLE_STREAMING
    }

@app.post("/synthesize")
async def synthesize_speech(request: TTSRequest):
    """
    Синтез речи из текста
    
    Args:
        request: Запрос с текстом и параметрами синтеза
    
    Returns:
        Аудио файл в формате WAV
    """
    try:
        # Проверка текста
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Выбор голоса
        voice = request.voice or TTS_DEFAULT_VOICE
        if voice not in available_voices:
            raise HTTPException(status_code=400, detail=f"Voice '{voice}' not available")
        
        # Проверка кэша
        cache_key = f"tts:{hash(request.text + voice)}"
        cached_audio = redis_client.get(cache_key)
        
        if cached_audio:
            logger.info("Returning cached audio")
            audio_data = eval(cached_audio)  # В реальности использовать pickle или json
        else:
            # Синтез речи (заглушка - требует реальной модели Piper)
            logger.info(f"Synthesizing text: '{request.text[:50]}...' with voice: {voice}")
            
            # Заглушка - генерация синусоиды как пример аудио
            import numpy as np
            duration = len(request.text) * 0.1  # Примерная длительность
            sample_rate = available_voices[voice]["sample_rate"]
            t = np.linspace(0, duration, int(sample_rate * duration))
            frequency = 440  # Нота A4
            audio_data = (np.sin(2 * np.pi * frequency * t) * 0.3 * 32767).astype(np.int16)
            
            # Кэширование результата
            redis_client.setex(cache_key, 3600, str(audio_data.tolist()))
        
        # Создание WAV файла в памяти
        audio_buffer = io.BytesIO()
        with wave.open(audio_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Моно
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(available_voices[voice]["sample_rate"])
            wav_file.writeframes(audio_data.tobytes())
        
        audio_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(audio_buffer.read()),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=synthesized_speech.wav",
                "X-Voice-Used": voice,
                "X-Text-Length": str(len(request.text)),
                "X-Audio-Duration": str(len(audio_data) / available_voices[voice]["sample_rate"])
            }
        )
        
    except Exception as e:
        logger.error(f"Speech synthesis error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

@app.get("/voices", response_model=List[VoiceInfo])
async def get_available_voices():
    """Получение списка доступных голосов"""
    voices = []
    for voice_id, info in available_voices.items():
        voices.append(VoiceInfo(
            id=voice_id,
            name=info["name"],
            language=info["language"],
            gender=info["gender"],
            sample_rate=info["sample_rate"]
        ))
    return voices

@app.post("/synthesize/stream")
async def synthesize_speech_stream(request: TTSRequest):
    """
    Потоковый синтез речи (для длинных текстов)
    """
    if not TTS_ENABLE_STREAMING:
        raise HTTPException(status_code=501, detail="Streaming is disabled")
    
    try:
        voice = request.voice or TTS_DEFAULT_VOICE
        if voice not in available_voices:
            raise HTTPException(status_code=400, detail=f"Voice '{voice}' not available")
        
        def generate_audio_stream():
            # Разбиение текста на предложения для потоковой обработки
            sentences = request.text.split('. ')
            
            for sentence in sentences:
                if sentence.strip():
                    # Заглушка для потокового синтеза
                    import numpy as np
                    duration = len(sentence) * 0.1
                    sample_rate = available_voices[voice]["sample_rate"]
                    t = np.linspace(0, duration, int(sample_rate * duration))
                    frequency = 440 + len(sentence) % 200  # Варьируем частоту
                    audio_chunk = (np.sin(2 * np.pi * frequency * t) * 0.3 * 32767).astype(np.int16)
                    
                    yield audio_chunk.tobytes()
        
        return StreamingResponse(
            generate_audio_stream(),
            media_type="audio/wav",
            headers={
                "X-Voice-Used": voice,
                "X-Streaming": "true"
            }
        )
        
    except Exception as e:
        logger.error(f"Streaming synthesis error: {e}")
        raise HTTPException(status_code=500, detail=f"Streaming synthesis failed: {str(e)}")

@app.get("/languages")
async def get_supported_languages():
    """Получение списка поддерживаемых языков"""
    languages = set()
    for voice_info in available_voices.values():
        languages.add(voice_info["language"])
    
    return {
        "languages": [
            {"code": lang, "name": lang} for lang in sorted(languages)
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)