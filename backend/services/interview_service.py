import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime
import uuid
import requests

logger = logging.getLogger(__name__)

class InterviewService:
    """Сервис проведения AI интервью"""
    
    def __init__(self):
        self.lm_studio_url = "http://localhost:1234/v1/chat/completions"
        self.model_name = "gemma-2-2b-it"
        self.question_count = 0
        self.max_questions = 8
        
    async def start_interview(self, resume_analysis: Dict[str, Any]) -> str:
        """Начало интервью на основе анализа резюме"""
        try:
            self.question_count = 0
            
            # Формирование системного промпта
            system_prompt = f"""
            Ты опытный HR-интервьюер. Проводишь собеседование с кандидатом на основе его резюме.
            
            Анализ резюме кандидата:
            {json.dumps(resume_analysis, ensure_ascii=False, indent=2)}
            
            Твоя задача:
            1. Задавать уточняющие вопросы о опыте работы
            2. Проверять глубину знаний в указанных технологиях
            3. Выяснять мотивацию и карьерные цели
            4. Задавать каверзные вопросы для проверки честности
            
            Начни с приветствия и первого вопроса о мотивации кандидата.
            Говори на русском языке. Будь дружелюбным, но профессиональным.
            """
            
            response = await self._call_llm(system_prompt, "Начни интервью")
            self.question_count += 1
            
            return response
            
        except Exception as e:
            logger.error(f"Ошибка начала интервью: {e}")
            return "Добро пожаловать на собеседование! Расскажите, пожалуйста, что мотивирует вас в работе?"
    
    async def process_text_response(self, interview_id: str, response_text: str) -> Dict[str, Any]:
        """
        Обработка текстового ответа кандидата
        
        Args:
            interview_id: ID интервью
            response_text: Текст ответа кандидата
            
        Returns:
            Следующий вопрос или завершение интервью
        """
        try:
            if interview_id not in self.active_interviews:
                return {'error': True, 'message': 'Интервью не найдено'}
            
            interview_context = self.active_interviews[interview_id]
            
            # Добавление ответа кандидата в историю
            interview_context['conversation_history'].append({
                'role': 'user',
                'content': response_text,
                'timestamp': datetime.now().isoformat()
            })
            
            # Анализ ответа
            last_question = self._get_last_question(interview_context)
            analysis = await self.gemma_client.analyze_interview_response(
                last_question, response_text, interview_context['resume_analysis']
            )
            
            # Сохранение анализа
            interview_context['assessment_scores'].append(analysis)
            
            # Проверка завершения интервью
            if self._should_end_interview(interview_context):
                return await self._end_interview(interview_id)
            
            # Генерация следующего вопроса
            next_question = await self.gemma_client.generate_interview_question(
                interview_context['resume_analysis'],
                interview_context['conversation_history']
            )
            
            # Добавление вопроса в историю
            interview_context['current_question_number'] += 1
            interview_context['conversation_history'].append({
                'role': 'assistant',
                'content': next_question,
                'timestamp': datetime.now().isoformat(),
                'question_number': interview_context['current_question_number']
            })
            
            return {
                'status': 'continuing',
                'next_question': next_question,
                'question_number': interview_context['current_question_number'],
                'total_questions': interview_context['total_questions_planned'],
                'analysis': analysis
            }
            
        except Exception as e:
            logger.error(f"Ошибка обработки ответа: {str(e)}")
            return {'error': True, 'message': f"Ошибка обработки ответа: {str(e)}"}
    
    async def process_voice_response(self, interview_id: str, audio_data: bytes) -> Dict[str, Any]:
        """
        Обработка голосового ответа кандидата
        
        Args:
            interview_id: ID интервью
            audio_data: Аудио данные
            
        Returns:
            Результат обработки с текстом и следующим вопросом
        """
        try:
            if interview_id not in self.active_interviews:
                return {'error': True, 'message': 'Интервью не найдено'}
            
            # Транскрибация аудио
            transcription = await self.stt_service.transcribe_audio(audio_data)
            
            if not transcription or transcription.strip() == "":
                return {
                    'error': True,
                    'message': 'Не удалось распознать речь. Попробуйте еще раз.'
                }
            
            # Обработка как текстового ответа
            result = await self.process_text_response(interview_id, transcription)
            
            # Добавление информации о транскрибации
            result['transcription'] = transcription
            
            # Генерация голосового ответа, если интервью продолжается
            if result.get('status') == 'continuing' and 'next_question' in result:
                try:
                    audio_response = await self.tts_service.generate_speech(result['next_question'])
                    result['audio_response'] = audio_response
                except Exception as tts_error:
                    logger.warning(f"Ошибка генерации голоса: {str(tts_error)}")
                    # Продолжаем без голосового ответа
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка обработки голосового ответа: {str(e)}")
            return {'error': True, 'message': f"Ошибка обработки голоса: {str(e)}"}
    
    async def get_interview_status(self, interview_id: str) -> Dict[str, Any]:
        """
        Получение статуса интервью
        
        Args:
            interview_id: ID интервью
            
        Returns:
            Статус интервью
        """
        if interview_id not in self.active_interviews:
            return {'error': True, 'message': 'Интервью не найдено'}
        
        interview_context = self.active_interviews[interview_id]
        
        return {
            'interview_id': interview_id,
            'status': interview_context['status'],
            'current_question': interview_context['current_question_number'],
            'total_questions': interview_context['total_questions_planned'],
            'start_time': interview_context['start_time'],
            'conversation_length': len(interview_context['conversation_history'])
        }
    
    async def end_interview_manually(self, interview_id: str) -> Dict[str, Any]:
        """
        Ручное завершение интервью
        
        Args:
            interview_id: ID интервью
            
        Returns:
            Результат завершения интервью
        """
        if interview_id not in self.active_interviews:
            return {'error': True, 'message': 'Интервью не найдено'}
        
        return await self._end_interview(interview_id)
    
    async def _generate_opening_question(self, resume_analysis: Dict[str, Any]) -> str:
        """Генерация открывающего вопроса"""
        system_prompt = """
        Ты - дружелюбный HR-специалист, начинающий интервью. 
        Поприветствуй кандидата и задай открывающий вопрос, основываясь на его резюме.
        Вопрос должен быть теплым, располагающим и мотивирующим кандидата рассказать о себе.
        """
        
        candidate_name = resume_analysis.get('personal_info', {}).get('name', 'Кандидат')
        position = resume_analysis.get('personal_info', {}).get('position', 'указанную должность')
        
        prompt = f"""
        Кандидат: {candidate_name}
        Желаемая должность: {position}
        
        Поприветствуй кандидата и задай открывающий вопрос для интервью.
        """
        
        return await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=200)
    
    def _get_last_question(self, interview_context: Dict[str, Any]) -> str:
        """Получение последнего заданного вопроса"""
        history = interview_context['conversation_history']
        for message in reversed(history):
            if message['role'] == 'assistant':
                return message['content']
        return "Вопрос не найден"
    
    def _should_end_interview(self, interview_context: Dict[str, Any]) -> bool:
        """Проверка необходимости завершения интервью"""
        current_q = interview_context['current_question_number']
        total_q = interview_context['total_questions_planned']
        
        # Завершаем если достигли лимита вопросов
        if current_q >= total_q:
            return True
        
        # Можно добавить другие условия завершения
        return False
    
    async def _end_interview(self, interview_id: str) -> Dict[str, Any]:
        """Завершение интервью и генерация отчета"""
        try:
            interview_context = self.active_interviews[interview_id]
            interview_context['status'] = 'completed'
            interview_context['end_time'] = datetime.now().isoformat()
            
            # Генерация финального отчета
            final_report = await self._generate_final_assessment(interview_context)
            
            # Генерация обратной связи для кандидата
            candidate_feedback = await self._generate_candidate_feedback(interview_context)
            
            # Создание транскрипции
            transcription = self._create_transcription(interview_context)
            
            result = {
                'status': 'completed',
                'interview_id': interview_id,
                'final_assessment': final_report,
                'candidate_feedback': candidate_feedback,
                'transcription': transcription,
                'duration_minutes': self._calculate_duration(interview_context),
                'total_questions_asked': interview_context['current_question_number']
            }
            
            # Сохранение завершенного интервью (можно переместить в архив)
            interview_context['final_result'] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка завершения интервью: {str(e)}")
            return {'error': True, 'message': f"Ошибка завершения: {str(e)}"}
    
    async def _generate_final_assessment(self, interview_context: Dict[str, Any]) -> Dict[str, Any]:
        """Генерация финальной оценки интервью"""
        system_prompt = """
        Проанализируй интервью и создай финальную оценку кандидата в формате JSON:
        
        {
            "overall_score": оценка_от_1_до_10,
            "communication_skills": оценка_от_1_до_10,
            "technical_competence": оценка_от_1_до_10,
            "cultural_fit": оценка_от_1_до_10,
            "motivation": оценка_от_1_до_10,
            "strengths": ["сильная_сторона1", "сильная_сторона2"],
            "areas_for_improvement": ["область1", "область2"],
            "key_insights": ["инсайт1", "инсайт2"],
            "recommendation": "hire/consider/reject",
            "reasoning": "Обоснование рекомендации"
        }
        
        Отвечай ТОЛЬКО JSON.
        """
        
        # Подготовка данных интервью
        conversation_summary = self._summarize_conversation(interview_context)
        assessment_scores = interview_context.get('assessment_scores', [])
        
        prompt = f"""
        Резюме кандидата: {json.dumps(interview_context['resume_analysis'], ensure_ascii=False)}
        
        Краткое содержание интервью: {conversation_summary}
        
        Оценки по ответам: {json.dumps(assessment_scores, ensure_ascii=False)}
        
        Создай финальную оценку кандидата.
        """
        
        try:
            response = await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=1000)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка генерации финальной оценки: {str(e)}")
            return {
                "overall_score": 5,
                "communication_skills": 5,
                "technical_competence": 5,
                "cultural_fit": 5,
                "motivation": 5,
                "strengths": ["Участие в интервью"],
                "areas_for_improvement": ["Требуется дополнительная оценка"],
                "key_insights": [f"Ошибка анализа: {str(e)}"],
                "recommendation": "consider",
                "reasoning": "Необходима дополнительная оценка из-за технических проблем"
            }
    
    async def _generate_candidate_feedback(self, interview_context: Dict[str, Any]) -> str:
        """Генерация обратной связи для кандидата"""
        system_prompt = """
        Создай позитивную и конструктивную обратную связь для кандидата после интервью.
        Обратная связь должна:
        - Быть дружелюбной и поддерживающей
        - Выделять сильные стороны кандидата
        - Давать конструктивные советы для развития
        - Мотивировать на дальнейшее развитие
        """
        
        candidate_name = interview_context['resume_analysis'].get('personal_info', {}).get('name', 'Кандидат')
        
        prompt = f"""
        Кандидат: {candidate_name}
        
        Создай персональную обратную связь по результатам интервью.
        """
        
        return await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=500)
    
    def _create_transcription(self, interview_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Создание транскрипции диалога"""
        transcription = []
        
        for message in interview_context['conversation_history']:
            role_name = "Интервьюер" if message['role'] == 'assistant' else "Кандидат"
            
            transcription.append({
                'speaker': role_name,
                'content': message['content'],
                'timestamp': message['timestamp'],
                'question_number': message.get('question_number')
            })
        
        return transcription
    
    def _summarize_conversation(self, interview_context: Dict[str, Any]) -> str:
        """Создание краткого содержания разговора"""
        history = interview_context['conversation_history']
        
        summary_parts = []
        for i, message in enumerate(history):
            role = "И" if message['role'] == 'assistant' else "К"
            content = message['content'][:100] + "..." if len(message['content']) > 100 else message['content']
            summary_parts.append(f"{role}: {content}")
        
        return "\n".join(summary_parts)
    
    def _calculate_duration(self, interview_context: Dict[str, Any]) -> int:
        """Расчет продолжительности интервью в минутах"""
        try:
            start_time = datetime.fromisoformat(interview_context['start_time'])
            end_time = datetime.fromisoformat(interview_context['end_time'])
            duration = end_time - start_time
            return int(duration.total_seconds() / 60)
        except Exception:
            return 0
    
    def get_active_interviews(self) -> List[str]:
        """Получение списка активных интервью"""
        return [iid for iid, context in self.active_interviews.items() 
                if context['status'] == 'active']
    
    async def cleanup_completed_interviews(self, hours_old: int = 24):
        """Очистка завершенных интервью старше указанного времени"""
        current_time = datetime.now()
        to_remove = []
        
        for interview_id, context in self.active_interviews.items():
            if context['status'] == 'completed':
                try:
                    end_time = datetime.fromisoformat(context['end_time'])
                    if (current_time - end_time).total_seconds() > hours_old * 3600:
                        to_remove.append(interview_id)
                except Exception:
                    # Если не можем определить время, удаляем
                    to_remove.append(interview_id)
        
        for interview_id in to_remove:
            del self.active_interviews[interview_id]
        
        logger.info(f"Очищено {len(to_remove)} завершенных интервью")
    
    async def process_answer(self, answer: str, resume_analysis: Dict[str, Any], conversation_history: str) -> str:
        """Обработка ответа кандидата и генерация следующего вопроса"""
        try:
            if self.question_count >= self.max_questions:
                return "Спасибо за интересные ответы! Интервью завершено. Переходим к тестовому заданию."
            
            system_prompt = f"""
            Ты HR-интервьюер. Анализируй ответ кандидата и задай следующий вопрос.
            
            Анализ резюме:
            {json.dumps(resume_analysis, ensure_ascii=False, indent=2)}
            
            История разговора:
            {conversation_history}
            
            Последний ответ кандидата: {answer}
            
            Задай следующий вопрос, основываясь на:
            1. Ответе кандидата
            2. Его резюме
            3. Необходимости углубиться в детали
            
            Вопрос должен быть конкретным и проверять профессиональные навыки.
            Говори на русском языке.
            """
            
            response = await self._call_llm(system_prompt, answer)
            self.question_count += 1
            
            return response
            
        except Exception as e:
            logger.error(f"Ошибка обработки ответа: {e}")
            return "Интересно. Расскажите подробнее о вашем опыте работы с технологиями из резюме."
    
    async def analyze_code(self, code: str, task_description: str) -> Dict[str, Any]:
        """Анализ кода тестового задания"""
        try:
            system_prompt = f"""
            Ты эксперт по программированию. Проанализируй код кандидата.
            
            Задание: {task_description}
            
            Код кандидата:
            {code}
            
            Оцени код по критериям:
            1. Корректность решения (0-10)
            2. Качество кода (0-10)
            3. Читаемость (0-10)
            4. Эффективность (0-10)
            5. Соответствие требованиям (0-10)
            
            Верни результат в JSON формате:
            {{
                "correctness": число,
                "code_quality": число,
                "readability": число,
                "efficiency": число,
                "requirements_compliance": число,
                "total_score": число,
                "feedback": "подробный отзыв",
                "strengths": ["сильная сторона 1", "сильная сторона 2"],
                "improvements": ["улучшение 1", "улучшение 2"]
            }}
            """
            
            response = await self._call_llm(system_prompt, code)
            
            # Попытка парсинга JSON
            try:
                result = json.loads(response)
                return result
            except json.JSONDecodeError:
                # Если не удалось распарсить, возвращаем базовую оценку
                return {
                    "correctness": 7,
                    "code_quality": 7,
                    "readability": 7,
                    "efficiency": 7,
                    "requirements_compliance": 7,
                    "total_score": 35,
                    "feedback": response,
                    "strengths": ["Код предоставлен"],
                    "improvements": ["Требуется дополнительный анализ"]
                }
                
        except Exception as e:
            logger.error(f"Ошибка анализа кода: {e}")
            return {
                "correctness": 5,
                "code_quality": 5,
                "readability": 5,
                "efficiency": 5,
                "requirements_compliance": 5,
                "total_score": 25,
                "feedback": "Ошибка при анализе кода",
                "strengths": [],
                "improvements": ["Требуется повторная проверка"]
            }
    
    async def generate_candidate_feedback(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Генерация обратной связи для кандидата"""
        try:
            system_prompt = f"""
            Сгенерируй конструктивную обратную связь для кандидата на основе его прохождения интервью.
            
            Данные сессии:
            {json.dumps(session_data, ensure_ascii=False, indent=2)}
            
            Создай обратную связь в JSON формате:
            {{
                "overall_impression": "общее впечатление",
                "strengths": ["сильная сторона 1", "сильная сторона 2"],
                "areas_for_improvement": ["область для улучшения 1", "область для улучшения 2"],
                "recommendations": ["рекомендация 1", "рекомендация 2"],
                "next_steps": "что делать дальше"
            }}
            
            Будь конструктивным и поддерживающим.
            """
            
            response = await self._call_llm(system_prompt, "Сгенерируй обратную связь")
            
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {
                    "overall_impression": "Спасибо за участие в интервью",
                    "strengths": ["Активное участие", "Готовность к диалогу"],
                    "areas_for_improvement": ["Продолжайте развиваться"],
                    "recommendations": ["Изучайте новые технологии"],
                    "next_steps": "Ожидайте результатов"
                }
                
        except Exception as e:
            logger.error(f"Ошибка генерации обратной связи: {e}")
            return {
                "overall_impression": "Спасибо за участие",
                "strengths": [],
                "areas_for_improvement": [],
                "recommendations": [],
                "next_steps": "Ожидайте результатов"
            }
    
    async def _call_llm(self, system_prompt: str, user_message: str) -> str:
        """Вызов LLM через LM Studio API"""
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.7,
                "max_tokens": 500,
                "stream": False
            }
            
            # Асинхронный HTTP запрос
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: requests.post(self.lm_studio_url, headers=headers, json=data, timeout=30)
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"LM Studio API error: {response.status_code} - {response.text}")
                return "Извините, произошла техническая ошибка. Попробуйте еще раз."
                
        except requests.exceptions.ConnectionError:
            logger.error("Не удается подключиться к LM Studio. Убедитесь, что сервер запущен на localhost:1234")
            return "Техническая ошибка: сервер недоступен."
        except requests.exceptions.Timeout:
            logger.error("Таймаут при обращении к LM Studio")
            return "Извините, запрос занял слишком много времени."
        except Exception as e:
            logger.error(f"Ошибка вызова LLM: {e}")
            return "Произошла техническая ошибка."