import onnx_asr
import os
import asyncio
from typing import Optional
import logging
import soundfile as sf
import numpy as np

logger = logging.getLogger(__name__)

class STTService:
    """Сервис для распознавания речи с использованием Nemo Parakeet V3"""
    
    def __init__(self):
        self.model = None
        self.model_name = "nemo-parakeet-tdt-0.6b-v3"
        self._initialize_model()
    
    def _initialize_model(self):
        """Инициализация модели STT"""
        try:
            # Загрузка модели Parakeet TDT V3 в формате ONNX
            logger.info(f"Загрузка STT модели {self.model_name}...")
            self.model = onnx_asr.load_model(self.model_name)
            logger.info(f"STT модель {self.model_name} успешно загружена")
        except Exception as e:
            logger.error(f"Ошибка загрузки STT модели: {str(e)}")
            logger.info("Для первого запуска модель будет загружена автоматически")
            self.model = None
    
    async def transcribe_audio(self, audio_path: str) -> str:
        """
        Транскрибация аудио файла в текст
        
        Args:
            audio_path: Путь к аудио файлу
            
        Returns:
            Транскрибированный текст
        """
        try:
            # Попытка инициализации модели если она не загружена
            if not self.model:
                self._initialize_model()
                
            if not self.model:
                raise Exception("STT модель не может быть инициализирована")
            
            if not os.path.exists(audio_path):
                raise Exception(f"Аудио файл не найден: {audio_path}")
            
            # Проверка и конвертация аудио файла если необходимо
            processed_audio_path = await self._preprocess_audio(audio_path)
            
            # Асинхронная транскрибация
            loop = asyncio.get_event_loop()
            transcription = await loop.run_in_executor(
                None, 
                self._transcribe_sync, 
                processed_audio_path
            )
            
            # Удаление временного файла если он был создан
            if processed_audio_path != audio_path and os.path.exists(processed_audio_path):
                os.remove(processed_audio_path)
            
            logger.info(f"Транскрибация завершена для файла: {audio_path}")
            return transcription
            
        except Exception as e:
            logger.error(f"Ошибка транскрибации: {str(e)}")
            return f"Ошибка распознавания речи: {str(e)}"
    
    async def _preprocess_audio(self, audio_path: str) -> str:
        """
        Предобработка аудио файла для модели
        
        Args:
            audio_path: Путь к исходному аудио файлу
            
        Returns:
            Путь к обработанному аудио файлу
        """
        try:
            # Чтение аудио файла
            audio_data, sample_rate = sf.read(audio_path)
            
            # Конвертация в моно если стерео
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            
            # Ресемплинг до 16kHz если необходимо
            target_sample_rate = 16000
            if sample_rate != target_sample_rate:
                import librosa
                audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=target_sample_rate)
                sample_rate = target_sample_rate
            
            # Нормализация амплитуды
            if np.max(np.abs(audio_data)) > 0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Сохранение обработанного файла
            processed_path = audio_path.replace('.', '_processed.')
            sf.write(processed_path, audio_data, sample_rate)
            
            return processed_path
            
        except Exception as e:
            logger.warning(f"Ошибка предобработки аудио: {str(e)}, используется исходный файл")
            return audio_path
    
    def _transcribe_sync(self, audio_path: str) -> str:
        """Синхронная транскрибация"""
        try:
            result = self.model.recognize(audio_path)
            return result if result else "Не удалось распознать речь"
        except Exception as e:
            logger.error(f"Ошибка в синхронной транскрибации: {str(e)}")
            return "Ошибка распознавания речи"
    
    async def transcribe_audio_stream(self, audio_data: bytes) -> str:
        """
        Транскрибация аудио потока
        
        Args:
            audio_data: Байты аудио данных
            
        Returns:
            Транскрибированный текст
        """
        try:
            # Сохранение временного файла
            temp_path = "temp_audio.wav"
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            # Транскрибация
            result = await self.transcribe_audio(temp_path)
            
            # Удаление временного файла
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка транскрибации потока: {str(e)}")
            return f"Ошибка обработки аудио потока: {str(e)}"
    
    def is_model_ready(self) -> bool:
        """Проверка готовности модели"""
        return self.model is not None
    
    def get_model_info(self) -> dict:
        """Получение информации о модели"""
        return {
            "model_name": self.model_name,
            "is_ready": self.is_model_ready(),
            "description": "NVIDIA Parakeet TDT 0.6B V3 (Multilingual) ONNX model"
        }