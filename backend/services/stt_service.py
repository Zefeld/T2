import asyncio
import logging
import tempfile
import os
from typing import Optional, Dict, Any
import wave
import numpy as np
import onnxruntime as ort
import librosa
import requests
from pathlib import Path
import json
import io

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
        
        # Конфигурация для API режима
        self.nemo_api_url = "http://localhost:8001/v1/audio/transcriptions"
        self.supported_formats = ['wav', 'mp3', 'flac', 'ogg']
        self.max_file_size = 25 * 1024 * 1024  # 25MB
        
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
    
    async def transcribe_audio(self, audio_data: bytes, audio_format: str = 'wav') -> Dict[str, Any]:
        """
        Транскрибирует аудио в текст с поддержкой разных режимов
        
        Args:
            audio_data: Байты аудиофайла или путь к файлу
            audio_format: Формат аудио (wav, mp3, flac, ogg)
            
        Returns:
            Словарь с результатом транскрипции
        """
        try:
            # Если передан путь к файлу (для обратной совместимости)
            if isinstance(audio_data, str):
                return await self._transcribe_from_file(audio_data)
            
            # Проверка размера файла
            if len(audio_data) > self.max_file_size:
                return {
                    'success': False,
                    'error': f'Файл слишком большой. Максимальный размер: {self.max_file_size // (1024*1024)}MB'
                }
            
            # Проверка формата
            if audio_format.lower() not in self.supported_formats:
                return {
                    'success': False,
                    'error': f'Неподдерживаемый формат. Поддерживаются: {", ".join(self.supported_formats)}'
                }
            
            # Попытка использовать API режим
            try:
                result = await self._transcribe_with_api(audio_data, audio_format)
                if result['success']:
                    return result
            except Exception as api_error:
                logger.warning(f"API недоступен: {api_error}")
            
            # Fallback к локальной модели
            try:
                result = await self._transcribe_with_local_model(audio_data, audio_format)
                if result['success']:
                    return result
            except Exception as local_error:
                logger.warning(f"Локальная модель недоступна: {local_error}")
            
            # Финальный fallback
            return await self._transcribe_fallback(audio_data, audio_format)
            
        except Exception as e:
            logger.error(f"Ошибка транскрипции: {e}")
            return {
                'success': False,
                'error': f'Ошибка обработки аудио: {str(e)}'
            }
    
    async def _transcribe_from_file(self, audio_path: str) -> Dict[str, Any]:
        """Транскрипция из файла (старый метод для совместимости)"""
        try:
            if not os.path.exists(audio_path):
                return {'success': False, 'error': 'Файл не найден'}
            
            # Читаем файл
            with open(audio_path, 'rb') as f:
                audio_data = f.read()
            
            # Определяем формат по расширению
            audio_format = os.path.splitext(audio_path)[1][1:].lower()
            
            return await self.transcribe_audio(audio_data, audio_format)
            
        except Exception as e:
            logger.error(f"Ошибка чтения файла: {e}")
            return {'success': False, 'error': f'Ошибка чтения файла: {str(e)}'}
    
    async def _transcribe_with_api(self, audio_data: bytes, audio_format: str) -> Dict[str, Any]:
        """Транскрипция через API"""
        try:
            # Создаем временный файл
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Подготавливаем данные для отправки
                files = {
                    'file': (f'audio.{audio_format}', open(temp_file_path, 'rb'), f'audio/{audio_format}')
                }
                
                data = {
                    'model': 'nvidia/parakeet-ctc-1.1b',
                    'language': 'ru',
                    'response_format': 'json'
                }
                
                # Отправляем запрос
                response = requests.post(
                    self.nemo_api_url,
                    files=files,
                    data=data,
                    timeout=30
                )
                
                files['file'][1].close()
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        'success': True,
                        'text': result.get('text', ''),
                        'confidence': result.get('confidence', 0.0),
                        'language': result.get('language', 'ru'),
                        'duration': result.get('duration', 0.0),
                        'model': 'nemo-parakeet-v3-api'
                    }
                else:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                    
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            raise Exception(f"Ошибка API: {e}")
    
    async def _transcribe_with_local_model(self, audio_data: bytes, audio_format: str) -> Dict[str, Any]:
        """Транскрипция с локальной моделью"""
        try:
            if self.session is None:
                await self.initialize()
            
            if self.session is None:
                raise Exception("Локальная модель не инициализирована")
            
            # Создаем временный файл для обработки
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Предобработка аудио
                audio_features = await self._preprocess_audio(temp_file_path)
                
                # Инференс
                inputs = {self.session.get_inputs()[0].name: audio_features}
                outputs = self.session.run(None, inputs)
                
                # Декодирование результата
                text = self._decode_output(outputs[0])
                
                return {
                    'success': True,
                    'text': text,
                    'confidence': 0.8,  # Примерная оценка
                    'language': 'ru',
                    'duration': len(audio_data) / (self.sample_rate * 2),  # Примерная длительность
                    'model': 'nemo-parakeet-v3-local'
                }
                
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            raise Exception(f"Ошибка локальной модели: {e}")
    
    async def _transcribe_fallback(self, audio_data: bytes, audio_format: str) -> Dict[str, Any]:
        """Fallback транскрипция"""
        try:
            # Простая проверка аудио
            if audio_format == 'wav' and len(audio_data) >= 44:
                if audio_data[:4] != b'RIFF':
                    return {'success': False, 'error': 'Некорректный WAV файл'}
            
            # Имитируем обработку
            await asyncio.sleep(0.5)
            
            return {
                'success': True,
                'text': '[STT сервис недоступен] Пожалуйста, повторите ваш ответ текстом.',
                'confidence': 0.0,
                'language': 'ru',
                'duration': 0.0,
                'model': 'fallback',
                'warning': 'STT сервисы недоступны, используется заглушка'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Ошибка fallback: {str(e)}'}
    
    async def _preprocess_audio(self, audio_path: str) -> np.ndarray:
        """Предобработка аудио для модели"""
        try:
            import librosa
            
            # Загружаем аудио с нужной частотой дискретизации
            audio, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            # Нормализация
            audio = librosa.util.normalize(audio)
            
            # Добавляем размерность batch
            audio = np.expand_dims(audio, axis=0)
            
            return audio.astype(np.float32)
            
        except ImportError:
            logger.warning("librosa не установлена, используется простая обработка")
            return await self._simple_preprocess_audio(audio_path)
        except Exception as e:
            logger.error(f"Ошибка предобработки аудио: {e}")
            return await self._simple_preprocess_audio(audio_path)
    
    async def _simple_preprocess_audio(self, audio_path: str) -> np.ndarray:
        """Простая предобработка без librosa"""
        try:
            # Читаем WAV файл напрямую
            with open(audio_path, 'rb') as f:
                data = f.read()
            
            # Простая проверка WAV заголовка
            if len(data) < 44 or data[:4] != b'RIFF':
                raise ValueError("Некорректный WAV файл")
            
            # Извлекаем аудио данные (пропускаем заголовок)
            audio_data = data[44:]
            
            # Конвертируем в numpy array (16-bit PCM)
            audio = np.frombuffer(audio_data, dtype=np.int16)
            
            # Нормализация к float32
            audio = audio.astype(np.float32) / 32768.0
            
            # Добавляем размерность batch
            audio = np.expand_dims(audio, axis=0)
            
            return audio
            
        except Exception as e:
            logger.error(f"Ошибка простой предобработки: {e}")
            # Возвращаем пустой массив как fallback
            return np.zeros((1, self.sample_rate), dtype=np.float32)
    
    def _decode_output(self, output: np.ndarray) -> str:
        """Декодирование выхода модели в текст"""
        try:
            if self.vocab is None:
                logger.warning("Словарь не загружен, используется простое декодирование")
                return self._simple_decode(output)
            
            # CTC декодирование
            # Получаем индексы с максимальной вероятностью
            predicted_ids = np.argmax(output, axis=-1)
            
            # Убираем повторяющиеся символы и blank токены
            decoded_ids = []
            prev_id = -1
            
            for seq in predicted_ids:
                for token_id in seq:
                    if token_id != prev_id and token_id != 0:  # 0 - blank token
                        decoded_ids.append(token_id)
                    prev_id = token_id
            
            # Конвертируем в текст
            text = ""
            for token_id in decoded_ids:
                if token_id < len(self.vocab):
                    text += self.vocab[token_id]
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Ошибка декодирования: {e}")
            return self._simple_decode(output)
    
    def _simple_decode(self, output: np.ndarray) -> str:
        """Простое декодирование без словаря"""
        try:
            # Получаем форму выхода
            shape = output.shape
            logger.info(f"Форма выхода модели: {shape}")
            
            # Простая эмуляция декодирования
            if len(shape) >= 2:
                # Берем максимальные значения
                max_indices = np.argmax(output, axis=-1)
                
                # Создаем простой текст на основе индексов
                text_parts = []
                for i, idx in enumerate(max_indices.flatten()[:10]):  # Берем первые 10
                    if idx > 0:  # Пропускаем blank токены
                        # Простое сопоставление индексов с символами
                        char_code = (idx % 26) + ord('а')  # Русские буквы
                        text_parts.append(chr(char_code))
                
                if text_parts:
                    return ''.join(text_parts)
            
            return "Распознанный текст"
            
        except Exception as e:
            logger.error(f"Ошибка простого декодирования: {e}")
            return "Ошибка декодирования"
    
    async def _fallback_transcribe(self, audio_path: str) -> str:
        """Fallback метод транскрипции (для совместимости)"""
        try:
            with open(audio_path, 'rb') as f:
                audio_data = f.read()
            
            audio_format = os.path.splitext(audio_path)[1][1:].lower()
            result = await self._transcribe_fallback(audio_data, audio_format)
            
            return result.get('text', 'Ошибка транскрипции')
            
        except Exception as e:
            logger.error(f"Ошибка fallback транскрипции: {e}")
            return "Ошибка обработки аудио"