"""
PathFinder SkillGraph Service
Сервис для работы с таксономией навыков, семантическим поиском и связями между навыками
"""

import asyncio
import logging
from typing import List, Dict, Optional, Tuple, Any
from uuid import UUID, uuid4
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

import numpy as np
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database.models import SkillGraph, SkillRelationship, Employee, Role
from ..core.database import get_db_session
from ..core.config import settings
from .ai_service import AIService
from .vector_service import VectorService

logger = logging.getLogger(__name__)


class SkillCategory(str, Enum):
    """Категории навыков"""
    TECHNICAL = "technical"
    SOFT_SKILLS = "soft_skills"
    LANGUAGE = "language"
    CERTIFICATION = "certification"
    DOMAIN_KNOWLEDGE = "domain_knowledge"
    TOOL = "tool"
    FRAMEWORK = "framework"
    METHODOLOGY = "methodology"


class SkillLevel(str, Enum):
    """Уровни владения навыками"""
    NOVICE = "novice"          # 0-1 год
    BEGINNER = "beginner"      # 1-2 года
    INTERMEDIATE = "intermediate"  # 2-5 лет
    ADVANCED = "advanced"      # 5+ лет
    EXPERT = "expert"          # 7+ лет, может обучать других


class RelationshipType(str, Enum):
    """Типы связей между навыками"""
    PREREQUISITE = "prerequisite"  # предварительное требование
    COMPLEMENT = "complement"      # дополняющий навык
    ALTERNATIVE = "alternative"    # альтернативный навык
    UPGRADE = "upgrade"           # улучшенная версия


@dataclass
class SkillSearchResult:
    """Результат поиска навыка"""
    skill_id: UUID
    name: str
    category: SkillCategory
    similarity: float
    description: Optional[str] = None
    popularity_score: Optional[float] = None
    market_demand: Optional[float] = None


@dataclass
class SkillGap:
    """Пробел в навыках"""
    skill_id: UUID
    skill_name: str
    required_level: SkillLevel
    current_level: Optional[SkillLevel]
    gap_severity: str  # low, medium, high, critical
    recommended_courses: List[UUID] = None


@dataclass
class SkillRecommendation:
    """Рекомендация по развитию навыка"""
    skill_id: UUID
    skill_name: str
    reason: str
    priority: int  # 1-5
    learning_path: List[Dict[str, Any]]
    estimated_time_weeks: int


class SkillGraphService:
    """Сервис для работы с графом навыков"""
    
    def __init__(self):
        self.ai_service = AIService()
        self.vector_service = VectorService()
        self._skill_cache = {}
        self._relationship_cache = {}
    
    async def search_skills_semantic(
        self,
        query: str,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        categories: Optional[List[SkillCategory]] = None
    ) -> List[SkillSearchResult]:
        """
        Семантический поиск навыков по запросу
        
        Args:
            query: Поисковый запрос
            limit: Максимальное количество результатов
            similarity_threshold: Минимальный порог схожести
            categories: Фильтр по категориям навыков
            
        Returns:
            Список найденных навыков с оценкой схожести
        """
        try:
            # Получаем эмбеддинг для запроса
            query_embedding = await self.ai_service.get_embedding(query)
            
            async with get_db_session() as session:
                # Базовый запрос
                query_stmt = select(SkillGraph).where(
                    SkillGraph.is_active == True
                )
                
                # Фильтр по категориям
                if categories:
                    query_stmt = query_stmt.where(
                        SkillGraph.category.in_([cat.value for cat in categories])
                    )
                
                # Выполняем векторный поиск
                # Используем cosine similarity через pgvector
                similarity_expr = text(
                    "1 - (embedding <=> :query_embedding)"
                ).bindparam(query_embedding=str(query_embedding))
                
                query_stmt = query_stmt.add_columns(
                    similarity_expr.label('similarity')
                ).where(
                    similarity_expr >= similarity_threshold
                ).order_by(
                    text("embedding <=> :query_embedding")
                ).limit(limit)
                
                result = await session.execute(query_stmt)
                rows = result.fetchall()
                
                # Формируем результаты
                search_results = []
                for row in rows:
                    skill = row[0]  # SkillGraph object
                    similarity = float(row[1])  # similarity score
                    
                    search_results.append(SkillSearchResult(
                        skill_id=skill.id,
                        name=skill.name,
                        category=SkillCategory(skill.category),
                        similarity=similarity,
                        description=skill.description,
                        popularity_score=skill.popularity_score,
                        market_demand=skill.market_demand
                    ))
                
                logger.info(f"Found {len(search_results)} skills for query: {query}")
                return search_results
                
        except Exception as e:
            logger.error(f"Error in semantic skill search: {e}")
            return []
    
    async def get_skill_relationships(
        self,
        skill_id: UUID,
        relationship_types: Optional[List[RelationshipType]] = None,
        include_reverse: bool = True
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Получить связи навыка с другими навыками
        
        Args:
            skill_id: ID навыка
            relationship_types: Типы связей для фильтрации
            include_reverse: Включать обратные связи
            
        Returns:
            Словарь связей по типам
        """
        try:
            async with get_db_session() as session:
                relationships = {}
                
                # Прямые связи (где skill_id является источником)
                query = select(SkillRelationship).options(
                    selectinload(SkillRelationship.to_skill)
                ).where(SkillRelationship.from_skill_id == skill_id)
                
                if relationship_types:
                    query = query.where(
                        SkillRelationship.relationship_type.in_(
                            [rt.value for rt in relationship_types]
                        )
                    )
                
                result = await session.execute(query)
                direct_relations = result.scalars().all()
                
                # Обратные связи (где skill_id является целью)
                reverse_relations = []
                if include_reverse:
                    reverse_query = select(SkillRelationship).options(
                        selectinload(SkillRelationship.from_skill)
                    ).where(SkillRelationship.to_skill_id == skill_id)
                    
                    if relationship_types:
                        reverse_query = reverse_query.where(
                            SkillRelationship.relationship_type.in_(
                                [rt.value for rt in relationship_types]
                            )
                        )
                    
                    result = await session.execute(reverse_query)
                    reverse_relations = result.scalars().all()
                
                # Группируем по типам связей
                for relation in direct_relations:
                    rel_type = relation.relationship_type
                    if rel_type not in relationships:
                        relationships[rel_type] = []
                    
                    relationships[rel_type].append({
                        'skill_id': relation.to_skill_id,
                        'skill_name': relation.to_skill.name if relation.to_skill else None,
                        'strength': float(relation.strength),
                        'direction': 'outgoing'
                    })
                
                for relation in reverse_relations:
                    rel_type = f"{relation.relationship_type}_reverse"
                    if rel_type not in relationships:
                        relationships[rel_type] = []
                    
                    relationships[rel_type].append({
                        'skill_id': relation.from_skill_id,
                        'skill_name': relation.from_skill.name if relation.from_skill else None,
                        'strength': float(relation.strength),
                        'direction': 'incoming'
                    })
                
                return relationships
                
        except Exception as e:
            logger.error(f"Error getting skill relationships: {e}")
            return {}
    
    async def analyze_skill_gaps(
        self,
        employee_skills: Dict[UUID, Dict[str, Any]],
        required_skills: Dict[UUID, Dict[str, Any]]
    ) -> List[SkillGap]:
        """
        Анализ пробелов в навыках сотрудника
        
        Args:
            employee_skills: Навыки сотрудника {skill_id: {level, experience_years, ...}}
            required_skills: Требуемые навыки {skill_id: {min_level, weight, is_critical}}
            
        Returns:
            Список пробелов в навыках
        """
        try:
            gaps = []
            
            async with get_db_session() as session:
                for skill_id, requirements in required_skills.items():
                    # Получаем информацию о навыке
                    skill_query = select(SkillGraph).where(SkillGraph.id == skill_id)
                    result = await session.execute(skill_query)
                    skill = result.scalar_one_or_none()
                    
                    if not skill:
                        continue
                    
                    current_skill = employee_skills.get(skill_id)
                    required_level = SkillLevel(requirements.get('min_level', 'novice'))
                    current_level = None
                    
                    if current_skill:
                        current_level = SkillLevel(current_skill.get('level', 'novice'))
                    
                    # Определяем серьезность пробела
                    gap_severity = self._calculate_gap_severity(
                        current_level, required_level, requirements
                    )
                    
                    if gap_severity != 'none':
                        gaps.append(SkillGap(
                            skill_id=skill_id,
                            skill_name=skill.name,
                            required_level=required_level,
                            current_level=current_level,
                            gap_severity=gap_severity
                        ))
            
            # Сортируем по серьезности пробела
            severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
            gaps.sort(key=lambda x: severity_order.get(x.gap_severity, 4))
            
            return gaps
            
        except Exception as e:
            logger.error(f"Error analyzing skill gaps: {e}")
            return []
    
    async def recommend_skill_development(
        self,
        employee_id: UUID,
        target_role_id: Optional[UUID] = None,
        career_goals: Optional[List[str]] = None
    ) -> List[SkillRecommendation]:
        """
        Рекомендации по развитию навыков для сотрудника
        
        Args:
            employee_id: ID сотрудника
            target_role_id: ID целевой роли (опционально)
            career_goals: Карьерные цели (опционально)
            
        Returns:
            Список рекомендаций по развитию навыков
        """
        try:
            recommendations = []
            
            async with get_db_session() as session:
                # Получаем данные сотрудника
                employee_query = select(Employee).where(Employee.id == employee_id)
                result = await session.execute(employee_query)
                employee = result.scalar_one_or_none()
                
                if not employee:
                    return recommendations
                
                employee_skills = employee.skills or {}
                
                # Если указана целевая роль, анализируем требования
                if target_role_id:
                    role_query = select(Role).where(Role.id == target_role_id)
                    result = await session.execute(role_query)
                    target_role = result.scalar_one_or_none()
                    
                    if target_role and target_role.skills_required:
                        # Анализируем пробелы для целевой роли
                        gaps = await self.analyze_skill_gaps(
                            employee_skills, target_role.skills_required
                        )
                        
                        for gap in gaps[:5]:  # Топ-5 пробелов
                            learning_path = await self._generate_learning_path(gap.skill_id)
                            
                            recommendations.append(SkillRecommendation(
                                skill_id=gap.skill_id,
                                skill_name=gap.skill_name,
                                reason=f"Требуется для роли {target_role.title}",
                                priority=self._gap_to_priority(gap.gap_severity),
                                learning_path=learning_path,
                                estimated_time_weeks=self._estimate_learning_time(
                                    gap.current_level, gap.required_level
                                )
                            ))
                
                # Рекомендации на основе трендов и популярности
                trending_skills = await self._get_trending_skills(
                    employee.department, limit=3
                )
                
                for skill in trending_skills:
                    if skill['skill_id'] not in employee_skills:
                        learning_path = await self._generate_learning_path(skill['skill_id'])
                        
                        recommendations.append(SkillRecommendation(
                            skill_id=skill['skill_id'],
                            skill_name=skill['skill_name'],
                            reason=f"Трендовый навык в {employee.department}",
                            priority=3,
                            learning_path=learning_path,
                            estimated_time_weeks=8
                        ))
                
                # Сортируем по приоритету
                recommendations.sort(key=lambda x: x.priority)
                
                return recommendations[:10]  # Топ-10 рекомендаций
                
        except Exception as e:
            logger.error(f"Error generating skill recommendations: {e}")
            return []
    
    async def create_skill(
        self,
        name: str,
        category: SkillCategory,
        description: Optional[str] = None,
        parent_skill_id: Optional[UUID] = None
    ) -> Optional[UUID]:
        """
        Создание нового навыка в графе
        
        Args:
            name: Название навыка
            category: Категория навыка
            description: Описание навыка
            parent_skill_id: ID родительского навыка
            
        Returns:
            ID созданного навыка или None при ошибке
        """
        try:
            async with get_db_session() as session:
                # Проверяем, что навык не существует
                existing_query = select(SkillGraph).where(
                    func.lower(SkillGraph.name) == name.lower()
                )
                result = await session.execute(existing_query)
                existing_skill = result.scalar_one_or_none()
                
                if existing_skill:
                    logger.warning(f"Skill '{name}' already exists")
                    return existing_skill.id
                
                # Генерируем эмбеддинг для навыка
                embedding_text = f"{name} {description or ''} {category.value}"
                embedding = await self.ai_service.get_embedding(embedding_text)
                
                # Определяем уровень в иерархии
                level = 1
                skill_path = name
                
                if parent_skill_id:
                    parent_query = select(SkillGraph).where(SkillGraph.id == parent_skill_id)
                    result = await session.execute(parent_query)
                    parent_skill = result.scalar_one_or_none()
                    
                    if parent_skill:
                        level = parent_skill.level + 1
                        skill_path = f"{parent_skill.skill_path} > {name}"
                
                # Создаем новый навык
                new_skill = SkillGraph(
                    id=uuid4(),
                    name=name,
                    category=category.value,
                    description=description,
                    parent_skill_id=parent_skill_id,
                    skill_path=skill_path,
                    level=level,
                    embedding=embedding,
                    popularity_score=0.0,
                    market_demand=0.0,
                    is_active=True
                )
                
                session.add(new_skill)
                await session.commit()
                
                logger.info(f"Created new skill: {name} (ID: {new_skill.id})")
                return new_skill.id
                
        except Exception as e:
            logger.error(f"Error creating skill: {e}")
            return None
    
    async def add_skill_relationship(
        self,
        from_skill_id: UUID,
        to_skill_id: UUID,
        relationship_type: RelationshipType,
        strength: float = 1.0
    ) -> bool:
        """
        Добавление связи между навыками
        
        Args:
            from_skill_id: ID исходного навыка
            to_skill_id: ID целевого навыка
            relationship_type: Тип связи
            strength: Сила связи (0.0-1.0)
            
        Returns:
            True если связь создана успешно
        """
        try:
            async with get_db_session() as session:
                # Проверяем, что связь не существует
                existing_query = select(SkillRelationship).where(
                    and_(
                        SkillRelationship.from_skill_id == from_skill_id,
                        SkillRelationship.to_skill_id == to_skill_id,
                        SkillRelationship.relationship_type == relationship_type.value
                    )
                )
                result = await session.execute(existing_query)
                existing_relation = result.scalar_one_or_none()
                
                if existing_relation:
                    # Обновляем силу связи
                    existing_relation.strength = strength
                else:
                    # Создаем новую связь
                    new_relation = SkillRelationship(
                        id=uuid4(),
                        from_skill_id=from_skill_id,
                        to_skill_id=to_skill_id,
                        relationship_type=relationship_type.value,
                        strength=strength
                    )
                    session.add(new_relation)
                
                await session.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error adding skill relationship: {e}")
            return False
    
    def _calculate_gap_severity(
        self,
        current_level: Optional[SkillLevel],
        required_level: SkillLevel,
        requirements: Dict[str, Any]
    ) -> str:
        """Расчет серьезности пробела в навыке"""
        if not current_level:
            # Навык отсутствует
            if requirements.get('is_critical', False):
                return 'critical'
            elif required_level in [SkillLevel.ADVANCED, SkillLevel.EXPERT]:
                return 'high'
            else:
                return 'medium'
        
        # Сравниваем уровни
        level_order = {
            SkillLevel.NOVICE: 0,
            SkillLevel.BEGINNER: 1,
            SkillLevel.INTERMEDIATE: 2,
            SkillLevel.ADVANCED: 3,
            SkillLevel.EXPERT: 4
        }
        
        current_score = level_order[current_level]
        required_score = level_order[required_level]
        gap = required_score - current_score
        
        if gap <= 0:
            return 'none'
        elif gap == 1:
            return 'low'
        elif gap == 2:
            return 'medium'
        else:
            return 'high' if not requirements.get('is_critical') else 'critical'
    
    def _gap_to_priority(self, gap_severity: str) -> int:
        """Конвертация серьезности пробела в приоритет"""
        severity_to_priority = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4,
            'none': 5
        }
        return severity_to_priority.get(gap_severity, 5)
    
    def _estimate_learning_time(
        self,
        current_level: Optional[SkillLevel],
        target_level: SkillLevel
    ) -> int:
        """Оценка времени обучения в неделях"""
        if not current_level:
            current_level = SkillLevel.NOVICE
        
        level_weeks = {
            SkillLevel.NOVICE: 0,
            SkillLevel.BEGINNER: 4,
            SkillLevel.INTERMEDIATE: 12,
            SkillLevel.ADVANCED: 24,
            SkillLevel.EXPERT: 48
        }
        
        current_weeks = level_weeks[current_level]
        target_weeks = level_weeks[target_level]
        
        return max(2, target_weeks - current_weeks)
    
    async def _generate_learning_path(self, skill_id: UUID) -> List[Dict[str, Any]]:
        """Генерация пути обучения для навыка"""
        # Упрощенная версия - в реальности здесь будет более сложная логика
        return [
            {
                'type': 'course',
                'title': 'Базовый курс',
                'duration_weeks': 4,
                'provider': 'Internal'
            },
            {
                'type': 'practice',
                'title': 'Практические задания',
                'duration_weeks': 2,
                'provider': 'Self-study'
            }
        ]
    
    async def _get_trending_skills(
        self,
        department: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Получение трендовых навыков для подразделения"""
        try:
            async with get_db_session() as session:
                # Упрощенный запрос - в реальности здесь будет анализ трендов
                query = select(SkillGraph).where(
                    and_(
                        SkillGraph.is_active == True,
                        SkillGraph.market_demand > 7.0
                    )
                ).order_by(SkillGraph.market_demand.desc()).limit(limit)
                
                result = await session.execute(query)
                skills = result.scalars().all()
                
                return [
                    {
                        'skill_id': skill.id,
                        'skill_name': skill.name,
                        'market_demand': skill.market_demand
                    }
                    for skill in skills
                ]
                
        except Exception as e:
            logger.error(f"Error getting trending skills: {e}")
            return []


# Глобальный экземпляр сервиса
skill_graph_service = SkillGraphService()