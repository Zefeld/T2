import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime
import uuid
import tempfile
import os
import subprocess
import sys

from .gemma_client import GemmaClient

logger = logging.getLogger(__name__)

class CodingTestService:
    """Сервис проведения тестовых заданий по программированию"""
    
    def __init__(self, gemma_client: GemmaClient):
        self.gemma_client = gemma_client
        self.active_tests = {}  # Хранение активных тестов
        self.supported_languages = {
            'python': {
                'extension': '.py',
                'executor': 'python',
                'timeout': 30
            },
            'javascript': {
                'extension': '.js',
                'executor': 'node',
                'timeout': 30
            },
            'java': {
                'extension': '.java',
                'executor': 'javac',
                'timeout': 45
            },
            'cpp': {
                'extension': '.cpp',
                'executor': 'g++',
                'timeout': 45
            }
        }
        
    async def generate_coding_task(self, resume_analysis: Dict[str, Any], difficulty: str = "medium") -> Dict[str, Any]:
        """
        Генерация тестового задания на основе резюме кандидата
        
        Args:
            resume_analysis: Результат анализа резюме
            difficulty: Уровень сложности (easy, medium, hard)
            
        Returns:
            Сгенерированное тестовое задание
        """
        try:
            # Определение технологий из резюме
            skills = resume_analysis.get('technical_skills', [])
            experience_level = resume_analysis.get('experience_level', 'junior')
            position = resume_analysis.get('personal_info', {}).get('position', 'Developer')
            
            # Генерация задания
            task = await self._generate_task_by_profile(skills, experience_level, position, difficulty)
            
            # Создание контекста теста
            test_id = str(uuid.uuid4())
            test_context = {
                'test_id': test_id,
                'resume_analysis': resume_analysis,
                'task': task,
                'start_time': datetime.now().isoformat(),
                'status': 'active',
                'submissions': [],
                'difficulty': difficulty
            }
            
            self.active_tests[test_id] = test_context
            
            return {
                'test_id': test_id,
                'task': task,
                'status': 'generated',
                'time_limit_minutes': 60,
                'supported_languages': list(self.supported_languages.keys())
            }
            
        except Exception as e:
            logger.error(f"Ошибка генерации задания: {str(e)}")
            return {
                'error': True,
                'message': f"Ошибка генерации задания: {str(e)}"
            }
    
    async def submit_solution(self, test_id: str, code: str, language: str, 
                            file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Отправка решения кандидата
        
        Args:
            test_id: ID теста
            code: Код решения
            language: Язык программирования
            file_name: Имя файла (опционально)
            
        Returns:
            Результат проверки решения
        """
        try:
            if test_id not in self.active_tests:
                return {'error': True, 'message': 'Тест не найден'}
            
            if language not in self.supported_languages:
                return {'error': True, 'message': f'Язык {language} не поддерживается'}
            
            test_context = self.active_tests[test_id]
            
            # Создание записи о попытке
            submission = {
                'submission_id': str(uuid.uuid4()),
                'code': code,
                'language': language,
                'file_name': file_name,
                'timestamp': datetime.now().isoformat(),
                'status': 'submitted'
            }
            
            # Анализ кода
            code_analysis = await self._analyze_code_quality(code, language, test_context['task'])
            submission['analysis'] = code_analysis
            
            # Выполнение кода (если возможно)
            execution_result = await self._execute_code(code, language)
            submission['execution'] = execution_result
            
            # Оценка решения
            assessment = await self._assess_solution(
                test_context['task'], 
                code, 
                language, 
                code_analysis, 
                execution_result
            )
            submission['assessment'] = assessment
            
            # Сохранение попытки
            test_context['submissions'].append(submission)
            
            return {
                'submission_id': submission['submission_id'],
                'status': 'evaluated',
                'analysis': code_analysis,
                'execution': execution_result,
                'assessment': assessment,
                'can_resubmit': len(test_context['submissions']) < 3  # Максимум 3 попытки
            }
            
        except Exception as e:
            logger.error(f"Ошибка обработки решения: {str(e)}")
            return {'error': True, 'message': f"Ошибка обработки решения: {str(e)}"}
    
    async def finalize_test(self, test_id: str) -> Dict[str, Any]:
        """
        Завершение тестового задания и генерация финального отчета
        
        Args:
            test_id: ID теста
            
        Returns:
            Финальный отчет по тесту
        """
        try:
            if test_id not in self.active_tests:
                return {'error': True, 'message': 'Тест не найден'}
            
            test_context = self.active_tests[test_id]
            test_context['status'] = 'completed'
            test_context['end_time'] = datetime.now().isoformat()
            
            # Генерация финального отчета
            final_report = await self._generate_final_test_report(test_context)
            
            # Генерация обратной связи для кандидата
            candidate_feedback = await self._generate_test_feedback(test_context)
            
            result = {
                'test_id': test_id,
                'status': 'completed',
                'final_report': final_report,
                'candidate_feedback': candidate_feedback,
                'total_submissions': len(test_context['submissions']),
                'duration_minutes': self._calculate_test_duration(test_context),
                'task': test_context['task']
            }
            
            test_context['final_result'] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка завершения теста: {str(e)}")
            return {'error': True, 'message': f"Ошибка завершения теста: {str(e)}"}
    
    async def get_test_status(self, test_id: str) -> Dict[str, Any]:
        """
        Получение статуса тестового задания
        
        Args:
            test_id: ID теста
            
        Returns:
            Статус теста
        """
        if test_id not in self.active_tests:
            return {'error': True, 'message': 'Тест не найден'}
        
        test_context = self.active_tests[test_id]
        
        return {
            'test_id': test_id,
            'status': test_context['status'],
            'start_time': test_context['start_time'],
            'submissions_count': len(test_context['submissions']),
            'max_submissions': 3,
            'time_elapsed_minutes': self._calculate_elapsed_time(test_context)
        }
    
    async def _generate_task_by_profile(self, skills: List[str], experience_level: str, 
                                      position: str, difficulty: str) -> Dict[str, Any]:
        """Генерация задания на основе профиля кандидата"""
        system_prompt = f"""
        Создай тестовое задание по программированию для кандидата со следующим профилем:
        - Навыки: {', '.join(skills)}
        - Уровень опыта: {experience_level}
        - Позиция: {position}
        - Сложность: {difficulty}
        
        Задание должно включать:
        1. Четкое описание проблемы
        2. Входные и выходные данные
        3. Примеры тестовых случаев
        4. Ограничения и требования
        5. Критерии оценки
        
        Отвечай в формате JSON:
        {{
            "title": "Название задания",
            "description": "Подробное описание задачи",
            "input_format": "Формат входных данных",
            "output_format": "Формат выходных данных",
            "examples": [
                {{"input": "пример входа", "output": "пример выхода", "explanation": "объяснение"}}
            ],
            "constraints": ["ограничение1", "ограничение2"],
            "evaluation_criteria": ["критерий1", "критерий2"],
            "time_complexity_expected": "O(n)",
            "space_complexity_expected": "O(1)",
            "difficulty_level": "{difficulty}",
            "estimated_time_minutes": 45
        }}
        """
        
        prompt = f"""
        Создай подходящее тестовое задание для данного профиля кандидата.
        Задание должно быть практичным и соответствовать уровню опыта.
        """
        
        try:
            response = await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=1500)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка генерации задания: {str(e)}")
            # Возвращаем базовое задание в случае ошибки
            return {
                "title": "Базовое задание по программированию",
                "description": "Напишите функцию, которая находит максимальный элемент в массиве целых чисел.",
                "input_format": "Массив целых чисел",
                "output_format": "Максимальное значение",
                "examples": [
                    {"input": "[1, 3, 2, 8, 5]", "output": "8", "explanation": "8 - наибольший элемент"}
                ],
                "constraints": ["Массив содержит от 1 до 1000 элементов"],
                "evaluation_criteria": ["Корректность", "Эффективность", "Читаемость кода"],
                "time_complexity_expected": "O(n)",
                "space_complexity_expected": "O(1)",
                "difficulty_level": difficulty,
                "estimated_time_minutes": 30
            }
    
    async def _analyze_code_quality(self, code: str, language: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ качества кода"""
        system_prompt = """
        Проанализируй качество предоставленного кода и оцени его по следующим критериям:
        
        Отвечай в формате JSON:
        {
            "correctness_score": оценка_от_1_до_10,
            "readability_score": оценка_от_1_до_10,
            "efficiency_score": оценка_от_1_до_10,
            "style_score": оценка_от_1_до_10,
            "overall_score": общая_оценка_от_1_до_10,
            "strengths": ["сильная_сторона1", "сильная_сторона2"],
            "weaknesses": ["слабая_сторона1", "слабая_сторона2"],
            "suggestions": ["предложение1", "предложение2"],
            "complexity_analysis": "анализ сложности",
            "follows_best_practices": true/false
        }
        """
        
        prompt = f"""
        Задание: {task.get('title', 'Не указано')}
        Описание: {task.get('description', 'Не указано')}
        Язык программирования: {language}
        
        Код для анализа:
        ```{language}
        {code}
        ```
        
        Проанализируй этот код.
        """
        
        try:
            response = await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=1000)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка анализа кода: {str(e)}")
            return {
                "correctness_score": 5,
                "readability_score": 5,
                "efficiency_score": 5,
                "style_score": 5,
                "overall_score": 5,
                "strengths": ["Код предоставлен"],
                "weaknesses": [f"Ошибка анализа: {str(e)}"],
                "suggestions": ["Требуется дополнительная проверка"],
                "complexity_analysis": "Не удалось определить",
                "follows_best_practices": False
            }
    
    async def _execute_code(self, code: str, language: str) -> Dict[str, Any]:
        """Выполнение кода (базовая проверка синтаксиса)"""
        try:
            lang_config = self.supported_languages.get(language)
            if not lang_config:
                return {
                    'status': 'unsupported',
                    'message': f'Язык {language} не поддерживается для выполнения'
                }
            
            # Создание временного файла
            with tempfile.NamedTemporaryFile(
                mode='w', 
                suffix=lang_config['extension'], 
                delete=False
            ) as temp_file:
                temp_file.write(code)
                temp_file_path = temp_file.name
            
            try:
                # Базовая проверка синтаксиса
                if language == 'python':
                    result = await self._check_python_syntax(temp_file_path)
                elif language == 'javascript':
                    result = await self._check_javascript_syntax(temp_file_path)
                else:
                    result = {
                        'status': 'syntax_check_skipped',
                        'message': f'Проверка синтаксиса для {language} не реализована'
                    }
                
                return result
                
            finally:
                # Удаление временного файла
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass
                    
        except Exception as e:
            logger.error(f"Ошибка выполнения кода: {str(e)}")
            return {
                'status': 'execution_error',
                'message': f'Ошибка выполнения: {str(e)}'
            }
    
    async def _check_python_syntax(self, file_path: str) -> Dict[str, Any]:
        """Проверка синтаксиса Python кода"""
        try:
            # Компиляция для проверки синтаксиса
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            
            compile(code, file_path, 'exec')
            
            return {
                'status': 'syntax_valid',
                'message': 'Синтаксис корректен'
            }
            
        except SyntaxError as e:
            return {
                'status': 'syntax_error',
                'message': f'Синтаксическая ошибка: {str(e)}',
                'line': e.lineno,
                'column': e.offset
            }
        except Exception as e:
            return {
                'status': 'check_error',
                'message': f'Ошибка проверки: {str(e)}'
            }
    
    async def _check_javascript_syntax(self, file_path: str) -> Dict[str, Any]:
        """Проверка синтаксиса JavaScript кода"""
        try:
            # Простая проверка через node --check
            process = await asyncio.create_subprocess_exec(
                'node', '--check', file_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return {
                    'status': 'syntax_valid',
                    'message': 'Синтаксис корректен'
                }
            else:
                return {
                    'status': 'syntax_error',
                    'message': f'Синтаксическая ошибка: {stderr.decode()}'
                }
                
        except Exception as e:
            return {
                'status': 'check_error',
                'message': f'Ошибка проверки: {str(e)}'
            }
    
    async def _assess_solution(self, task: Dict[str, Any], code: str, language: str,
                             code_analysis: Dict[str, Any], execution_result: Dict[str, Any]) -> Dict[str, Any]:
        """Общая оценка решения"""
        system_prompt = """
        Оцени решение тестового задания и создай финальную оценку в формате JSON:
        
        {
            "overall_score": оценка_от_1_до_10,
            "task_completion": оценка_от_1_до_10,
            "code_quality": оценка_от_1_до_10,
            "algorithm_efficiency": оценка_от_1_до_10,
            "meets_requirements": true/false,
            "positive_aspects": ["аспект1", "аспект2"],
            "areas_for_improvement": ["область1", "область2"],
            "recommendation": "excellent/good/satisfactory/needs_improvement/poor",
            "detailed_feedback": "Подробная обратная связь"
        }
        """
        
        prompt = f"""
        Задание: {task.get('title', 'Не указано')}
        Требования: {task.get('description', 'Не указано')}
        
        Анализ кода: {json.dumps(code_analysis, ensure_ascii=False)}
        Результат выполнения: {json.dumps(execution_result, ensure_ascii=False)}
        
        Оцени качество решения.
        """
        
        try:
            response = await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=1000)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка оценки решения: {str(e)}")
            return {
                "overall_score": 5,
                "task_completion": 5,
                "code_quality": 5,
                "algorithm_efficiency": 5,
                "meets_requirements": False,
                "positive_aspects": ["Решение предоставлено"],
                "areas_for_improvement": ["Требуется дополнительная оценка"],
                "recommendation": "needs_improvement",
                "detailed_feedback": f"Ошибка автоматической оценки: {str(e)}"
            }
    
    async def _generate_final_test_report(self, test_context: Dict[str, Any]) -> Dict[str, Any]:
        """Генерация финального отчета по тесту"""
        submissions = test_context['submissions']
        
        if not submissions:
            return {
                "overall_score": 0,
                "completion_status": "not_attempted",
                "best_submission": None,
                "total_attempts": 0,
                "recommendation": "No solution submitted"
            }
        
        # Находим лучшую попытку
        best_submission = max(submissions, 
                            key=lambda s: s.get('assessment', {}).get('overall_score', 0))
        
        # Агрегируем результаты
        total_score = best_submission.get('assessment', {}).get('overall_score', 0)
        
        return {
            "overall_score": total_score,
            "completion_status": "completed",
            "best_submission": {
                "submission_id": best_submission['submission_id'],
                "language": best_submission['language'],
                "assessment": best_submission['assessment'],
                "timestamp": best_submission['timestamp']
            },
            "total_attempts": len(submissions),
            "task_difficulty": test_context['difficulty'],
            "recommendation": self._get_recommendation_by_score(total_score),
            "improvement_areas": best_submission.get('assessment', {}).get('areas_for_improvement', [])
        }
    
    async def _generate_test_feedback(self, test_context: Dict[str, Any]) -> str:
        """Генерация обратной связи для кандидата по тесту"""
        system_prompt = """
        Создай конструктивную обратную связь для кандидата по результатам тестового задания.
        Обратная связь должна:
        - Быть позитивной и мотивирующей
        - Выделять сильные стороны решения
        - Давать конкретные советы по улучшению
        - Поощрять дальнейшее развитие
        """
        
        final_report = await self._generate_final_test_report(test_context)
        
        prompt = f"""
        Результаты тестового задания: {json.dumps(final_report, ensure_ascii=False)}
        
        Создай персональную обратную связь для кандидата.
        """
        
        try:
            return await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=500)
        except Exception as e:
            return f"Спасибо за выполнение тестового задания! К сожалению, произошла ошибка при генерации обратной связи: {str(e)}"
    
    def _get_recommendation_by_score(self, score: float) -> str:
        """Получение рекомендации на основе оценки"""
        if score >= 9:
            return "excellent"
        elif score >= 7:
            return "good"
        elif score >= 5:
            return "satisfactory"
        elif score >= 3:
            return "needs_improvement"
        else:
            return "poor"
    
    def _calculate_test_duration(self, test_context: Dict[str, Any]) -> int:
        """Расчет продолжительности теста в минутах"""
        try:
            start_time = datetime.fromisoformat(test_context['start_time'])
            end_time = datetime.fromisoformat(test_context['end_time'])
            duration = end_time - start_time
            return int(duration.total_seconds() / 60)
        except Exception:
            return 0
    
    def _calculate_elapsed_time(self, test_context: Dict[str, Any]) -> int:
        """Расчет прошедшего времени с начала теста"""
        try:
            start_time = datetime.fromisoformat(test_context['start_time'])
            current_time = datetime.now()
            duration = current_time - start_time
            return int(duration.total_seconds() / 60)
        except Exception:
            return 0
    
    def get_active_tests(self) -> List[str]:
        """Получение списка активных тестов"""
        return [tid for tid, context in self.active_tests.items() 
                if context['status'] == 'active']
    
    async def cleanup_completed_tests(self, hours_old: int = 48):
        """Очистка завершенных тестов старше указанного времени"""
        current_time = datetime.now()
        to_remove = []
        
        for test_id, context in self.active_tests.items():
            if context['status'] == 'completed':
                try:
                    end_time = datetime.fromisoformat(context['end_time'])
                    if (current_time - end_time).total_seconds() > hours_old * 3600:
                        to_remove.append(test_id)
                except Exception:
                    to_remove.append(test_id)
        
        for test_id in to_remove:
            del self.active_tests[test_id]
        
        logger.info(f"Очищено {len(to_remove)} завершенных тестов")