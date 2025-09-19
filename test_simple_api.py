import requests
import json

def test_simple_interview():
    """Тестирует простой текстовый API endpoint"""
    
    # Создаем сессию
    create_session_url = "http://localhost:8000/api/create-session"
    session_data = {
        "candidate_name": "Test User Simple",
        "position": "Software Developer"
    }
    
    try:
        print("1. Создаем сессию...")
        # Отключаем прокси для локальных запросов
        proxies = {'http': None, 'https': None}
        response = requests.post(create_session_url, json=session_data, timeout=10, proxies=proxies)
        print(f"Статус: {response.status_code}")
        print(f"Заголовки ответа: {response.headers}")
        
        if response.status_code != 200:
            print(f"Ошибка создания сессии: {response.text}")
            print(f"Детали ошибки: {response.reason}")
            return
            
        session_result = response.json()
        session_id = session_result.get('session_id')
        print(f"Session ID: {session_id}")
        
        # Тестируем текстовое сообщение
        print("\n2. Отправляем текстовое сообщение...")
        message_url = "http://localhost:8000/api/interview-message"
        message_data = {
            "session_id": session_id,
            "message": "Привет, меня зовут Тест. Я готов к интервью."
        }
        
        response = requests.post(message_url, json=message_data, timeout=10, proxies=proxies)
        print(f"Статус: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Ответ от сервера:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"Ошибка: {response.text}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    test_simple_interview()