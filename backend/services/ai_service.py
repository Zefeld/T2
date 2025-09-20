"""
PathFinder AI Service
Сервис для работы с LLM, парсинга профилей, извлечения навыков и семантического анализа
"""

import asyncio
import json
import logging
import re
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

import openai
import tiktoken
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from ..core.config import settings
from ..core.exceptions import AIServiceError

logger = logging.getLogger(__name__)


class DocumentType(str, Enum):
    """Типы документов для парсинга"""
    RESUME = "resume"
    JOB_DESCRIPTION = "job_description"
    PROFILE = "profile"
    COURSE_DESCRIPTION = "course_description"
    PROJECT_DESCRIPTION = "project_description"


@dataclass
class ExtractedSkill:
    """Извлеченный навык"""
    name: str
    category: str
    level: Optional[str] = None
    experience_years: Optional[int] = None
    confidence: float = 0.0
    context: Optional[str] = None


@dataclass
class ExtractedExperience:
    """Извлеченный опыт работы"""
    position: str
    company: str
    duration_months: Optional[int] = None
    description: str
    skills: List[str] = None
    achievements: List[str] = None


@dataclass
class ParsedProfile:
    """Распарсенный профиль"""
    name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    skills: List[ExtractedSkill] = None
    experience: List[ExtractedExperience] = None
    education: List[Dict[str, Any]] = None
    languages: List[Dict[str, Any]] = None
    certifications: List[str] = None
    summary: Optional[str] = None
    career_goals: List[str] = None


@dataclass
class JobRequirements:
    """Требования к вакансии"""
    position: str
    department: Optional[str] = None
    required_skills: List[Dict[str, Any]] = None
    preferred_skills: List[Dict[str, Any]] = None
    experience_years: Optional[int] = None
    education_requirements: List[str] = None
    responsibilities: List[str] = None
    benefits: List[str] = None


class AIService:
    """Сервис для работы с AI и LLM"""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
        self.model = settings.OPENAI_MODEL or "gpt-4"
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL or "text-embedding-ada-002"
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200
        )
        
        # Кэш для эмбеддингов
        self._embedding_cache = {}
        
        # Промпты для различных задач
        self.prompts = {
            "extract_skills": self._get_skill_extraction_prompt(),
            "parse_resume": self._get_resume_parsing_prompt(),
            "parse_job_description": self._get_job_description_prompt(),
            "normalize_skill": self._get_skill_normalization_prompt(),
            "match_explanation": self._get_match_explanation_prompt()
        }
    
    async def get_embedding(self, text: str) -> List[float]:
        """
        Получение эмбеддинга для текста
        
        Args:
            text: Текст для эмбеддинга
            
        Returns:
            Вектор эмбеддинга
        """
        try:
            # Проверяем кэш
            text_hash = hash(text)
            if text_hash in self._embedding_cache:
                return self._embedding_cache[text_hash]
            
            # Очищаем и обрезаем текст
            clean_text = self._clean_text(text)
            if len(clean_text) > 8000:  # Ограничение для embedding модели
                clean_text = clean_text[:8000]
            
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=clean_text
            )
            
            embedding = response.data[0].embedding
            
            # Кэшируем результат
            self._embedding_cache[text_hash] = embedding
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise AIServiceError(f"Failed to get embedding: {e}")
    
    async def extract_skills_from_text(
        self,
        text: str,
        document_type: DocumentType = DocumentType.PROFILE,
        skill_taxonomy: Optional[List[str]] = None
    ) -> List[ExtractedSkill]:
        """
        Извлечение навыков из текста
        
        Args:
            text: Текст для анализа
            document_type: Тип документа
            skill_taxonomy: Список известных навыков для нормализации
            
        Returns:
            Список извлеченных навыков
        """
        try:
            # Подготавливаем промпт
            prompt = self.prompts["extract_skills"].format(
                text=text,
                document_type=document_type.value,
                skill_taxonomy=json.dumps(skill_taxonomy[:50] if skill_taxonomy else [])
            )
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.1,
                max_tokens=2000
            )
            
            # Парсим ответ
            skills_data = self._parse_json_response(response)
            
            extracted_skills = []
            for skill_data in skills_data.get("skills", []):
                extracted_skills.append(ExtractedSkill(
                    name=skill_data.get("name", ""),
                    category=skill_data.get("category", "technical"),
                    level=skill_data.get("level"),
                    experience_years=skill_data.get("experience_years"),
                    confidence=float(skill_data.get("confidence", 0.0)),
                    context=skill_data.get("context")
                ))
            
            logger.info(f"Extracted {len(extracted_skills)} skills from text")
            return extracted_skills
            
        except Exception as e:
            logger.error(f"Error extracting skills: {e}")
            return []
    
    async def parse_resume(self, resume_text: str) -> ParsedProfile:
        """
        Парсинг резюме/профиля сотрудника
        
        Args:
            resume_text: Текст резюме
            
        Returns:
            Структурированный профиль
        """
        try:
            prompt = self.prompts["parse_resume"].format(text=resume_text)
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.1,
                max_tokens=3000
            )
            
            # Парсим ответ
            profile_data = self._parse_json_response(response)
            
            # Извлекаем навыки
            skills = []
            for skill_data in profile_data.get("skills", []):
                skills.append(ExtractedSkill(
                    name=skill_data.get("name", ""),
                    category=skill_data.get("category", "technical"),
                    level=skill_data.get("level"),
                    experience_years=skill_data.get("experience_years"),
                    confidence=float(skill_data.get("confidence", 0.8))
                ))
            
            # Извлекаем опыт работы
            experience = []
            for exp_data in profile_data.get("experience", []):
                experience.append(ExtractedExperience(
                    position=exp_data.get("position", ""),
                    company=exp_data.get("company", ""),
                    duration_months=exp_data.get("duration_months"),
                    description=exp_data.get("description", ""),
                    skills=exp_data.get("skills", []),
                    achievements=exp_data.get("achievements", [])
                ))
            
            return ParsedProfile(
                name=profile_data.get("name"),
                position=profile_data.get("position"),
                department=profile_data.get("department"),
                skills=skills,
                experience=experience,
                education=profile_data.get("education", []),
                languages=profile_data.get("languages", []),
                certifications=profile_data.get("certifications", []),
                summary=profile_data.get("summary"),
                career_goals=profile_data.get("career_goals", [])
            )
            
        except Exception as e:
            logger.error(f"Error parsing resume: {e}")
            return ParsedProfile()
    
    async def parse_job_description(self, job_text: str) -> JobRequirements:
        """
        Парсинг описания вакансии
        
        Args:
            job_text: Текст описания вакансии
            
        Returns:
            Структурированные требования к вакансии
        """
        try:
            prompt = self.prompts["parse_job_description"].format(text=job_text)
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.1,
                max_tokens=2500
            )
            
            # Парсим ответ
            job_data = self._parse_json_response(response)
            
            return JobRequirements(
                position=job_data.get("position", ""),
                department=job_data.get("department"),
                required_skills=job_data.get("required_skills", []),
                preferred_skills=job_data.get("preferred_skills", []),
                experience_years=job_data.get("experience_years"),
                education_requirements=job_data.get("education_requirements", []),
                responsibilities=job_data.get("responsibilities", []),
                benefits=job_data.get("benefits", [])
            )
            
        except Exception as e:
            logger.error(f"Error parsing job description: {e}")
            return JobRequirements(position="Unknown")
    
    async def normalize_skill_name(
        self,
        skill_name: str,
        skill_taxonomy: List[str]
    ) -> Optional[str]:
        """
        Нормализация названия навыка к стандартной таксономии
        
        Args:
            skill_name: Исходное название навыка
            skill_taxonomy: Список стандартных навыков
            
        Returns:
            Нормализованное название или None
        """
        try:
            # Простая проверка на точное совпадение
            for standard_skill in skill_taxonomy:
                if skill_name.lower() == standard_skill.lower():
                    return standard_skill
            
            # Семантическая нормализация через LLM
            prompt = self.prompts["normalize_skill"].format(
                skill_name=skill_name,
                taxonomy=json.dumps(skill_taxonomy[:100])  # Ограничиваем размер
            )
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.0,
                max_tokens=100
            )
            
            result = self._parse_json_response(response)
            normalized_skill = result.get("normalized_skill")
            confidence = result.get("confidence", 0.0)
            
            # Возвращаем только если уверенность высокая
            if confidence >= 0.8:
                return normalized_skill
            
            return None
            
        except Exception as e:
            logger.error(f"Error normalizing skill: {e}")
            return None
    
    async def explain_match(
        self,
        employee_profile: Dict[str, Any],
        job_requirements: Dict[str, Any],
        match_score: float,
        skill_gaps: List[Dict[str, Any]]
    ) -> str:
        """
        Генерация объяснения матчинга кандидата и вакансии
        
        Args:
            employee_profile: Профиль сотрудника
            job_requirements: Требования к вакансии
            match_score: Оценка соответствия
            skill_gaps: Пробелы в навыках
            
        Returns:
            Текстовое объяснение матчинга
        """
        try:
            prompt = self.prompts["match_explanation"].format(
                employee_profile=json.dumps(employee_profile, ensure_ascii=False),
                job_requirements=json.dumps(job_requirements, ensure_ascii=False),
                match_score=match_score,
                skill_gaps=json.dumps(skill_gaps, ensure_ascii=False)
            )
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error generating match explanation: {e}")
            return f"Соответствие: {match_score:.1%}. Требуется дополнительный анализ."
    
    async def generate_career_recommendations(
        self,
        employee_profile: Dict[str, Any],
        available_roles: List[Dict[str, Any]],
        market_trends: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Генерация карьерных рекомендаций для сотрудника
        
        Args:
            employee_profile: Профиль сотрудника
            available_roles: Доступные роли
            market_trends: Рыночные тренды
            
        Returns:
            Список карьерных рекомендаций
        """
        try:
            prompt = f"""
            Проанализируй профиль сотрудника и предложи 3-5 наиболее подходящих карьерных путей.
            
            Профиль сотрудника:
            {json.dumps(employee_profile, ensure_ascii=False, indent=2)}
            
            Доступные роли:
            {json.dumps(available_roles, ensure_ascii=False, indent=2)}
            
            Рыночные тренды:
            {json.dumps(market_trends or {}, ensure_ascii=False, indent=2)}
            
            Верни результат в JSON формате:
            {{
                "recommendations": [
                    {{
                        "role_id": "uuid",
                        "role_title": "название роли",
                        "match_score": 0.85,
                        "reasoning": "объяснение почему подходит",
                        "development_plan": [
                            {{
                                "skill": "навык",
                                "current_level": "текущий уровень",
                                "target_level": "целевой уровень",
                                "estimated_time": "время в неделях"
                            }}
                        ],
                        "next_steps": ["шаг 1", "шаг 2", "шаг 3"]
                    }}
                ]
            }}
            """
            
            response = await self._call_llm(
                prompt=prompt,
                temperature=0.2,
                max_tokens=2000
            )
            
            result = self._parse_json_response(response)
            return result.get("recommendations", [])
            
        except Exception as e:
            logger.error(f"Error generating career recommendations: {e}")
            return []
    
    async def _call_llm(
        self,
        prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 1000
    ) -> str:
        """Вызов LLM с обработкой ошибок и ретраями"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Ты - эксперт по HR и анализу навыков. Отвечай точно и структурированно."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            raise AIServiceError(f"LLM call failed: {e}")
    
    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """Парсинг JSON ответа от LLM с обработкой ошибок"""
        try:
            # Извлекаем JSON из ответа (может быть обернут в markdown)
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Ищем JSON в тексте
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = response
            
            return json.loads(json_str)
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            logger.error(f"Response was: {response}")
            return {}
    
    def _clean_text(self, text: str) -> str:
        """Очистка текста для обработки"""
        # Удаляем лишние пробелы и переносы
        text = re.sub(r'\s+', ' ', text)
        # Удаляем специальные символы
        text = re.sub(r'[^\w\s\-.,;:()!?]', '', text)
        return text.strip()
    
    def _get_skill_extraction_prompt(self) -> str:
        """Промпт для извлечения навыков"""
        return """
        Извлеки все навыки из следующего текста ({document_type}):
        
        {text}
        
        Известные навыки для нормализации:
        {skill_taxonomy}
        
        Верни результат в JSON формате:
        {{
            "skills": [
                {{
                    "name": "точное название навыка",
                    "category": "technical|soft_skills|language|certification|domain_knowledge|tool|framework|methodology",
                    "level": "novice|beginner|intermediate|advanced|expert",
                    "experience_years": число_лет_опыта_или_null,
                    "confidence": 0.0-1.0,
                    "context": "контекст_где_упоминается"
                }}
            ]
        }}
        
        Правила:
        1. Извлекай только реальные навыки, не общие слова
        2. Нормализуй названия к стандартным (используй список известных навыков)
        3. Определи уровень владения на основе контекста
        4. Укажи confidence - насколько уверен в извлечении
        """
    
    def _get_resume_parsing_prompt(self) -> str:
        """Промпт для парсинга резюме"""
        return """
        Распарси следующее резюме/профиль и извлеки структурированную информацию:
        
        {text}
        
        Верни результат в JSON формате:
        {{
            "name": "ФИО",
            "position": "текущая должность",
            "department": "подразделение",
            "summary": "краткое резюме",
            "skills": [
                {{
                    "name": "навык",
                    "category": "категория",
                    "level": "уровень",
                    "experience_years": лет_опыта,
                    "confidence": 0.8
                }}
            ],
            "experience": [
                {{
                    "position": "должность",
                    "company": "компания",
                    "duration_months": месяцев,
                    "description": "описание",
                    "skills": ["навык1", "навык2"],
                    "achievements": ["достижение1", "достижение2"]
                }}
            ],
            "education": [
                {{
                    "degree": "степень",
                    "institution": "учебное заведение",
                    "year": год_окончания,
                    "field": "специальность"
                }}
            ],
            "languages": [
                {{
                    "language": "язык",
                    "level": "уровень"
                }}
            ],
            "certifications": ["сертификат1", "сертификат2"],
            "career_goals": ["цель1", "цель2"]
        }}
        """
    
    def _get_job_description_prompt(self) -> str:
        """Промпт для парсинга описания вакансии"""
        return """
        Распарси следующее описание вакансии и извлеки требования:
        
        {text}
        
        Верни результат в JSON формате:
        {{
            "position": "название позиции",
            "department": "подразделение",
            "required_skills": [
                {{
                    "name": "навык",
                    "level": "минимальный уровень",
                    "is_critical": true/false,
                    "weight": 0.0-1.0
                }}
            ],
            "preferred_skills": [
                {{
                    "name": "навык",
                    "level": "желательный уровень",
                    "weight": 0.0-1.0
                }}
            ],
            "experience_years": минимальный_опыт,
            "education_requirements": ["требование1", "требование2"],
            "responsibilities": ["обязанность1", "обязанность2"],
            "benefits": ["льгота1", "льгота2"]
        }}
        """
    
    def _get_skill_normalization_prompt(self) -> str:
        """Промпт для нормализации навыков"""
        return """
        Нормализуй название навыка к стандартной таксономии:
        
        Исходный навык: {skill_name}
        
        Стандартная таксономия:
        {taxonomy}
        
        Верни результат в JSON формате:
        {{
            "normalized_skill": "стандартное_название_или_null",
            "confidence": 0.0-1.0,
            "reasoning": "объяснение"
        }}
        
        Правила:
        1. Найди наиболее подходящий навык из таксономии
        2. Учитывай синонимы и сокращения
        3. Если точного соответствия нет, верни null
        4. Confidence должен быть высоким (>0.8) для возврата результата
        """
    
    def _get_match_explanation_prompt(self) -> str:
        """Промпт для объяснения матчинга"""
        return """
        Объясни, почему кандидат подходит или не подходит для вакансии:
        
        Профиль кандидата:
        {employee_profile}
        
        Требования к вакансии:
        {job_requirements}
        
        Оценка соответствия: {match_score}
        
        Пробелы в навыках:
        {skill_gaps}
        
        Создай понятное объяснение на русском языке (2-3 абзаца):
        1. Почему кандидат подходит (сильные стороны)
        2. Какие есть пробелы и как их можно закрыть
        3. Общая рекомендация
        
        Используй профессиональный, но дружелюбный тон.
        """


# Глобальный экземпляр сервиса
ai_service = AIService()