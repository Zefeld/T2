"""
PathFinder Matching Service
Сервис для матчинга кандидатов с вакансиями, расчета score и генерации объяснений
"""

import asyncio
import logging
import math
from typing import List, Dict, Optional, Any, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

import numpy as np
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database.models import Employee, Vacancy, Match, SkillGraph, Role
from ..core.database import get_db_session
from ..core.config import settings
from .ai_service import AIService
from .skill_graph_service import SkillGraphService, SkillLevel, SkillGap

logger = logging.getLogger(__name__)


class MatchType(str, Enum):
    """Типы матчинга"""
    EXACT = "exact"           # Точное соответствие
    PARTIAL = "partial"       # Частичное соответствие
    POTENTIAL = "potential"   # Потенциальное соответствие
    STRETCH = "stretch"       # Растяжка (требует развития)


@dataclass
class SkillMatch:
    """Соответствие по навыку"""
    skill_id: UUID
    skill_name: str
    required_level: str
    current_level: Optional[str]
    match_score: float
    is_critical: bool
    weight: float
    gap_severity: str
    development_time_weeks: Optional[int] = None


@dataclass
class MatchResult:
    """Результат матчинга"""
    employee_id: UUID
    vacancy_id: UUID
    total_score: float
    hard_skills_score: float
    soft_skills_score: float
    experience_score: float
    culture_fit_score: float
    match_type: MatchType
    skill_matches: List[SkillMatch]
    skill_gaps: List[SkillGap]
    strengths: List[str]
    concerns: List[str]
    explanation: str
    confidence: float
    recommendation: str


@dataclass
class CandidateRanking:
    """Ранжирование кандидата"""
    employee_id: UUID
    employee_name: str
    current_position: str
    department: str
    match_result: MatchResult
    rank: int
    is_internal: bool = True
    availability: Optional[str] = None


class MatchingService:
    """Сервис матчинга кандидатов и вакансий"""
    
    def __init__(self):
        self.ai_service = AIService()
        self.skill_graph_service = SkillGraphService()
        
        # Веса для различных компонентов оценки
        self.weights = {
            'hard_skills': 0.4,
            'soft_skills': 0.2,
            'experience': 0.25,
            'culture_fit': 0.15
        }
        
        # Пороги для типов матчинга
        self.match_thresholds = {
            MatchType.EXACT: 0.9,
            MatchType.PARTIAL: 0.7,
            MatchType.POTENTIAL: 0.5,
            MatchType.STRETCH: 0.3
        }
    
    async def find_candidates_for_vacancy(
        self,
        vacancy_id: UUID,
        limit: int = 20,
        min_score: float = 0.3,
        include_stretch: bool = True
    ) -> List[CandidateRanking]:
        """
        Поиск кандидатов для вакансии
        
        Args:
            vacancy_id: ID вакансии
            limit: Максимальное количество кандидатов
            min_score: Минимальная оценка соответствия
            include_stretch: Включать stretch кандидатов
            
        Returns:
            Ранжированный список кандидатов
        """
        try:
            async with get_db_session() as session:
                # Получаем вакансию
                vacancy_query = select(Vacancy).options(
                    selectinload(Vacancy.role)
                ).where(Vacancy.id == vacancy_id)
                result = await session.execute(vacancy_query)
                vacancy = result.scalar_one_or_none()
                
                if not vacancy:
                    logger.error(f"Vacancy {vacancy_id} not found")
                    return []
                
                # Получаем всех активных сотрудников
                employees_query = select(Employee).where(
                    and_(
                        Employee.is_active == True,
                        Employee.mobility_ready == True
                    )
                )
                result = await session.execute(employees_query)
                employees = result.scalars().all()
                
                # Матчим каждого сотрудника с вакансией
                candidates = []
                for employee in employees:
                    match_result = await self.match_employee_to_vacancy(
                        employee.id, vacancy_id
                    )
                    
                    if match_result and match_result.total_score >= min_score:
                        # Проверяем, включать ли stretch кандидатов
                        if not include_stretch and match_result.match_type == MatchType.STRETCH:
                            continue
                        
                        candidates.append(CandidateRanking(
                            employee_id=employee.id,
                            employee_name=employee.full_name or f"Employee {employee.id}",
                            current_position=employee.current_role or "Unknown",
                            department=employee.department or "Unknown",
                            match_result=match_result,
                            rank=0,  # Будет установлен при сортировке
                            availability=self._get_employee_availability(employee)
                        ))
                
                # Сортируем по общей оценке
                candidates.sort(key=lambda x: x.match_result.total_score, reverse=True)
                
                # Устанавливаем ранги
                for i, candidate in enumerate(candidates[:limit]):
                    candidate.rank = i + 1
                
                logger.info(f"Found {len(candidates)} candidates for vacancy {vacancy_id}")
                return candidates[:limit]
                
        except Exception as e:
            logger.error(f"Error finding candidates for vacancy: {e}")
            return []
    
    async def match_employee_to_vacancy(
        self,
        employee_id: UUID,
        vacancy_id: UUID,
        save_result: bool = True
    ) -> Optional[MatchResult]:
        """
        Матчинг сотрудника с вакансией
        
        Args:
            employee_id: ID сотрудника
            vacancy_id: ID вакансии
            save_result: Сохранять результат в БД
            
        Returns:
            Результат матчинга
        """
        try:
            async with get_db_session() as session:
                # Получаем данные сотрудника
                employee_query = select(Employee).where(Employee.id == employee_id)
                result = await session.execute(employee_query)
                employee = result.scalar_one_or_none()
                
                if not employee:
                    return None
                
                # Получаем данные вакансии
                vacancy_query = select(Vacancy).options(
                    selectinload(Vacancy.role)
                ).where(Vacancy.id == vacancy_id)
                result = await session.execute(vacancy_query)
                vacancy = result.scalar_one_or_none()
                
                if not vacancy:
                    return None
                
                # Анализируем навыки
                skill_matches, skill_gaps = await self._analyze_skills_match(
                    employee, vacancy
                )
                
                # Рассчитываем компоненты оценки
                hard_skills_score = self._calculate_hard_skills_score(skill_matches)
                soft_skills_score = await self._calculate_soft_skills_score(
                    employee, vacancy
                )
                experience_score = self._calculate_experience_score(employee, vacancy)
                culture_fit_score = await self._calculate_culture_fit_score(
                    employee, vacancy
                )
                
                # Общая оценка
                total_score = (
                    hard_skills_score * self.weights['hard_skills'] +
                    soft_skills_score * self.weights['soft_skills'] +
                    experience_score * self.weights['experience'] +
                    culture_fit_score * self.weights['culture_fit']
                )
                
                # Определяем тип матчинга
                match_type = self._determine_match_type(total_score)
                
                # Анализируем сильные стороны и проблемы
                strengths, concerns = self._analyze_strengths_and_concerns(
                    skill_matches, skill_gaps, employee, vacancy
                )
                
                # Генерируем объяснение
                explanation = await self._generate_match_explanation(
                    employee, vacancy, total_score, skill_gaps, strengths, concerns
                )
                
                # Рассчитываем уверенность
                confidence = self._calculate_confidence(
                    skill_matches, employee, vacancy
                )
                
                # Генерируем рекомендацию
                recommendation = self._generate_recommendation(
                    match_type, total_score, skill_gaps
                )
                
                match_result = MatchResult(
                    employee_id=employee_id,
                    vacancy_id=vacancy_id,
                    total_score=total_score,
                    hard_skills_score=hard_skills_score,
                    soft_skills_score=soft_skills_score,
                    experience_score=experience_score,
                    culture_fit_score=culture_fit_score,
                    match_type=match_type,
                    skill_matches=skill_matches,
                    skill_gaps=skill_gaps,
                    strengths=strengths,
                    concerns=concerns,
                    explanation=explanation,
                    confidence=confidence,
                    recommendation=recommendation
                )
                
                # Сохраняем результат в БД
                if save_result:
                    await self._save_match_result(session, match_result)
                
                return match_result
                
        except Exception as e:
            logger.error(f"Error matching employee to vacancy: {e}")
            return None
    
    async def find_roles_for_employee(
        self,
        employee_id: UUID,
        limit: int = 10,
        min_score: float = 0.4,
        include_stretch: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Поиск подходящих ролей для сотрудника
        
        Args:
            employee_id: ID сотрудника
            limit: Максимальное количество ролей
            min_score: Минимальная оценка соответствия
            include_stretch: Включать stretch роли
            
        Returns:
            Список подходящих ролей с оценками
        """
        try:
            async with get_db_session() as session:
                # Получаем активные вакансии
                vacancies_query = select(Vacancy).options(
                    selectinload(Vacancy.role)
                ).where(
                    and_(
                        Vacancy.is_active == True,
                        Vacancy.status == 'open'
                    )
                )
                result = await session.execute(vacancies_query)
                vacancies = result.scalars().all()
                
                # Матчим с каждой вакансией
                role_matches = []
                for vacancy in vacancies:
                    match_result = await self.match_employee_to_vacancy(
                        employee_id, vacancy.id, save_result=False
                    )
                    
                    if match_result and match_result.total_score >= min_score:
                        if not include_stretch and match_result.match_type == MatchType.STRETCH:
                            continue
                        
                        role_matches.append({
                            'vacancy_id': vacancy.id,
                            'role_id': vacancy.role_id,
                            'role_title': vacancy.role.title if vacancy.role else vacancy.title,
                            'department': vacancy.department,
                            'location': vacancy.location,
                            'match_result': match_result,
                            'priority': vacancy.priority or 'medium'
                        })
                
                # Сортируем по оценке
                role_matches.sort(
                    key=lambda x: x['match_result'].total_score,
                    reverse=True
                )
                
                return role_matches[:limit]
                
        except Exception as e:
            logger.error(f"Error finding roles for employee: {e}")
            return []
    
    async def get_match_analytics(
        self,
        vacancy_id: Optional[UUID] = None,
        department: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Аналитика по матчингу
        
        Args:
            vacancy_id: ID конкретной вакансии
            department: Фильтр по подразделению
            date_from: Дата начала периода
            date_to: Дата окончания периода
            
        Returns:
            Аналитические данные
        """
        try:
            async with get_db_session() as session:
                # Базовый запрос
                query = select(Match)
                
                # Фильтры
                filters = []
                if vacancy_id:
                    filters.append(Match.vacancy_id == vacancy_id)
                if date_from:
                    filters.append(Match.created_at >= date_from)
                if date_to:
                    filters.append(Match.created_at <= date_to)
                
                if filters:
                    query = query.where(and_(*filters))
                
                result = await session.execute(query)
                matches = result.scalars().all()
                
                if not matches:
                    return {
                        'total_matches': 0,
                        'avg_score': 0.0,
                        'match_distribution': {},
                        'top_skills_gaps': [],
                        'recommendations': []
                    }
                
                # Рассчитываем метрики
                total_matches = len(matches)
                avg_score = sum(match.score_total for match in matches) / total_matches
                
                # Распределение по типам матчинга
                match_distribution = {}
                for match in matches:
                    match_type = self._determine_match_type(match.score_total)
                    match_distribution[match_type.value] = match_distribution.get(
                        match_type.value, 0
                    ) + 1
                
                # Топ пробелов в навыках
                skill_gaps_counter = {}
                for match in matches:
                    if match.gaps:
                        for gap in match.gaps:
                            skill_name = gap.get('skill_name', 'Unknown')
                            skill_gaps_counter[skill_name] = skill_gaps_counter.get(
                                skill_name, 0
                            ) + 1
                
                top_skills_gaps = sorted(
                    skill_gaps_counter.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
                
                return {
                    'total_matches': total_matches,
                    'avg_score': round(avg_score, 2),
                    'match_distribution': match_distribution,
                    'top_skills_gaps': [
                        {'skill': skill, 'count': count}
                        for skill, count in top_skills_gaps
                    ],
                    'score_ranges': {
                        'excellent': len([m for m in matches if m.score_total >= 0.9]),
                        'good': len([m for m in matches if 0.7 <= m.score_total < 0.9]),
                        'fair': len([m for m in matches if 0.5 <= m.score_total < 0.7]),
                        'poor': len([m for m in matches if m.score_total < 0.5])
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting match analytics: {e}")
            return {}
    
    async def _analyze_skills_match(
        self,
        employee: Employee,
        vacancy: Vacancy
    ) -> Tuple[List[SkillMatch], List[SkillGap]]:
        """Анализ соответствия навыков"""
        skill_matches = []
        skill_gaps = []
        
        try:
            employee_skills = employee.skills or {}
            required_skills = {}
            
            # Получаем требования к навыкам из роли или вакансии
            if vacancy.role and vacancy.role.skills_required:
                required_skills = vacancy.role.skills_required
            elif vacancy.required_skills_override:
                required_skills = vacancy.required_skills_override
            
            # Анализируем каждый требуемый навык
            for skill_id_str, requirements in required_skills.items():
                try:
                    skill_id = UUID(skill_id_str)
                except ValueError:
                    continue
                
                # Получаем информацию о навыке
                async with get_db_session() as session:
                    skill_query = select(SkillGraph).where(SkillGraph.id == skill_id)
                    result = await session.execute(skill_query)
                    skill = result.scalar_one_or_none()
                    
                    if not skill:
                        continue
                
                required_level = requirements.get('min_level', 'novice')
                is_critical = requirements.get('is_critical', False)
                weight = requirements.get('weight', 1.0)
                
                current_skill = employee_skills.get(skill_id_str)
                current_level = None
                match_score = 0.0
                
                if current_skill:
                    current_level = current_skill.get('level', 'novice')
                    match_score = self._calculate_skill_match_score(
                        current_level, required_level
                    )
                
                # Определяем серьезность пробела
                gap_severity = self._calculate_gap_severity(
                    current_level, required_level, requirements
                )
                
                skill_match = SkillMatch(
                    skill_id=skill_id,
                    skill_name=skill.name,
                    required_level=required_level,
                    current_level=current_level,
                    match_score=match_score,
                    is_critical=is_critical,
                    weight=weight,
                    gap_severity=gap_severity
                )
                
                skill_matches.append(skill_match)
                
                # Добавляем в пробелы, если есть недостаток
                if gap_severity != 'none':
                    skill_gaps.append(SkillGap(
                        skill_id=skill_id,
                        skill_name=skill.name,
                        required_level=SkillLevel(required_level),
                        current_level=SkillLevel(current_level) if current_level else None,
                        gap_severity=gap_severity
                    ))
            
            return skill_matches, skill_gaps
            
        except Exception as e:
            logger.error(f"Error analyzing skills match: {e}")
            return [], []
    
    def _calculate_hard_skills_score(self, skill_matches: List[SkillMatch]) -> float:
        """Расчет оценки по техническим навыкам"""
        if not skill_matches:
            return 0.0
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for match in skill_matches:
            # Критические навыки имеют больший вес
            effective_weight = match.weight * (2.0 if match.is_critical else 1.0)
            total_weighted_score += match.match_score * effective_weight
            total_weight += effective_weight
        
        return total_weighted_score / total_weight if total_weight > 0 else 0.0
    
    async def _calculate_soft_skills_score(
        self,
        employee: Employee,
        vacancy: Vacancy
    ) -> float:
        """Расчет оценки по мягким навыкам"""
        # Упрощенная версия - в реальности здесь будет более сложная логика
        # анализа soft skills на основе профиля, отзывов, оценок и т.д.
        
        base_score = 0.7  # Базовая оценка
        
        # Факторы, влияющие на soft skills
        factors = []
        
        # Опыт работы в команде
        if employee.experience_years and employee.experience_years > 2:
            factors.append(0.1)
        
        # Лидерский опыт
        if employee.current_role and 'lead' in employee.current_role.lower():
            factors.append(0.15)
        
        # Межфункциональный опыт
        if employee.departments_worked and len(employee.departments_worked) > 1:
            factors.append(0.1)
        
        # Применяем факторы
        for factor in factors:
            base_score = min(1.0, base_score + factor)
        
        return base_score
    
    def _calculate_experience_score(self, employee: Employee, vacancy: Vacancy) -> float:
        """Расчет оценки по опыту"""
        if not employee.experience_years:
            return 0.3  # Минимальная оценка для новичков
        
        required_experience = vacancy.min_experience_years or 0
        employee_experience = employee.experience_years
        
        if employee_experience >= required_experience:
            # Опыт соответствует или превышает требования
            excess_years = employee_experience - required_experience
            # Бонус за дополнительный опыт, но с убывающей отдачей
            bonus = min(0.3, excess_years * 0.05)
            return min(1.0, 0.8 + bonus)
        else:
            # Недостаток опыта
            deficit_ratio = employee_experience / required_experience
            return max(0.2, deficit_ratio * 0.7)
    
    async def _calculate_culture_fit_score(
        self,
        employee: Employee,
        vacancy: Vacancy
    ) -> float:
        """Расчет оценки культурного соответствия"""
        # Упрощенная версия - в реальности здесь будет анализ
        # ценностей, стиля работы, предпочтений и т.д.
        
        base_score = 0.75
        
        # Факторы культурного соответствия
        if employee.department == vacancy.department:
            base_score += 0.1  # Знание специфики подразделения
        
        if employee.location == vacancy.location:
            base_score += 0.05  # Географическое соответствие
        
        # Готовность к мобильности
        if employee.mobility_ready:
            base_score += 0.1
        
        return min(1.0, base_score)
    
    def _calculate_skill_match_score(
        self,
        current_level: Optional[str],
        required_level: str
    ) -> float:
        """Расчет оценки соответствия по конкретному навыку"""
        if not current_level:
            return 0.0
        
        level_scores = {
            'novice': 1,
            'beginner': 2,
            'intermediate': 3,
            'advanced': 4,
            'expert': 5
        }
        
        current_score = level_scores.get(current_level, 0)
        required_score = level_scores.get(required_level, 1)
        
        if current_score >= required_score:
            # Превышает требования
            return 1.0
        else:
            # Не дотягивает до требований
            return current_score / required_score
    
    def _calculate_gap_severity(
        self,
        current_level: Optional[str],
        required_level: str,
        requirements: Dict[str, Any]
    ) -> str:
        """Расчет серьезности пробела в навыке"""
        if not current_level:
            if requirements.get('is_critical', False):
                return 'critical'
            elif required_level in ['advanced', 'expert']:
                return 'high'
            else:
                return 'medium'
        
        level_order = {
            'novice': 0,
            'beginner': 1,
            'intermediate': 2,
            'advanced': 3,
            'expert': 4
        }
        
        current_score = level_order.get(current_level, 0)
        required_score = level_order.get(required_level, 0)
        gap = required_score - current_score
        
        if gap <= 0:
            return 'none'
        elif gap == 1:
            return 'low'
        elif gap == 2:
            return 'medium'
        else:
            return 'high' if not requirements.get('is_critical') else 'critical'
    
    def _determine_match_type(self, total_score: float) -> MatchType:
        """Определение типа матчинга по общей оценке"""
        if total_score >= self.match_thresholds[MatchType.EXACT]:
            return MatchType.EXACT
        elif total_score >= self.match_thresholds[MatchType.PARTIAL]:
            return MatchType.PARTIAL
        elif total_score >= self.match_thresholds[MatchType.POTENTIAL]:
            return MatchType.POTENTIAL
        else:
            return MatchType.STRETCH
    
    def _analyze_strengths_and_concerns(
        self,
        skill_matches: List[SkillMatch],
        skill_gaps: List[SkillGap],
        employee: Employee,
        vacancy: Vacancy
    ) -> Tuple[List[str], List[str]]:
        """Анализ сильных сторон и проблем"""
        strengths = []
        concerns = []
        
        # Анализируем сильные стороны
        strong_skills = [
            match for match in skill_matches
            if match.match_score >= 0.9
        ]
        if strong_skills:
            strengths.append(
                f"Отличное владение ключевыми навыками: {', '.join([s.skill_name for s in strong_skills[:3]])}"
            )
        
        if employee.experience_years and employee.experience_years > (vacancy.min_experience_years or 0):
            strengths.append(f"Богатый опыт работы ({employee.experience_years} лет)")
        
        if employee.department == vacancy.department:
            strengths.append("Знание специфики подразделения")
        
        # Анализируем проблемы
        critical_gaps = [gap for gap in skill_gaps if gap.gap_severity == 'critical']
        if critical_gaps:
            concerns.append(
                f"Критические пробелы в навыках: {', '.join([g.skill_name for g in critical_gaps[:2]])}"
            )
        
        high_gaps = [gap for gap in skill_gaps if gap.gap_severity == 'high']
        if high_gaps:
            concerns.append(
                f"Значительные пробелы: {', '.join([g.skill_name for g in high_gaps[:2]])}"
            )
        
        if employee.experience_years and employee.experience_years < (vacancy.min_experience_years or 0):
            concerns.append("Недостаточный опыт работы")
        
        return strengths, concerns
    
    async def _generate_match_explanation(
        self,
        employee: Employee,
        vacancy: Vacancy,
        total_score: float,
        skill_gaps: List[SkillGap],
        strengths: List[str],
        concerns: List[str]
    ) -> str:
        """Генерация объяснения матчинга"""
        try:
            # Подготавливаем данные для AI
            employee_profile = {
                'name': employee.full_name,
                'position': employee.current_role,
                'department': employee.department,
                'experience_years': employee.experience_years,
                'skills': employee.skills or {}
            }
            
            job_requirements = {
                'title': vacancy.title,
                'department': vacancy.department,
                'min_experience': vacancy.min_experience_years,
                'required_skills': vacancy.role.skills_required if vacancy.role else {}
            }
            
            skill_gaps_data = [
                {
                    'skill_name': gap.skill_name,
                    'required_level': gap.required_level.value,
                    'current_level': gap.current_level.value if gap.current_level else None,
                    'severity': gap.gap_severity
                }
                for gap in skill_gaps
            ]
            
            explanation = await self.ai_service.explain_match(
                employee_profile=employee_profile,
                job_requirements=job_requirements,
                match_score=total_score,
                skill_gaps=skill_gaps_data
            )
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating match explanation: {e}")
            return f"Соответствие: {total_score:.1%}. Кандидат {'подходит' if total_score >= 0.7 else 'частично подходит'} для данной позиции."
    
    def _calculate_confidence(
        self,
        skill_matches: List[SkillMatch],
        employee: Employee,
        vacancy: Vacancy
    ) -> float:
        """Расчет уверенности в оценке матчинга"""
        confidence_factors = []
        
        # Полнота данных о навыках
        if skill_matches:
            skills_with_data = len([m for m in skill_matches if m.current_level])
            total_skills = len(skill_matches)
            data_completeness = skills_with_data / total_skills
            confidence_factors.append(data_completeness)
        
        # Полнота профиля сотрудника
        profile_completeness = 0.0
        if employee.full_name:
            profile_completeness += 0.2
        if employee.current_role:
            profile_completeness += 0.2
        if employee.experience_years:
            profile_completeness += 0.2
        if employee.skills:
            profile_completeness += 0.2
        if employee.department:
            profile_completeness += 0.2
        
        confidence_factors.append(profile_completeness)
        
        # Качество данных о вакансии
        vacancy_completeness = 0.5  # Базовая оценка
        if vacancy.role and vacancy.role.skills_required:
            vacancy_completeness += 0.3
        if vacancy.min_experience_years:
            vacancy_completeness += 0.2
        
        confidence_factors.append(vacancy_completeness)
        
        # Общая уверенность
        return sum(confidence_factors) / len(confidence_factors) if confidence_factors else 0.5
    
    def _generate_recommendation(
        self,
        match_type: MatchType,
        total_score: float,
        skill_gaps: List[SkillGap]
    ) -> str:
        """Генерация рекомендации по кандидату"""
        if match_type == MatchType.EXACT:
            return "Рекомендуется к рассмотрению - отличное соответствие"
        elif match_type == MatchType.PARTIAL:
            return "Рекомендуется к рассмотрению - хорошее соответствие"
        elif match_type == MatchType.POTENTIAL:
            critical_gaps = [g for g in skill_gaps if g.gap_severity == 'critical']
            if critical_gaps:
                return "Рассмотреть после устранения критических пробелов"
            else:
                return "Потенциальный кандидат - требует развития навыков"
        else:
            return "Не рекомендуется - значительные пробелы в требованиях"
    
    def _get_employee_availability(self, employee: Employee) -> Optional[str]:
        """Определение доступности сотрудника"""
        if not employee.mobility_ready:
            return "Не готов к переходу"
        
        # Упрощенная логика - в реальности здесь будет анализ
        # текущей загрузки, проектов, планов и т.д.
        return "Доступен"
    
    async def _save_match_result(
        self,
        session: AsyncSession,
        match_result: MatchResult
    ) -> None:
        """Сохранение результата матчинга в БД"""
        try:
            # Проверяем, есть ли уже запись
            existing_query = select(Match).where(
                and_(
                    Match.employee_id == match_result.employee_id,
                    Match.vacancy_id == match_result.vacancy_id
                )
            )
            result = await session.execute(existing_query)
            existing_match = result.scalar_one_or_none()
            
            # Подготавливаем данные для сохранения
            gaps_data = [
                {
                    'skill_id': str(gap.skill_id),
                    'skill_name': gap.skill_name,
                    'required_level': gap.required_level.value,
                    'current_level': gap.current_level.value if gap.current_level else None,
                    'gap_severity': gap.gap_severity
                }
                for gap in match_result.skill_gaps
            ]
            
            if existing_match:
                # Обновляем существующую запись
                existing_match.score_total = match_result.total_score
                existing_match.score_hard = match_result.hard_skills_score
                existing_match.score_soft = match_result.soft_skills_score
                existing_match.gaps = gaps_data
                existing_match.explanation = match_result.explanation
                existing_match.updated_at = datetime.utcnow()
            else:
                # Создаем новую запись
                new_match = Match(
                    employee_id=match_result.employee_id,
                    vacancy_id=match_result.vacancy_id,
                    score_total=match_result.total_score,
                    score_hard=match_result.hard_skills_score,
                    score_soft=match_result.soft_skills_score,
                    gaps=gaps_data,
                    explanation=match_result.explanation
                )
                session.add(new_match)
            
            await session.commit()
            
        except Exception as e:
            logger.error(f"Error saving match result: {e}")
            await session.rollback()


# Глобальный экземпляр сервиса
matching_service = MatchingService()