import httpx
import json
import asyncio
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class GemmaClient:
    """Клиент для работы с Gemma 3 через LM Studio"""
    
    def __init__(self, base_url: str = "http://localhost:1234"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.model_name = "gemma-2-2b-it"  # Название модели в LM Studio
    
    async def generate_response(self, prompt: str, system_prompt: str = "", max_tokens: int = 1000) -> str:
        """
        Генерация ответа от Gemma 3
        
        Args:
            prompt: Пользовательский промпт
            system_prompt: Системный промпт
            max_tokens: Максимальное количество токенов
            
        Returns:
            Ответ модели
        """
        try:
            messages = []
            
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            messages.append({
                "role": "user", 
                "content": prompt
            })
            
            payload = {
                "model": self.model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7,
                "stream": False
            }
            
            response = await self.client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Ошибка API LM Studio: {response.status_code} - {response.text}")
                return self._get_fallback_response(prompt)
                
        except Exception as e:
            logger.error(f"Не удалось подключиться к LM Studio: {e}")
            return self._get_fallback_response(prompt)
    
    def _get_fallback_response(self, prompt: str) -> str:
        """Fallback ответы когда LM Studio недоступен"""
        if "резюме" in prompt.lower():
            return "Анализ резюме временно недоступен. Пожалуйста, попробуйте позже."
        elif "интервью" in prompt.lower():
            return "Расскажите о своем опыте работы и профессиональных навыках."
        elif "код" in prompt.lower():
            return "Анализ кода временно недоступен. Пожалуйста, попробуйте позже."
        else:
            return "Сервис временно недоступен. Пожалуйста, попробуйте позже."
    
    async def analyze_resume_json(self, resume_text: str) -> Dict[str, Any]:
        """
        Анализ резюме с выводом в формате JSON
        
        Args:
            resume_text: Текст резюме
            
        Returns:
            JSON с характеристиками кандидата
        """
        system_prompt = """
        Ты - эксперт по анализу резюме. Проанализируй предоставленное резюме и верни результат СТРОГО в формате JSON.
        
        Структура ответа:
        {
            "personal_info": {
                "name": "ФИО",
                "position": "Желаемая должность",
                "experience_years": число_лет_опыта
            },
            "skills": {
                "technical_skills": ["навык1", "навык2"],
                "soft_skills": ["навык1", "навык2"],
                "languages": ["язык1", "язык2"]
            },
            "experience": {
                "companies": ["компания1", "компания2"],
                "roles": ["роль1", "роль2"],
                "achievements": ["достижение1", "достижение2"]
            },
            "education": {
                "degree": "Степень образования",
                "institution": "Учебное заведение",
                "specialization": "Специализация"
            },
            "assessment": {
                "overall_score": оценка_от_1_до_10,
                "strengths": ["сильная_сторона1", "сильная_сторона2"],
                "weaknesses": ["слабая_сторона1", "слабая_сторона2"],
                "recommendation": "Рекомендация по кандидату"
            }
        }
        
        Отвечай ТОЛЬКО JSON, без дополнительного текста.
        """
        
        prompt = f"Проанализируй следующее резюме:\n\n{resume_text}"
        
        try:
            response = await self.generate_response(prompt, system_prompt, max_tokens=1500)
            
            # Попытка парсинга JSON
            try:
                json_result = json.loads(response)
                return json_result
            except json.JSONDecodeError:
                # Если не удалось распарсить, возвращаем базовую структуру
                logger.warning("Не удалось распарсить JSON ответ от Gemma")
                return self._create_fallback_resume_analysis(resume_text)
                
        except Exception as e:
            logger.error(f"Ошибка анализа резюме: {str(e)}")
            return self._create_fallback_resume_analysis(resume_text)
    
    async def generate_interview_question(self, context: Dict[str, Any], conversation_history: List[Dict]) -> str:
        """
        Генерация вопроса для интервью
        
        Args:
            context: Контекст о кандидате (анализ резюме)
            conversation_history: История диалога
            
        Returns:
            Вопрос для интервью
        """
        system_prompt = """
        Ты - опытный HR-специалист, проводящий собеседование. 
        Задавай умные, проницательные вопросы, основываясь на резюме кандидата и предыдущих ответах.
        Вопросы должны быть:
        - Конкретными и релевантными
        - Направленными на выявление реальных навыков
        - Проверяющими опыт и достижения
        - Дружелюбными, но профессиональными
        
        Отвечай только вопросом, без дополнительных комментариев.
        """
        
        # Формирование контекста
        context_text = f"Информация о кандидате: {json.dumps(context, ensure_ascii=False, indent=2)}"
        
        history_text = ""
        if conversation_history:
            history_text = "История диалога:\n"
            for msg in conversation_history[-3:]:  # Последние 3 сообщения
                role = "Интервьюер" if msg["role"] == "assistant" else "Кандидат"
                history_text += f"{role}: {msg['content']}\n"
        
        prompt = f"{context_text}\n\n{history_text}\n\nЗадай следующий вопрос кандидату:"
        
        return await self.generate_response(prompt, system_prompt, max_tokens=200)
    
    async def analyze_interview_response(self, question: str, answer: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Анализ ответа кандидата в интервью
        
        Args:
            question: Заданный вопрос
            answer: Ответ кандидата
            context: Контекст интервью
            
        Returns:
            JSON с анализом ответа
        """
        system_prompt = """
        Проанализируй ответ кандидата на вопрос интервью. Верни результат в формате JSON:
        
        {
            "answer_quality": оценка_от_1_до_10,
            "key_points": ["ключевой_момент1", "ключевой_момент2"],
            "strengths": ["сильная_сторона1", "сильная_сторона2"],
            "concerns": ["проблема1", "проблема2"],
            "follow_up_needed": true/false,
            "notes": "Дополнительные заметки"
        }
        
        Отвечай ТОЛЬКО JSON.
        """
        
        prompt = f"Вопрос: {question}\n\nОтвет кандидата: {answer}\n\nКонтекст: {json.dumps(context, ensure_ascii=False)}"
        
        try:
            response = await self.generate_response(prompt, system_prompt, max_tokens=800)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка анализа ответа: {str(e)}")
            return {
                "answer_quality": 5,
                "key_points": ["Ответ получен"],
                "strengths": [],
                "concerns": [],
                "follow_up_needed": False,
                "notes": f"Ошибка анализа: {str(e)}"
            }
    
    async def analyze_code_submission(self, code: str, task_description: str) -> Dict[str, Any]:
        """
        Анализ кода тестового задания
        
        Args:
            code: Код кандидата
            task_description: Описание задания
            
        Returns:
            JSON с анализом кода
        """
        system_prompt = """
        Проанализируй код тестового задания. Верни результат в формате JSON:
        
        {
            "code_quality": оценка_от_1_до_10,
            "correctness": оценка_от_1_до_10,
            "style": оценка_от_1_до_10,
            "efficiency": оценка_от_1_до_10,
            "strengths": ["сильная_сторона1", "сильная_сторона2"],
            "improvements": ["улучшение1", "улучшение2"],
            "bugs": ["баг1", "баг2"],
            "overall_score": общая_оценка_от_1_до_10,
            "feedback": "Подробная обратная связь"
        }
        
        Отвечай ТОЛЬКО JSON.
        """
        
        prompt = f"Задание: {task_description}\n\nКод кандидата:\n```\n{code}\n```"
        
        try:
            response = await self.generate_response(prompt, system_prompt, max_tokens=1200)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка анализа кода: {str(e)}")
            return {
                "code_quality": 5,
                "correctness": 5,
                "style": 5,
                "efficiency": 5,
                "strengths": [],
                "improvements": [],
                "bugs": [],
                "overall_score": 5,
                "feedback": f"Ошибка анализа: {str(e)}"
            }
    
    def _create_fallback_resume_analysis(self, resume_text: str) -> Dict[str, Any]:
        """Создание базового анализа резюме в случае ошибки"""
        return {
            "personal_info": {
                "name": "Не определено",
                "position": "Не определено",
                "experience_years": 0
            },
            "skills": {
                "technical_skills": [],
                "soft_skills": [],
                "languages": []
            },
            "experience": {
                "companies": [],
                "roles": [],
                "achievements": []
            },
            "education": {
                "degree": "Не определено",
                "institution": "Не определено",
                "specialization": "Не определено"
            },
            "assessment": {
                "overall_score": 5,
                "strengths": ["Резюме предоставлено"],
                "weaknesses": ["Требуется дополнительный анализ"],
                "recommendation": "Необходимо провести интервью для получения дополнительной информации"
            }
        }
    
    async def check_connection(self) -> bool:
        """Проверка подключения к LM Studio"""
        try:
            response = await self.client.get(f"{self.base_url}/v1/models")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ошибка подключения к LM Studio: {str(e)}")
            return False
    
    async def close(self):
        """Закрытие клиента"""
        await self.client.aclose()