import os
import asyncio
from typing import Optional, Dict, Any
import logging
import wave
import io
import subprocess
import tempfile
import json
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

class TTSService:
    """Сервис синтеза речи с использованием Piper TTS"""
    
    def __init__(self):
        self.piper_path = None
        self.model_path = None
        self.voice_name = "ru_RU-ruslan-medium"
        self.sample_rate = 22050
        self.models_dir = Path("models/tts")
        
    async def initialize(self):
        """Инициализация TTS сервиса"""
        try:
            # Создание директории для моделей
            self.models_dir.mkdir(parents=True, exist_ok=True)
            
            # Проверка установки Piper
            await self._ensure_piper_installed()
            
            # Загрузка модели голоса
            await self._download_voice_model()
            
            logger.info("TTS сервис инициализирован успешно")
            
        except Exception as e:
            logger.error(f"Ошибка инициализации TTS: {e}")
            self.piper_path = None
    
    async def _ensure_piper_installed(self):
        """Проверка и установка Piper TTS"""
        try:
            # Проверка установки через pip
            result = subprocess.run(
                ["python", "-m", "pip", "show", "piper-tts"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.info("Установка Piper TTS...")
                install_result = subprocess.run(
                    ["python", "-m", "pip", "install", "piper-tts"],
                    capture_output=True,
                    text=True
                )
                
                if install_result.returncode != 0:
                    raise Exception(f"Ошибка установки Piper TTS: {install_result.stderr}")
            
            # Поиск исполняемого файла piper
            try:
                piper_result = subprocess.run(
                    ["piper", "--version"],
                    capture_output=True,
                    text=True
                )
                if piper_result.returncode == 0:
                    self.piper_path = "piper"
                else:
                    # Попытка найти через python -m
                    self.piper_path = ["python", "-m", "piper"]
            except FileNotFoundError:
                self.piper_path = ["python", "-m", "piper"]
                
        except Exception as e:
            logger.error(f"Ошибка проверки Piper: {e}")
            raise
    
    def _download_default_model(self):
        """Загрузка модели по умолчанию если она отсутствует"""
        try:
            if not os.path.exists(self.model_path):
                logger.info(f"Загрузка модели TTS: {self.default_voice}")
                # Команда для загрузки модели через piper
                result = subprocess.run([
                    'piper', '--model', self.default_voice, 
                    '--download-dir', 'models/piper',
                    '--data-dir', 'models/piper'
                ], capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    logger.info("Модель TTS успешно загружена")
                else:
                    logger.warning(f"Не удалось загрузить модель: {result.stderr}")
        except Exception as e:
            logger.warning(f"Ошибка загрузки модели TTS: {str(e)}")
    
    async def _download_voice_model(self):
        """Загрузка модели голоса"""
        try:
            model_file = self.models_dir / f"{self.voice_name}.onnx"
            config_file = self.models_dir / f"{self.voice_name}.onnx.json"
            
            if not model_file.exists() or not config_file.exists():
                logger.info(f"Загрузка модели голоса {self.voice_name}...")
                
                # URL для загрузки модели (может потребоваться обновление)
                base_url = f"https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ru/ru_RU/ruslan/medium/"
                
                model_url = base_url + f"{self.voice_name}.onnx"
                config_url = base_url + f"{self.voice_name}.onnx.json"
                
                # Загрузка файлов
                await self._download_file(model_url, model_file)
                await self._download_file(config_url, config_file)
            
            self.model_path = str(model_file)
            
        except Exception as e:
            logger.warning(f"Ошибка загрузки модели: {e}")
            # Fallback к базовой модели
            self.model_path = None
    
    async def _download_file(self, url: str, filepath: Path):
        """Загрузка файла с URL"""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
        except Exception as e:
            logger.error(f"Ошибка загрузки {url}: {e}")
            raise
    
    async def generate_speech(self, text: str, output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Генерирует речь из текста с улучшенной обработкой ошибок
        
        Args:
            text: Текст для синтеза
            output_path: Путь для сохранения (опционально)
            
        Returns:
            Словарь с результатом синтеза
        """
        try:
            if not text.strip():
                return {
                    'success': False,
                    'error': 'Пустой текст для синтеза'
                }
            
            # Проверка длины текста
            if len(text) > 5000:
                return {
                    'success': False,
                    'error': 'Текст слишком длинный (максимум 5000 символов)'
                }
            
            # Попытка использовать Piper
            if self.piper_path and self.model_path:
                try:
                    result = await self._synthesize_with_piper_enhanced(text, output_path)
                    if result['success']:
                        return result
                except Exception as piper_error:
                    logger.warning(f"Piper недоступен: {piper_error}")
            
            # Fallback к созданию тишины
            return await self._synthesize_fallback(text, output_path)
            
        except Exception as e:
            logger.error(f"Ошибка генерации речи: {e}")
            return {
                'success': False,
                'error': f'Ошибка генерации речи: {str(e)}'
            }
    
    async def _synthesize_with_piper_enhanced(self, text: str, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Улучшенный синтез с Piper"""
        try:
            # Создаем временный файл если путь не указан
            if output_path is None:
                temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                output_path = temp_file.name
                temp_file.close()
                cleanup_temp = True
            else:
                cleanup_temp = False
            
            try:
                # Команда для Piper
                cmd = [
                    "python", "-m", "piper",
                    "--model", str(self.model_path),
                    "--output_file", output_path
                ]
                
                # Запуск процесса
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Отправляем текст
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(input=text.encode('utf-8')),
                    timeout=30.0
                )
                
                if process.returncode == 0 and os.path.exists(output_path):
                    # Читаем аудио данные
                    with open(output_path, 'rb') as f:
                        audio_data = f.read()
                    
                    # Получаем длительность
                    duration = self._get_audio_duration(output_path)
                    
                    result = {
                        'success': True,
                        'audio_data': audio_data,
                        'file_path': output_path if not cleanup_temp else None,
                        'format': 'wav',
                        'sample_rate': self.sample_rate,
                        'duration': duration,
                        'model': 'piper-tts'
                    }
                    
                    if cleanup_temp:
                        os.unlink(output_path)
                    
                    return result
                else:
                    error_msg = stderr.decode() if stderr else "Неизвестная ошибка Piper"
                    raise Exception(f"Piper завершился с ошибкой: {error_msg}")
                    
            except asyncio.TimeoutError:
                raise Exception("Timeout при синтезе речи")
            except Exception as e:
                if cleanup_temp and os.path.exists(output_path):
                    os.unlink(output_path)
                raise e
                
        except Exception as e:
            raise Exception(f"Ошибка Piper синтеза: {e}")
    
    async def _synthesize_fallback(self, text: str, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Fallback синтез (создание тишины)"""
        try:
            # Вычисляем длительность на основе текста
            duration = min(len(text) * 0.08, 10.0)  # ~0.08 сек на символ, максимум 10 сек
            
            if output_path:
                await self._create_silence_audio(output_path, duration)
                
                with open(output_path, 'rb') as f:
                    audio_data = f.read()
            else:
                audio_data = await self._create_silence_bytes(duration)
            
            return {
                'success': True,
                'audio_data': audio_data,
                'file_path': output_path,
                'format': 'wav',
                'sample_rate': self.sample_rate,
                'duration': duration,
                'model': 'fallback',
                'warning': 'TTS недоступен, создан файл тишины'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Ошибка fallback синтеза: {str(e)}'
            }
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """Получает длительность аудио файла"""
        try:
            with wave.open(audio_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                sample_rate = wav_file.getframerate()
                return frames / sample_rate
        except Exception:
            # Примерная оценка
            file_size = os.path.getsize(audio_path)
            return max(file_size / (self.sample_rate * 2), 0.1)
    
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
    
    async def _create_silence_bytes(self, duration: float) -> bytes:
        """Создает байты тишины заданной длительности"""
        try:
            import io
            import struct
            
            # Параметры WAV файла
            sample_rate = self.sample_rate
            num_samples = int(duration * sample_rate)
            
            # Создаем WAV в памяти
            buffer = io.BytesIO()
            
            # WAV заголовок
            buffer.write(b'RIFF')
            buffer.write(struct.pack('<I', 36 + num_samples * 2))  # Размер файла
            buffer.write(b'WAVE')
            buffer.write(b'fmt ')
            buffer.write(struct.pack('<I', 16))  # Размер fmt chunk
            buffer.write(struct.pack('<H', 1))   # PCM формат
            buffer.write(struct.pack('<H', 1))   # Моно
            buffer.write(struct.pack('<I', sample_rate))
            buffer.write(struct.pack('<I', sample_rate * 2))  # Byte rate
            buffer.write(struct.pack('<H', 2))   # Block align
            buffer.write(struct.pack('<H', 16))  # Bits per sample
            buffer.write(b'data')
            buffer.write(struct.pack('<I', num_samples * 2))  # Размер данных
            
            # Данные тишины (нули)
            silence_data = b'\x00\x00' * num_samples
            buffer.write(silence_data)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Ошибка создания тишины в памяти: {e}")
            # Минимальный WAV файл
            return b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
    async def _create_silence_audio(self, output_path: str, duration: float = 1.0):
        """Создание файла с тишиной"""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            sample_rate = self.sample_rate
            frames = int(sample_rate * duration)
            
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)  # моно
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(b'\x00' * (frames * 2))
                
        except Exception as e:
            logger.error(f"Ошибка создания файла тишины: {str(e)}")
    
    def is_model_ready(self) -> bool:
        """Проверка готовности TTS сервиса"""
        return self.piper_path is not None

    def get_model_info(self) -> dict:
        """Информация о TTS сервисе"""
        return {
            "service_name": "Piper TTS",
            "voice_name": self.voice_name,
            "sample_rate": self.sample_rate,
            "model_path": self.model_path,
            "ready": self.is_model_ready()
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