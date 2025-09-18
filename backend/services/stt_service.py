import asyncio
import logging
import tempfile
import os
from typing import Optional
import wave
import numpy as np
import onnxruntime as ort
import librosa
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

class STTService:
    """Сервис распознавания речи с использованием Nemo Parakeet V3"""
    
    def __init__(self):
        self.model_path = None
        self.session = None
        self.sample_rate = 16000
        self.model_url = "https://huggingface.co/s0me-0ne/parakeet-tdt-0.6b-v3-onnx/resolve/main/model.onnx"
        self.vocab_url = "https://huggingface.co/s0me-0ne/parakeet-tdt-0.6b-v3-onnx/resolve/main/vocab.txt"
        self.vocab = None
        
    async def initialize(self):
        """Инициализация модели STT"""
        try:
            # Создание директории для моделей
            models_dir = Path("models/stt")
            models_dir.mkdir(parents=True, exist_ok=True)
            
            model_file = models_dir / "parakeet_v3.onnx"
            vocab_file = models_dir / "vocab.txt"
            
            # Загрузка модели если не существует
            if not model_file.exists():
                logger.info("Загрузка модели Parakeet V3...")
                await self._download_file(self.model_url, model_file)
                
            if not vocab_file.exists():
                logger.info("Загрузка словаря...")
                await self._download_file(self.vocab_url, vocab_file)
            
            # Загрузка словаря
            with open(vocab_file, 'r', encoding='utf-8') as f:
                self.vocab = [line.strip() for line in f.readlines()]
            
            # Инициализация ONNX сессии
            self.session = ort.InferenceSession(str(model_file))
            self.model_path = str(model_file)
            
            logger.info("STT сервис инициализирован успешно")
            
        except Exception as e:
            logger.error(f"Ошибка инициализации STT: {e}")
            # Fallback к простому распознаванию
            self.session = None
    
    async def _download_file(self, url: str, filepath: Path):
        """Загрузка файла с URL"""
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    
    async def transcribe_audio(self, audio_path: str) -> str:
        """
        Транскрибация аудио файла в текст
        
        Args:
            audio_path: Путь к аудио файлу
            
        Returns:
            Транскрибированный текст
        """
        try:
            if not self.session:
                return await self._fallback_transcribe(audio_path)
            
            # Предобработка аудио
            audio_data = await self._preprocess_audio(audio_path)
            
            # Инференс модели
            input_name = self.session.get_inputs()[0].name
            outputs = self.session.run(None, {input_name: audio_data})
            
            # Декодирование результата
            text = self._decode_output(outputs[0])
            
            logger.info(f"Транскрибация завершена: {text[:100]}...")
            return text
            
        except Exception as e:
            logger.error(f"Ошибка транскрибации: {e}")
            return await self._fallback_transcribe(audio_path)
    
    async def _preprocess_audio(self, audio_path: str) -> np.ndarray:
        """Предобработка аудио для модели"""
        try:
            # Загрузка аудио с помощью librosa
            audio, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            # Нормализация
            audio = audio / np.max(np.abs(audio))
            
            # Добавление batch dimension
            audio = np.expand_dims(audio, axis=0)
            
            return audio.astype(np.float32)
            
        except Exception as e:
            logger.error(f"Ошибка предобработки аудио: {e}")
            raise
    
    def _decode_output(self, output: np.ndarray) -> str:
        """Декодирование выхода модели в текст"""
        try:
            if self.vocab is None:
                return "Словарь не загружен"
            
            # Простое декодирование (может потребоваться более сложная логика)
            tokens = np.argmax(output, axis=-1)
            text_tokens = []
            
            for token_id in tokens[0]:  # Берем первый элемент batch
                if token_id < len(self.vocab):
                    token = self.vocab[token_id]
                    if token not in ['<pad>', '<unk>', '<s>', '</s>']:
                        text_tokens.append(token)
            
            return ' '.join(text_tokens)
        except Exception as e:
            logger.error(f"Ошибка декодирования: {e}")
            return "Ошибка декодирования"