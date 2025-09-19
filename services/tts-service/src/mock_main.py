#!/usr/bin/env python3
"""
Mock TTS Service - упрощенная версия для быстрого запуска
Эмулирует работу TTS сервиса без реальных ML зависимостей
"""

import json
import time
import random
import base64
from flask import Flask, request, jsonify, send_file
import os
import logging
import io

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Mock аудио данные (простой WAV заголовок + тишина)
def generate_mock_audio(duration_seconds=3):
    """Генерирует mock WAV файл с тишиной"""
    sample_rate = 22050
    samples = int(sample_rate * duration_seconds)
    
    # WAV заголовок
    wav_header = bytearray([
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x00, 0x00, 0x00, 0x00,  # File size (будет заполнено)
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Subchunk1Size
        0x01, 0x00,              # AudioFormat (PCM)
        0x01, 0x00,              # NumChannels (mono)
        0x22, 0x56, 0x00, 0x00,  # SampleRate (22050)
        0x44, 0xAC, 0x00, 0x00,  # ByteRate
        0x02, 0x00,              # BlockAlign
        0x10, 0x00,              # BitsPerSample (16)
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0x00, 0x00, 0x00   # Subchunk2Size (будет заполнено)
    ])
    
    # Генерируем тишину (нули)
    audio_data = bytearray(samples * 2)  # 16-bit samples
    
    # Обновляем размеры в заголовке
    total_size = len(wav_header) + len(audio_data) - 8
    wav_header[4:8] = total_size.to_bytes(4, 'little')
    wav_header[-4:] = len(audio_data).to_bytes(4, 'little')
    
    return wav_header + audio_data

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка здоровья сервиса"""
    return jsonify({
        'status': 'healthy',
        'service': 'tts-service-mock',
        'version': '1.0.0',
        'timestamp': time.time()
    })

@app.route('/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Mock эндпоинт для синтеза речи
    Возвращает mock аудио файл вместо реального синтеза
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        voice = data.get('voice', 'default')
        language = data.get('language', 'ru')
        speed = data.get('speed', 1.0)
        pitch = data.get('pitch', 1.0)
        
        # Эмулируем время обработки
        processing_time = random.uniform(0.3, 1.5)
        time.sleep(processing_time)
        
        # Генерируем mock аудио
        duration = max(1, len(text) * 0.1)  # Примерная длительность
        audio_data = generate_mock_audio(duration)
        
        # Кодируем в base64 для JSON ответа
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        response = {
            'audio_data': audio_base64,
            'format': 'wav',
            'sample_rate': 22050,
            'duration': round(duration, 2),
            'text': text,
            'voice': voice,
            'language': language,
            'speed': speed,
            'pitch': pitch,
            'processing_time': round(processing_time, 2),
            'mock': True
        }
        
        logger.info(f"Mock synthesis completed for text: {text[:50]}...")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in synthesize_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/synthesize/file', methods=['POST'])
def synthesize_to_file():
    """
    Mock эндпоинт для синтеза речи с возвратом файла
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        
        # Эмулируем время обработки
        processing_time = random.uniform(0.3, 1.5)
        time.sleep(processing_time)
        
        # Генерируем mock аудио
        duration = max(1, len(text) * 0.1)
        audio_data = generate_mock_audio(duration)
        
        # Создаем BytesIO объект для отправки файла
        audio_io = io.BytesIO(audio_data)
        audio_io.seek(0)
        
        logger.info(f"Mock synthesis file completed for text: {text[:50]}...")
        
        return send_file(
            audio_io,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='synthesized_speech.wav'
        )
        
    except Exception as e:
        logger.error(f"Error in synthesize_to_file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/voices', methods=['GET'])
def get_available_voices():
    """Возвращает список доступных голосов"""
    voices = [
        {
            'id': 'default',
            'name': 'Default Voice',
            'language': 'ru',
            'gender': 'neutral',
            'mock': True
        },
        {
            'id': 'female_ru',
            'name': 'Russian Female',
            'language': 'ru',
            'gender': 'female',
            'mock': True
        },
        {
            'id': 'male_ru',
            'name': 'Russian Male',
            'language': 'ru',
            'gender': 'male',
            'mock': True
        },
        {
            'id': 'female_en',
            'name': 'English Female',
            'language': 'en',
            'gender': 'female',
            'mock': True
        }
    ]
    
    return jsonify({'voices': voices})

@app.route('/languages', methods=['GET'])
def get_supported_languages():
    """Возвращает список поддерживаемых языков"""
    languages = [
        {'code': 'ru', 'name': 'Russian'},
        {'code': 'en', 'name': 'English'},
        {'code': 'de', 'name': 'German'},
        {'code': 'fr', 'name': 'French'}
    ]
    
    return jsonify({'languages': languages})

@app.route('/synthesize/stream', methods=['POST'])
def synthesize_stream():
    """
    Mock эндпоинт для потокового синтеза речи
    """
    try:
        data = request.get_json()
        if not data or 'text_chunk' not in data:
            return jsonify({'error': 'No text chunk provided'}), 400
        
        text_chunk = data['text_chunk']
        
        # Эмулируем потоковую обработку
        chunk_duration = len(text_chunk) * 0.05
        audio_data = generate_mock_audio(chunk_duration)
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        response = {
            'audio_chunk': audio_base64,
            'chunk_duration': round(chunk_duration, 2),
            'is_final': data.get('is_final', False),
            'timestamp': time.time(),
            'mock': True
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in synthesize_stream: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    host = os.environ.get('HOST', '0.0.0.0')
    
    logger.info(f"Starting Mock TTS Service on {host}:{port}")
    logger.info("This is a mock service for development purposes")
    
    app.run(
        host=host,
        port=port,
        debug=True,
        threaded=True
    )