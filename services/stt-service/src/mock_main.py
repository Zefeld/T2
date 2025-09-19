#!/usr/bin/env python3
"""
Mock STT Service - упрощенная версия для быстрого запуска
Эмулирует работу STT сервиса без реальных ML зависимостей
"""

import json
import time
import random
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Mock данные для эмуляции распознавания речи
MOCK_RESPONSES = [
    "Привет, как дела?",
    "Это тестовое сообщение для проверки STT сервиса",
    "Система распознавания речи работает корректно",
    "Добро пожаловать в платформу карьерного развития",
    "Пожалуйста, расскажите о своих профессиональных целях",
    "Какие навыки вы хотели бы развить?",
    "Опишите ваш опыт работы",
    "Что вас мотивирует в профессиональной деятельности?"
]

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка здоровья сервиса"""
    return jsonify({
        'status': 'healthy',
        'service': 'stt-service-mock',
        'version': '1.0.0',
        'timestamp': time.time()
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Mock эндпоинт для транскрипции аудио
    Возвращает случайный текст вместо реального распознавания
    """
    try:
        # Проверяем наличие файла
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Получаем дополнительные параметры
        language = request.form.get('language', 'ru')
        model = request.form.get('model', 'base')
        
        # Эмулируем время обработки
        processing_time = random.uniform(0.5, 2.0)
        time.sleep(processing_time)
        
        # Возвращаем mock результат
        mock_text = random.choice(MOCK_RESPONSES)
        
        response = {
            'text': mock_text,
            'confidence': round(random.uniform(0.85, 0.98), 3),
            'language': language,
            'model': model,
            'processing_time': round(processing_time, 2),
            'file_size': len(file.read()),
            'mock': True
        }
        
        logger.info(f"Mock transcription completed: {mock_text[:50]}...")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/transcribe/stream', methods=['POST'])
def transcribe_stream():
    """
    Mock эндпоинт для потоковой транскрипции
    """
    try:
        data = request.get_json()
        if not data or 'audio_chunk' not in data:
            return jsonify({'error': 'No audio chunk provided'}), 400
        
        # Эмулируем потоковую обработку
        chunk_text = random.choice(MOCK_RESPONSES).split()[:3]
        
        response = {
            'partial_text': ' '.join(chunk_text),
            'is_final': random.choice([True, False]),
            'confidence': round(random.uniform(0.7, 0.95), 3),
            'timestamp': time.time(),
            'mock': True
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in transcribe_stream: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def get_available_models():
    """Возвращает список доступных моделей"""
    models = [
        {
            'name': 'base',
            'description': 'Base model for general transcription',
            'languages': ['ru', 'en'],
            'mock': True
        },
        {
            'name': 'large',
            'description': 'Large model for high accuracy',
            'languages': ['ru', 'en', 'de', 'fr'],
            'mock': True
        }
    ]
    
    return jsonify({'models': models})

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

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '0.0.0.0')
    
    logger.info(f"Starting Mock STT Service on {host}:{port}")
    logger.info("This is a mock service for development purposes")
    
    app.run(
        host=host,
        port=port,
        debug=True,
        threaded=True
    )