import os
import asyncio
from typing import Optional
import logging
import wave
import io
import subprocess
import tempfile

logger = logging.getLogger(__name__)

class TTSService:
    """Сервис для синтеза речи с использованием Piper TTS"""
    
    def __init__(self):
        self.piper_executable = None
        self.model_path = "models/piper/ru_RU-ruslan-medium.onnx"
        self.config_path = "models/piper/ru_RU-ruslan-medium.onnx.json"
        self._initialize_piper()
    
    def _initialize_piper(self):
        """Инициализация Piper TTS"""
        try:
            # Создание директории для моделей если не существует
            os.makedirs("models/piper", exist_ok=True)
            
            # Проверка установки piper-tts
            result = subprocess.run(['piper', '--help'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.piper_executable = 'piper'
                logger.info("Piper TTS найден в системе")
            else:
                logger.warning("Piper TTS не найден в PATH")
                
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.warning(f"Piper TTS недоступен: {str(e)}")
            logger.info("Установите piper-tts: pip install piper-tts")
            self.piper_executable = None
        except Exception as e:
            logger.error(f"Ошибка инициализации TTS: {str(e)}")
            self.piper_executable = None
    
    async def generate_speech(self, text: str, output_path: str) -> str:
        """
        Генерация речи из текста
        
        Args:
            text: Текст для синтеза
            output_path: Путь для сохранения аудио файла
            
        Returns:
            Путь к созданному аудио файлу
        """
        try:
            # Создание директории если не существует
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            if not self.piper_executable:
                # Fallback: создание пустого аудио файла
                await self._create_silence_audio(output_path, duration=len(text) * 0.1)
                logger.warning("TTS недоступен, создан файл с тишиной")
                return output_path
            
            # Асинхронная генерация речи через subprocess
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._synthesize_with_piper,
                text,
                output_path
            )
            
            logger.info(f"Речь синтезирована и сохранена: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Ошибка синтеза речи: {str(e)}")
            # Создание файла с тишиной в случае ошибки
            await self._create_silence_audio(output_path, duration=len(text) * 0.1)
            return output_path
    
    def _synthesize_with_piper(self, text: str, output_path: str):
        """Синтез речи через Piper CLI"""
        try:
            # Использование модели по умолчанию если файл модели не найден
            if os.path.exists(self.model_path):
                cmd = [
                    self.piper_executable,
                    '--model', self.model_path,
                    '--output_file', output_path
                ]
            else:
                # Использование встроенной модели
                cmd = [
                    self.piper_executable,
                    '--model', 'en_US-lessac-medium',  # Fallback модель
                    '--output_file', output_path
                ]
            
            # Запуск Piper с текстом через stdin
            process = subprocess.run(
                cmd,
                input=text,
                text=True,
                capture_output=True,
                timeout=30
            )
            
            if process.returncode != 0:
                raise Exception(f"Piper завершился с ошибкой: {process.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.error("Timeout при синтезе речи")
            raise Exception("Превышено время ожидания синтеза речи")
        except Exception as e:
            logger.error(f"Ошибка в синтезе через Piper: {str(e)}")
            raise e
    
    async def generate_speech_stream(self, text: str) -> bytes:
        """
        Генерация речи в виде потока байтов
        
        Args:
            text: Текст для синтеза
            
        Returns:
            Байты аудио данных
        """
        try:
            # Создание временного файла
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Генерация речи
            await self.generate_speech(text, temp_path)
            
            # Чтение файла в байты
            with open(temp_path, 'rb') as f:
                audio_bytes = f.read()
            
            # Удаление временного файла
            os.unlink(temp_path)
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Ошибка генерации потока: {str(e)}")
            return await self._create_silence_bytes(duration=len(text) * 0.1)
            
        Returns:
            Аудио данные в виде байтов
        """
        try:
            if not self.voice_model:
                return await self._create_silence_bytes(duration=1.0)
            
            # Создание временного файла
            temp_path = "temp_tts_output.wav"
            await self.generate_speech(text, temp_path)
            
            # Чтение файла в байты
            with open(temp_path, "rb") as f:
                audio_bytes = f.read()
            
            # Удаление временного файла
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Ошибка генерации аудио потока: {str(e)}")
            return await self._create_silence_bytes(duration=1.0)
    
    async def _create_silence_audio(self, output_path: str, duration: float = 1.0):
        """Создание файла с тишиной"""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            sample_rate = 22050
            frames = int(sample_rate * duration)
            
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)  # моно
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(b'\x00' * (frames * 2))
                
        except Exception as e:
            logger.error(f"Ошибка создания файла тишины: {str(e)}")
    
    async def _create_silence_bytes(self, duration: float = 1.0) -> bytes:
        """Создание байтов тишины"""
        try:
            sample_rate = 22050
            frames = int(sample_rate * duration)
            
            # Создание WAV заголовка и данных
            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(b'\x00' * (frames * 2))
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Ошибка создания байтов тишины: {str(e)}")
            return b''
    
    def is_model_ready(self) -> bool:
        """Проверка готовности модели"""
        return self.voice_model is not None
    
    def get_model_info(self) -> dict:
        """Получение информации о модели"""
        return {
            "model_path": self.model_path,
            "is_ready": self.is_model_ready(),
            "description": "Piper TTS - Neural Text-to-Speech",
            "voice": "ru_RU-ruslan-medium"
        }
    
    def download_model_instructions(self) -> dict:
        """Инструкции по загрузке модели"""
        return {
            "message": "Для работы TTS необходимо скачать модель Piper",
            "steps": [
                "1. Перейдите на https://github.com/rhasspy/piper/releases",
                "2. Скачайте модель ru_RU-ruslan-medium.onnx",
                "3. Поместите файлы в папку models/piper/",
                "4. Перезапустите сервис"
            ],
            "required_files": [
                "ru_RU-ruslan-medium.onnx",
                "ru_RU-ruslan-medium.onnx.json"
            ]
        }