import requests
import json

def test_voice_interview():
    """Тестирует голосовой API endpoint"""
    
    # Сначала создаем новую сессию
    create_session_url = "http://localhost:8000/api/create-session"
    session_data = {
        "candidate_name": "Voice Test User",
        "position": "Software Developer"
    }
    
    try:
        print("1. Создаем новую сессию...")
        # Отключаем прокси для локальных запросов
        proxies = {'http': None, 'https': None}
        response = requests.post(create_session_url, json=session_data, timeout=10, proxies=proxies)
        
        if response.status_code != 200:
            print(f"Ошибка создания сессии: {response.text}")
            return
            
        session_result = response.json()
        session_id = session_result.get('session_id')
        print(f"Session ID: {session_id}")
    
        # URL для голосового интервью
        url = "http://localhost:8000/api/voice-interview"
        # Подготавливаем файл для отправки
        with open('test_voice.wav', 'rb') as audio_file:
            files = {
                'file': ('test_voice.wav', audio_file, 'audio/wav')
            }
            data = {
                'session_id': session_id
            }
            
            print("2. Отправляем запрос на голосовой API...")
            print(f"Session ID: {session_id}")
            print(f"Audio file: test_voice.wav")
            
            # Отправляем POST запрос
            response = requests.post(url, files=files, data=data, timeout=30, proxies=proxies)
            
            print(f"\nСтатус ответа: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    print("\nОтвет от сервера:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    
                    # Проверяем наличие аудио в ответе
                    if 'audio_data' in result:
                        print(f"\nПолучены аудио данные: {len(result['audio_data'])} символов base64")
                        
                        # Сохраняем аудио ответ
                        import base64
                        audio_bytes = base64.b64decode(result['audio_data'])
                        with open('response_audio.wav', 'wb') as f:
                            f.write(audio_bytes)
                        print("Аудио ответ сохранен в response_audio.wav")
                    
                except json.JSONDecodeError:
                    print("Ошибка декодирования JSON ответа")
                    print(f"Raw response: {response.text}")
            else:
                print(f"Ошибка: {response.status_code}")
                print(f"Response: {response.text}")
                
    except FileNotFoundError:
        print("Ошибка: файл test_voice.wav не найден")
    except requests.exceptions.RequestException as e:
        print(f"Ошибка запроса: {e}")
    except Exception as e:
        print(f"Неожиданная ошибка: {e}")

if __name__ == "__main__":
    test_voice_interview()