"""
PathFinder Gamification Service
Сервис геймификации с XP, бейджами, квестами, Career Quests и Mystery Match
"""

import asyncio
import logging
import random
from typing import List, Dict, Optional, Any, Set
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import select, and_, or_, func, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database.models import Employee, Gamification, Quest, Achievement, Course
from ..core.database import get_db_session
from ..core.config import settings

logger = logging.getLogger(__name__)


class QuestType(str, Enum):
    """Типы квестов"""
    PROFILE_COMPLETION = "profile_completion"    # Заполнение профиля
    SKILL_DEVELOPMENT = "skill_development"      # Развитие навыков
    PEER_ENDORSEMENT = "peer_endorsement"        # Подтверждение навыков коллегами
    COURSE_COMPLETION = "course_completion"      # Прохождение курсов
    NETWORKING = "networking"                    # Нетворкинг
    MENTORING = "mentoring"                      # Менторство
    INNOVATION = "innovation"                    # Инновационные проекты
    LEADERSHIP = "leadership"                    # Лидерские активности


class QuestStatus(str, Enum):
    """Статусы квестов"""
    AVAILABLE = "available"      # Доступен для выполнения
    IN_PROGRESS = "in_progress"  # В процессе выполнения
    COMPLETED = "completed"      # Завершен
    EXPIRED = "expired"          # Истек
    LOCKED = "locked"           # Заблокирован


class BadgeType(str, Enum):
    """Типы бейджей"""
    SKILL_MASTER = "skill_master"           # Мастер навыка
    PROFILE_COMPLETE = "profile_complete"   # Полный профиль
    TEAM_PLAYER = "team_player"            # Командный игрок
    MENTOR = "mentor"                      # Ментор
    INNOVATOR = "innovator"                # Инноватор
    LEADER = "leader"                      # Лидер
    LEARNER = "learner"                    # Ученик
    NETWORKER = "networker"                # Сетевик
    ACHIEVER = "achiever"                  # Достигатор


class XPSource(str, Enum):
    """Источники XP"""
    PROFILE_UPDATE = "profile_update"       # Обновление профиля
    SKILL_ADD = "skill_add"                # Добавление навыка
    SKILL_ENDORSE = "skill_endorse"        # Подтверждение навыка
    COURSE_COMPLETE = "course_complete"    # Завершение курса
    QUEST_COMPLETE = "quest_complete"      # Завершение квеста
    PEER_REVIEW = "peer_review"           # Отзыв коллеги
    MATCH_SUCCESS = "match_success"        # Успешный матчинг
    DAILY_LOGIN = "daily_login"           # Ежедневный вход
    REFERRAL = "referral"                 # Реферал


@dataclass
class QuestDefinition:
    """Определение квеста"""
    id: str
    title: str
    description: str
    quest_type: QuestType
    xp_reward: int
    badge_reward: Optional[BadgeType]
    requirements: Dict[str, Any]
    duration_days: int
    max_attempts: int
    prerequisites: List[str]
    difficulty: str  # easy, medium, hard


@dataclass
class BadgeDefinition:
    """Определение бейджа"""
    id: str
    name: str
    description: str
    badge_type: BadgeType
    icon: str
    rarity: str  # common, rare, epic, legendary
    requirements: Dict[str, Any]


@dataclass
class XPTransaction:
    """Транзакция XP"""
    employee_id: UUID
    source: XPSource
    amount: int
    description: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class LevelInfo:
    """Информация об уровне"""
    level: int
    current_xp: int
    xp_for_current_level: int
    xp_for_next_level: int
    progress_percentage: float
    level_name: str


class GamificationService:
    """Сервис геймификации"""
    
    def __init__(self):
        # XP за различные действия
        self.xp_rewards = {
            XPSource.PROFILE_UPDATE: 10,
            XPSource.SKILL_ADD: 15,
            XPSource.SKILL_ENDORSE: 5,
            XPSource.COURSE_COMPLETE: 50,
            XPSource.QUEST_COMPLETE: 100,
            XPSource.PEER_REVIEW: 20,
            XPSource.MATCH_SUCCESS: 25,
            XPSource.DAILY_LOGIN: 5,
            XPSource.REFERRAL: 30
        }
        
        # Уровни и требования XP
        self.level_thresholds = [
            0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000,
            13000, 16500, 20500, 25000, 30000, 35500, 41500, 48000, 55000, 62500
        ]
        
        self.level_names = [
            "Новичок", "Стажер", "Исследователь", "Практик", "Специалист",
            "Эксперт", "Профессионал", "Мастер", "Наставник", "Лидер",
            "Визионер", "Инноватор", "Гуру", "Легенда", "Мудрец",
            "Архитектор", "Стратег", "Пионер", "Титан", "Феникс", "Мифический"
        ]
        
        # Определения квестов
        self.quest_definitions = self._initialize_quest_definitions()
        
        # Определения бейджей
        self.badge_definitions = self._initialize_badge_definitions()
        
        # Лимиты для предотвращения спама
        self.daily_limits = {
            XPSource.PROFILE_UPDATE: 3,
            XPSource.SKILL_ADD: 5,
            XPSource.SKILL_ENDORSE: 10,
            XPSource.DAILY_LOGIN: 1
        }
    
    async def get_employee_gamification(self, employee_id: UUID) -> Dict[str, Any]:
        """
        Получение данных геймификации сотрудника
        
        Args:
            employee_id: ID сотрудника
            
        Returns:
            Данные геймификации
        """
        try:
            async with get_db_session() as session:
                # Получаем данные геймификации
                gamification_query = select(Gamification).where(
                    Gamification.employee_id == employee_id
                )
                result = await session.execute(gamification_query)
                gamification = result.scalar_one_or_none()
                
                if not gamification:
                    # Создаем новую запись геймификации
                    gamification = await self._create_gamification_record(
                        session, employee_id
                    )
                
                # Рассчитываем информацию об уровне
                level_info = self._calculate_level_info(gamification.xp)
                
                # Получаем активные квесты
                active_quests = await self._get_active_quests(session, employee_id)
                
                # Получаем доступные квесты
                available_quests = await self._get_available_quests(session, employee_id)
                
                # Получаем достижения
                achievements = await self._get_achievements(session, employee_id)
                
                # Получаем Mystery Match информацию
                mystery_match_info = await self._get_mystery_match_info(session, employee_id)
                
                return {
                    'employee_id': employee_id,
                    'xp': gamification.xp,
                    'level': level_info.level,
                    'level_name': level_info.level_name,
                    'level_progress': level_info.progress_percentage,
                    'xp_for_next_level': level_info.xp_for_next_level - level_info.current_xp,
                    'badges': gamification.badges or [],
                    'active_quests': active_quests,
                    'available_quests': available_quests,
                    'achievements': achievements,
                    'mystery_match': mystery_match_info,
                    'daily_limits': await self._get_daily_limits_status(session, employee_id),
                    'streak_days': gamification.streak_days or 0,
                    'last_activity': gamification.last_activity
                }
                
        except Exception as e:
            logger.error(f"Error getting employee gamification: {e}")
            return {}
    
    async def award_xp(
        self,
        employee_id: UUID,
        source: XPSource,
        custom_amount: Optional[int] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Начисление XP сотруднику
        
        Args:
            employee_id: ID сотрудника
            source: Источник XP
            custom_amount: Кастомное количество XP
            description: Описание
            metadata: Дополнительные данные
            
        Returns:
            Результат начисления XP
        """
        try:
            async with get_db_session() as session:
                # Проверяем дневные лимиты
                if not await self._check_daily_limit(session, employee_id, source):
                    return {
                        'success': False,
                        'reason': 'daily_limit_exceeded',
                        'xp_awarded': 0
                    }
                
                # Определяем количество XP
                xp_amount = custom_amount or self.xp_rewards.get(source, 0)
                
                if xp_amount <= 0:
                    return {
                        'success': False,
                        'reason': 'invalid_xp_amount',
                        'xp_awarded': 0
                    }
                
                # Получаем текущие данные геймификации
                gamification_query = select(Gamification).where(
                    Gamification.employee_id == employee_id
                )
                result = await session.execute(gamification_query)
                gamification = result.scalar_one_or_none()
                
                if not gamification:
                    gamification = await self._create_gamification_record(
                        session, employee_id
                    )
                
                # Сохраняем старый уровень
                old_level = self._calculate_level_info(gamification.xp).level
                
                # Начисляем XP
                gamification.xp += xp_amount
                gamification.last_activity = datetime.utcnow()
                
                # Обновляем стрик
                if source == XPSource.DAILY_LOGIN:
                    await self._update_streak(session, gamification)
                
                # Рассчитываем новый уровень
                new_level_info = self._calculate_level_info(gamification.xp)
                
                # Проверяем повышение уровня
                level_up = new_level_info.level > old_level
                level_rewards = []
                
                if level_up:
                    level_rewards = await self._handle_level_up(
                        session, employee_id, new_level_info.level
                    )
                
                # Записываем транзакцию XP
                await self._record_xp_transaction(
                    session, employee_id, source, xp_amount, 
                    description or f"XP from {source.value}", metadata
                )
                
                # Проверяем новые достижения
                new_achievements = await self._check_achievements(
                    session, employee_id, gamification
                )
                
                await session.commit()
                
                return {
                    'success': True,
                    'xp_awarded': xp_amount,
                    'total_xp': gamification.xp,
                    'old_level': old_level,
                    'new_level': new_level_info.level,
                    'level_up': level_up,
                    'level_rewards': level_rewards,
                    'new_achievements': new_achievements
                }
                
        except Exception as e:
            logger.error(f"Error awarding XP: {e}")
            return {'success': False, 'reason': 'internal_error', 'xp_awarded': 0}
    
    async def start_quest(self, employee_id: UUID, quest_id: str) -> Dict[str, Any]:
        """
        Начало выполнения квеста
        
        Args:
            employee_id: ID сотрудника
            quest_id: ID квеста
            
        Returns:
            Результат начала квеста
        """
        try:
            async with get_db_session() as session:
                # Проверяем, что квест существует
                quest_def = self.quest_definitions.get(quest_id)
                if not quest_def:
                    return {'success': False, 'reason': 'quest_not_found'}
                
                # Проверяем предварительные условия
                if not await self._check_quest_prerequisites(
                    session, employee_id, quest_def
                ):
                    return {'success': False, 'reason': 'prerequisites_not_met'}
                
                # Проверяем, не выполняется ли уже этот квест
                existing_quest_query = select(Quest).where(
                    and_(
                        Quest.employee_id == employee_id,
                        Quest.quest_id == quest_id,
                        Quest.status.in_([QuestStatus.AVAILABLE, QuestStatus.IN_PROGRESS])
                    )
                )
                result = await session.execute(existing_quest_query)
                existing_quest = result.scalar_one_or_none()
                
                if existing_quest:
                    return {'success': False, 'reason': 'quest_already_active'}
                
                # Создаем новый квест
                new_quest = Quest(
                    employee_id=employee_id,
                    quest_id=quest_id,
                    title=quest_def.title,
                    description=quest_def.description,
                    quest_type=quest_def.quest_type.value,
                    xp_reward=quest_def.xp_reward,
                    badge_reward=quest_def.badge_reward.value if quest_def.badge_reward else None,
                    requirements=quest_def.requirements,
                    status=QuestStatus.IN_PROGRESS.value,
                    started_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=quest_def.duration_days),
                    progress={}
                )
                
                session.add(new_quest)
                await session.commit()
                
                return {
                    'success': True,
                    'quest': {
                        'id': new_quest.id,
                        'quest_id': quest_id,
                        'title': quest_def.title,
                        'description': quest_def.description,
                        'xp_reward': quest_def.xp_reward,
                        'expires_at': new_quest.expires_at,
                        'progress': {}
                    }
                }
                
        except Exception as e:
            logger.error(f"Error starting quest: {e}")
            return {'success': False, 'reason': 'internal_error'}
    
    async def update_quest_progress(
        self,
        employee_id: UUID,
        quest_id: str,
        progress_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Обновление прогресса квеста
        
        Args:
            employee_id: ID сотрудника
            quest_id: ID квеста
            progress_data: Данные прогресса
            
        Returns:
            Результат обновления прогресса
        """
        try:
            async with get_db_session() as session:
                # Получаем активный квест
                quest_query = select(Quest).where(
                    and_(
                        Quest.employee_id == employee_id,
                        Quest.quest_id == quest_id,
                        Quest.status == QuestStatus.IN_PROGRESS.value
                    )
                )
                result = await session.execute(quest_query)
                quest = result.scalar_one_or_none()
                
                if not quest:
                    return {'success': False, 'reason': 'quest_not_found'}
                
                # Проверяем, не истек ли квест
                if quest.expires_at and quest.expires_at < datetime.utcnow():
                    quest.status = QuestStatus.EXPIRED.value
                    await session.commit()
                    return {'success': False, 'reason': 'quest_expired'}
                
                # Обновляем прогресс
                current_progress = quest.progress or {}
                current_progress.update(progress_data)
                quest.progress = current_progress
                quest.updated_at = datetime.utcnow()
                
                # Проверяем завершение квеста
                quest_def = self.quest_definitions.get(quest_id)
                if quest_def and self._is_quest_completed(quest_def, current_progress):
                    # Завершаем квест
                    quest.status = QuestStatus.COMPLETED.value
                    quest.completed_at = datetime.utcnow()
                    
                    # Начисляем награды
                    xp_result = await self.award_xp(
                        employee_id, XPSource.QUEST_COMPLETE,
                        custom_amount=quest.xp_reward,
                        description=f"Completed quest: {quest.title}"
                    )
                    
                    # Выдаем бейдж если есть
                    badge_awarded = None
                    if quest.badge_reward:
                        badge_awarded = await self._award_badge(
                            session, employee_id, BadgeType(quest.badge_reward)
                        )
                    
                    await session.commit()
                    
                    return {
                        'success': True,
                        'quest_completed': True,
                        'xp_awarded': xp_result.get('xp_awarded', 0),
                        'badge_awarded': badge_awarded,
                        'progress': current_progress
                    }
                
                await session.commit()
                
                return {
                    'success': True,
                    'quest_completed': False,
                    'progress': current_progress
                }
                
        except Exception as e:
            logger.error(f"Error updating quest progress: {e}")
            return {'success': False, 'reason': 'internal_error'}
    
    async def get_mystery_match_candidates(
        self,
        employee_id: UUID,
        min_completion_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Получение Mystery Match кандидатов
        
        Args:
            employee_id: ID сотрудника
            min_completion_threshold: Минимальный порог заполненности профиля
            
        Returns:
            Информация о Mystery Match
        """
        try:
            async with get_db_session() as session:
                # Получаем данные сотрудника
                employee_query = select(Employee).where(Employee.id == employee_id)
                result = await session.execute(employee_query)
                employee = result.scalar_one_or_none()
                
                if not employee:
                    return {'mystery_matches': 0, 'can_unlock': False}
                
                # Рассчитываем заполненность профиля
                profile_completion = self._calculate_profile_completion(employee)
                
                if profile_completion < min_completion_threshold:
                    # Показываем количество потенциальных матчей, но не даем доступ
                    potential_matches = await self._count_potential_matches(
                        session, employee_id
                    )
                    
                    return {
                        'mystery_matches': potential_matches,
                        'can_unlock': False,
                        'current_completion': profile_completion,
                        'required_completion': min_completion_threshold,
                        'missing_fields': self._get_missing_profile_fields(employee)
                    }
                else:
                    # Показываем реальные матчи
                    matches = await self._get_actual_matches(session, employee_id)
                    
                    return {
                        'mystery_matches': len(matches),
                        'can_unlock': True,
                        'current_completion': profile_completion,
                        'matches': matches
                    }
                
        except Exception as e:
            logger.error(f"Error getting mystery match candidates: {e}")
            return {'mystery_matches': 0, 'can_unlock': False}
    
    async def get_leaderboard(
        self,
        department: Optional[str] = None,
        time_period: str = 'all_time',
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Получение таблицы лидеров
        
        Args:
            department: Фильтр по подразделению
            time_period: Период (week, month, all_time)
            limit: Количество записей
            
        Returns:
            Список лидеров
        """
        try:
            async with get_db_session() as session:
                # Базовый запрос
                query = select(Gamification, Employee).join(
                    Employee, Gamification.employee_id == Employee.id
                ).where(Employee.is_active == True)
                
                # Фильтр по подразделению
                if department:
                    query = query.where(Employee.department == department)
                
                # Фильтр по времени (упрощенная версия)
                if time_period == 'week':
                    week_ago = datetime.utcnow() - timedelta(days=7)
                    query = query.where(Gamification.last_activity >= week_ago)
                elif time_period == 'month':
                    month_ago = datetime.utcnow() - timedelta(days=30)
                    query = query.where(Gamification.last_activity >= month_ago)
                
                # Сортировка и лимит
                query = query.order_by(Gamification.xp.desc()).limit(limit)
                
                result = await session.execute(query)
                records = result.all()
                
                leaderboard = []
                for i, (gamification, employee) in enumerate(records):
                    level_info = self._calculate_level_info(gamification.xp)
                    
                    leaderboard.append({
                        'rank': i + 1,
                        'employee_id': employee.id,
                        'name': employee.full_name or f"Employee {employee.id}",
                        'department': employee.department,
                        'xp': gamification.xp,
                        'level': level_info.level,
                        'level_name': level_info.level_name,
                        'badges_count': len(gamification.badges or []),
                        'streak_days': gamification.streak_days or 0
                    })
                
                return leaderboard
                
        except Exception as e:
            logger.error(f"Error getting leaderboard: {e}")
            return []
    
    def _initialize_quest_definitions(self) -> Dict[str, QuestDefinition]:
        """Инициализация определений квестов"""
        return {
            'complete_profile': QuestDefinition(
                id='complete_profile',
                title='Заполни профиль',
                description='Заполни свой профиль на 100%',
                quest_type=QuestType.PROFILE_COMPLETION,
                xp_reward=100,
                badge_reward=BadgeType.PROFILE_COMPLETE,
                requirements={'profile_completion': 1.0},
                duration_days=7,
                max_attempts=1,
                prerequisites=[],
                difficulty='easy'
            ),
            'skill_endorser': QuestDefinition(
                id='skill_endorser',
                title='Подтверди навыки коллег',
                description='Подтверди навыки 5 коллег',
                quest_type=QuestType.PEER_ENDORSEMENT,
                xp_reward=75,
                badge_reward=BadgeType.TEAM_PLAYER,
                requirements={'endorsements_given': 5},
                duration_days=14,
                max_attempts=1,
                prerequisites=[],
                difficulty='medium'
            ),
            'course_marathon': QuestDefinition(
                id='course_marathon',
                title='Марафон обучения',
                description='Пройди 3 курса за месяц',
                quest_type=QuestType.COURSE_COMPLETION,
                xp_reward=200,
                badge_reward=BadgeType.LEARNER,
                requirements={'courses_completed': 3},
                duration_days=30,
                max_attempts=1,
                prerequisites=['complete_profile'],
                difficulty='hard'
            ),
            'skill_master': QuestDefinition(
                id='skill_master',
                title='Мастер навыка',
                description='Достигни экспертного уровня в любом навыке',
                quest_type=QuestType.SKILL_DEVELOPMENT,
                xp_reward=150,
                badge_reward=BadgeType.SKILL_MASTER,
                requirements={'expert_skills': 1},
                duration_days=60,
                max_attempts=1,
                prerequisites=[],
                difficulty='hard'
            ),
            'networking_ninja': QuestDefinition(
                id='networking_ninja',
                title='Ниндзя нетворкинга',
                description='Установи связи с 10 коллегами из других подразделений',
                quest_type=QuestType.NETWORKING,
                xp_reward=120,
                badge_reward=BadgeType.NETWORKER,
                requirements={'cross_department_connections': 10},
                duration_days=21,
                max_attempts=1,
                prerequisites=[],
                difficulty='medium'
            )
        }
    
    def _initialize_badge_definitions(self) -> Dict[str, BadgeDefinition]:
        """Инициализация определений бейджей"""
        return {
            'profile_complete': BadgeDefinition(
                id='profile_complete',
                name='Полный профиль',
                description='Заполнил профиль на 100%',
                badge_type=BadgeType.PROFILE_COMPLETE,
                icon='👤',
                rarity='common',
                requirements={'profile_completion': 1.0}
            ),
            'skill_master': BadgeDefinition(
                id='skill_master',
                name='Мастер навыка',
                description='Достиг экспертного уровня в навыке',
                badge_type=BadgeType.SKILL_MASTER,
                icon='🎯',
                rarity='rare',
                requirements={'expert_skills': 1}
            ),
            'team_player': BadgeDefinition(
                id='team_player',
                name='Командный игрок',
                description='Активно помогает коллегам',
                badge_type=BadgeType.TEAM_PLAYER,
                icon='🤝',
                rarity='common',
                requirements={'endorsements_given': 5}
            ),
            'learner': BadgeDefinition(
                id='learner',
                name='Ученик',
                description='Прошел множество курсов',
                badge_type=BadgeType.LEARNER,
                icon='📚',
                rarity='common',
                requirements={'courses_completed': 3}
            ),
            'networker': BadgeDefinition(
                id='networker',
                name='Сетевик',
                description='Мастер нетворкинга',
                badge_type=BadgeType.NETWORKER,
                icon='🌐',
                rarity='rare',
                requirements={'cross_department_connections': 10}
            )
        }
    
    def _calculate_level_info(self, xp: int) -> LevelInfo:
        """Расчет информации об уровне"""
        level = 0
        for i, threshold in enumerate(self.level_thresholds):
            if xp >= threshold:
                level = i
            else:
                break
        
        current_level_xp = self.level_thresholds[level] if level < len(self.level_thresholds) else 0
        next_level_xp = self.level_thresholds[level + 1] if level + 1 < len(self.level_thresholds) else current_level_xp + 1000
        
        progress = 0.0
        if next_level_xp > current_level_xp:
            progress = (xp - current_level_xp) / (next_level_xp - current_level_xp) * 100
        
        level_name = self.level_names[level] if level < len(self.level_names) else "Легендарный"
        
        return LevelInfo(
            level=level,
            current_xp=xp,
            xp_for_current_level=current_level_xp,
            xp_for_next_level=next_level_xp,
            progress_percentage=progress,
            level_name=level_name
        )
    
    async def _create_gamification_record(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> Gamification:
        """Создание новой записи геймификации"""
        gamification = Gamification(
            employee_id=employee_id,
            xp=0,
            badges=[],
            streak_days=0,
            last_activity=datetime.utcnow(),
            daily_limits={}
        )
        
        session.add(gamification)
        await session.flush()
        return gamification
    
    async def _get_active_quests(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> List[Dict[str, Any]]:
        """Получение активных квестов"""
        query = select(Quest).where(
            and_(
                Quest.employee_id == employee_id,
                Quest.status == QuestStatus.IN_PROGRESS.value,
                or_(Quest.expires_at.is_(None), Quest.expires_at > datetime.utcnow())
            )
        )
        
        result = await session.execute(query)
        quests = result.scalars().all()
        
        return [
            {
                'id': quest.id,
                'quest_id': quest.quest_id,
                'title': quest.title,
                'description': quest.description,
                'xp_reward': quest.xp_reward,
                'progress': quest.progress or {},
                'started_at': quest.started_at,
                'expires_at': quest.expires_at
            }
            for quest in quests
        ]
    
    async def _get_available_quests(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> List[Dict[str, Any]]:
        """Получение доступных квестов"""
        available_quests = []
        
        for quest_id, quest_def in self.quest_definitions.items():
            # Проверяем, не выполняется ли уже этот квест
            existing_query = select(Quest).where(
                and_(
                    Quest.employee_id == employee_id,
                    Quest.quest_id == quest_id,
                    Quest.status.in_([QuestStatus.IN_PROGRESS.value, QuestStatus.COMPLETED.value])
                )
            )
            result = await session.execute(existing_query)
            existing = result.scalar_one_or_none()
            
            if existing:
                continue
            
            # Проверяем предварительные условия
            if await self._check_quest_prerequisites(session, employee_id, quest_def):
                available_quests.append({
                    'quest_id': quest_id,
                    'title': quest_def.title,
                    'description': quest_def.description,
                    'xp_reward': quest_def.xp_reward,
                    'badge_reward': quest_def.badge_reward.value if quest_def.badge_reward else None,
                    'duration_days': quest_def.duration_days,
                    'difficulty': quest_def.difficulty
                })
        
        return available_quests
    
    async def _get_achievements(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> List[Dict[str, Any]]:
        """Получение достижений"""
        query = select(Achievement).where(Achievement.employee_id == employee_id)
        result = await session.execute(query)
        achievements = result.scalars().all()
        
        return [
            {
                'id': achievement.id,
                'badge_type': achievement.badge_type,
                'name': achievement.name,
                'description': achievement.description,
                'earned_at': achievement.earned_at,
                'rarity': achievement.rarity
            }
            for achievement in achievements
        ]
    
    async def _get_mystery_match_info(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> Dict[str, Any]:
        """Получение информации Mystery Match"""
        return await self.get_mystery_match_candidates(employee_id)
    
    async def _check_daily_limit(
        self,
        session: AsyncSession,
        employee_id: UUID,
        source: XPSource
    ) -> bool:
        """Проверка дневного лимита"""
        if source not in self.daily_limits:
            return True
        
        limit = self.daily_limits[source]
        today = datetime.utcnow().date()
        
        # В реальной системе здесь будет проверка в БД
        # Упрощенная версия всегда возвращает True
        return True
    
    def _calculate_profile_completion(self, employee: Employee) -> float:
        """Расчет заполненности профиля"""
        fields_to_check = [
            'full_name', 'current_role', 'department', 'experience_years',
            'skills', 'education', 'certifications'
        ]
        
        filled_fields = 0
        for field in fields_to_check:
            value = getattr(employee, field, None)
            if value:
                if isinstance(value, (list, dict)) and len(value) > 0:
                    filled_fields += 1
                elif isinstance(value, str) and value.strip():
                    filled_fields += 1
                elif isinstance(value, (int, float)) and value > 0:
                    filled_fields += 1
        
        return filled_fields / len(fields_to_check)
    
    def _get_missing_profile_fields(self, employee: Employee) -> List[str]:
        """Получение списка незаполненных полей профиля"""
        field_names = {
            'full_name': 'Полное имя',
            'current_role': 'Текущая должность',
            'department': 'Подразделение',
            'experience_years': 'Опыт работы',
            'skills': 'Навыки',
            'education': 'Образование',
            'certifications': 'Сертификаты'
        }
        
        missing_fields = []
        for field, name in field_names.items():
            value = getattr(employee, field, None)
            if not value:
                missing_fields.append(name)
            elif isinstance(value, (list, dict)) and len(value) == 0:
                missing_fields.append(name)
            elif isinstance(value, str) and not value.strip():
                missing_fields.append(name)
        
        return missing_fields
    
    async def _count_potential_matches(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> int:
        """Подсчет потенциальных матчей (Mystery Match)"""
        # Упрощенная версия - возвращает случайное число от 3 до 8
        return random.randint(3, 8)
    
    async def _get_actual_matches(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> List[Dict[str, Any]]:
        """Получение реальных матчей"""
        # В реальной системе здесь будет вызов сервиса матчинга
        # Упрощенная версия возвращает пустой список
        return []
    
    async def _check_quest_prerequisites(
        self,
        session: AsyncSession,
        employee_id: UUID,
        quest_def: QuestDefinition
    ) -> bool:
        """Проверка предварительных условий квеста"""
        if not quest_def.prerequisites:
            return True
        
        for prereq_quest_id in quest_def.prerequisites:
            query = select(Quest).where(
                and_(
                    Quest.employee_id == employee_id,
                    Quest.quest_id == prereq_quest_id,
                    Quest.status == QuestStatus.COMPLETED.value
                )
            )
            result = await session.execute(query)
            completed_quest = result.scalar_one_or_none()
            
            if not completed_quest:
                return False
        
        return True
    
    def _is_quest_completed(
        self,
        quest_def: QuestDefinition,
        progress: Dict[str, Any]
    ) -> bool:
        """Проверка завершения квеста"""
        for requirement, target_value in quest_def.requirements.items():
            current_value = progress.get(requirement, 0)
            if current_value < target_value:
                return False
        
        return True
    
    async def _handle_level_up(
        self,
        session: AsyncSession,
        employee_id: UUID,
        new_level: int
    ) -> List[Dict[str, Any]]:
        """Обработка повышения уровня"""
        rewards = []
        
        # Награды за определенные уровни
        level_rewards = {
            5: {'type': 'badge', 'value': BadgeType.ACHIEVER},
            10: {'type': 'xp_bonus', 'value': 100},
            15: {'type': 'badge', 'value': BadgeType.LEADER},
            20: {'type': 'special_access', 'value': 'premium_features'}
        }
        
        if new_level in level_rewards:
            reward = level_rewards[new_level]
            if reward['type'] == 'badge':
                badge = await self._award_badge(session, employee_id, reward['value'])
                if badge:
                    rewards.append({'type': 'badge', 'badge': badge})
            elif reward['type'] == 'xp_bonus':
                rewards.append({'type': 'xp_bonus', 'amount': reward['value']})
        
        return rewards
    
    async def _award_badge(
        self,
        session: AsyncSession,
        employee_id: UUID,
        badge_type: BadgeType
    ) -> Optional[Dict[str, Any]]:
        """Выдача бейджа"""
        try:
            # Проверяем, есть ли уже такой бейдж
            gamification_query = select(Gamification).where(
                Gamification.employee_id == employee_id
            )
            result = await session.execute(gamification_query)
            gamification = result.scalar_one_or_none()
            
            if not gamification:
                return None
            
            current_badges = gamification.badges or []
            if badge_type.value in current_badges:
                return None  # Бейдж уже есть
            
            # Добавляем бейдж
            current_badges.append(badge_type.value)
            gamification.badges = current_badges
            
            # Создаем запись достижения
            badge_def = self.badge_definitions.get(badge_type.value)
            if badge_def:
                achievement = Achievement(
                    employee_id=employee_id,
                    badge_type=badge_type.value,
                    name=badge_def.name,
                    description=badge_def.description,
                    rarity=badge_def.rarity,
                    earned_at=datetime.utcnow()
                )
                session.add(achievement)
            
            return {
                'badge_type': badge_type.value,
                'name': badge_def.name if badge_def else badge_type.value,
                'description': badge_def.description if badge_def else '',
                'icon': badge_def.icon if badge_def else '🏆',
                'rarity': badge_def.rarity if badge_def else 'common'
            }
            
        except Exception as e:
            logger.error(f"Error awarding badge: {e}")
            return None
    
    async def _check_achievements(
        self,
        session: AsyncSession,
        employee_id: UUID,
        gamification: Gamification
    ) -> List[Dict[str, Any]]:
        """Проверка новых достижений"""
        new_achievements = []
        
        # Проверяем достижения по XP
        level_info = self._calculate_level_info(gamification.xp)
        
        # Проверяем достижения по бейджам
        current_badges = set(gamification.badges or [])
        
        for badge_id, badge_def in self.badge_definitions.items():
            if badge_def.badge_type.value not in current_badges:
                # Проверяем требования для бейджа
                if await self._check_badge_requirements(
                    session, employee_id, badge_def, gamification
                ):
                    badge = await self._award_badge(
                        session, employee_id, badge_def.badge_type
                    )
                    if badge:
                        new_achievements.append(badge)
        
        return new_achievements
    
    async def _check_badge_requirements(
        self,
        session: AsyncSession,
        employee_id: UUID,
        badge_def: BadgeDefinition,
        gamification: Gamification
    ) -> bool:
        """Проверка требований для бейджа"""
        # Упрощенная версия - всегда возвращает False
        # В реальной системе здесь будет проверка конкретных требований
        return False
    
    async def _record_xp_transaction(
        self,
        session: AsyncSession,
        employee_id: UUID,
        source: XPSource,
        amount: int,
        description: str,
        metadata: Optional[Dict[str, Any]]
    ) -> None:
        """Запись транзакции XP"""
        # В реальной системе здесь будет создание записи в таблице XP транзакций
        pass
    
    async def _update_streak(
        self,
        session: AsyncSession,
        gamification: Gamification
    ) -> None:
        """Обновление стрика ежедневной активности"""
        today = datetime.utcnow().date()
        last_activity_date = gamification.last_activity.date() if gamification.last_activity else None
        
        if last_activity_date:
            if last_activity_date == today - timedelta(days=1):
                # Продолжаем стрик
                gamification.streak_days = (gamification.streak_days or 0) + 1
            elif last_activity_date != today:
                # Прерываем стрик
                gamification.streak_days = 1
        else:
            # Первый день
            gamification.streak_days = 1
    
    async def _get_daily_limits_status(
        self,
        session: AsyncSession,
        employee_id: UUID
    ) -> Dict[str, Dict[str, int]]:
        """Получение статуса дневных лимитов"""
        # Упрощенная версия
        return {
            source.value: {
                'limit': limit,
                'used': 0,
                'remaining': limit
            }
            for source, limit in self.daily_limits.items()
        }


# Глобальный экземпляр сервиса
gamification_service = GamificationService()