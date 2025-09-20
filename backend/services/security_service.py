"""
PathFinder Security Service
Сервис безопасности с RBAC, аудит-логом, маскировкой данных и управлением доступом
"""

import asyncio
import hashlib
import logging
import secrets
from typing import List, Dict, Optional, Any, Set
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy import select, and_, or_, func, text, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database.models import Employee, AuditLog
from ..core.database import get_db_session
from ..core.config import settings

logger = logging.getLogger(__name__)


class UserRole(str, Enum):
    """Роли пользователей в системе"""
    EMPLOYEE = "employee"           # Обычный сотрудник
    HR_SPECIALIST = "hr_specialist" # HR-специалист
    HR_MANAGER = "hr_manager"       # HR-менеджер
    TEAM_LEAD = "team_lead"         # Руководитель команды
    DEPARTMENT_HEAD = "dept_head"   # Руководитель подразделения
    ADMIN = "admin"                 # Системный администратор
    SUPER_ADMIN = "super_admin"     # Суперадминистратор


class Permission(str, Enum):
    """Разрешения в системе"""
    # Профиль сотрудника
    VIEW_OWN_PROFILE = "view_own_profile"
    EDIT_OWN_PROFILE = "edit_own_profile"
    VIEW_EMPLOYEE_PROFILES = "view_employee_profiles"
    EDIT_EMPLOYEE_PROFILES = "edit_employee_profiles"
    
    # Навыки и оценки
    VIEW_OWN_SKILLS = "view_own_skills"
    EDIT_OWN_SKILLS = "edit_own_skills"
    VIEW_EMPLOYEE_SKILLS = "view_employee_skills"
    EDIT_EMPLOYEE_SKILLS = "edit_employee_skills"
    ENDORSE_SKILLS = "endorse_skills"
    
    # Вакансии и матчинг
    VIEW_VACANCIES = "view_vacancies"
    CREATE_VACANCIES = "create_vacancies"
    EDIT_VACANCIES = "edit_vacancies"
    DELETE_VACANCIES = "delete_vacancies"
    VIEW_MATCHES = "view_matches"
    CREATE_MATCHES = "create_matches"
    
    # Аналитика
    VIEW_BASIC_ANALYTICS = "view_basic_analytics"
    VIEW_DEPARTMENT_ANALYTICS = "view_dept_analytics"
    VIEW_COMPANY_ANALYTICS = "view_company_analytics"
    EXPORT_ANALYTICS = "export_analytics"
    
    # Геймификация
    VIEW_OWN_GAMIFICATION = "view_own_gamification"
    VIEW_EMPLOYEE_GAMIFICATION = "view_employee_gamification"
    MANAGE_GAMIFICATION = "manage_gamification"
    
    # Администрирование
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    VIEW_AUDIT_LOG = "view_audit_log"
    MANAGE_SYSTEM = "manage_system"


class DataSensitivity(str, Enum):
    """Уровни чувствительности данных"""
    PUBLIC = "public"           # Публичные данные
    INTERNAL = "internal"       # Внутренние данные
    CONFIDENTIAL = "confidential"  # Конфиденциальные данные
    RESTRICTED = "restricted"   # Ограниченные данные
    SECRET = "secret"          # Секретные данные


class AuditAction(str, Enum):
    """Типы действий для аудита"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    SEARCH = "search"
    MATCH = "match"
    ENDORSE = "endorse"


@dataclass
class UserContext:
    """Контекст пользователя"""
    user_id: UUID
    employee_id: Optional[UUID]
    roles: List[UserRole]
    permissions: Set[Permission]
    department: Optional[str]
    is_manager: bool
    session_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class AccessRequest:
    """Запрос на доступ к данным"""
    user_context: UserContext
    resource_type: str
    resource_id: Optional[UUID]
    action: str
    data_sensitivity: DataSensitivity
    additional_context: Optional[Dict[str, Any]] = None


@dataclass
class DataMaskingRule:
    """Правило маскировки данных"""
    field_name: str
    sensitivity_level: DataSensitivity
    masking_type: str  # 'partial', 'full', 'hash', 'remove'
    required_permission: Optional[Permission] = None


class SecurityService:
    """Сервис безопасности и управления доступом"""
    
    def __init__(self):
        # Матрица разрешений по ролям
        self.role_permissions = {
            UserRole.EMPLOYEE: {
                Permission.VIEW_OWN_PROFILE,
                Permission.EDIT_OWN_PROFILE,
                Permission.VIEW_OWN_SKILLS,
                Permission.EDIT_OWN_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.VIEW_OWN_GAMIFICATION,
                Permission.ENDORSE_SKILLS
            },
            UserRole.TEAM_LEAD: {
                Permission.VIEW_OWN_PROFILE,
                Permission.EDIT_OWN_PROFILE,
                Permission.VIEW_OWN_SKILLS,
                Permission.EDIT_OWN_SKILLS,
                Permission.VIEW_EMPLOYEE_PROFILES,
                Permission.VIEW_EMPLOYEE_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.VIEW_MATCHES,
                Permission.VIEW_BASIC_ANALYTICS,
                Permission.VIEW_OWN_GAMIFICATION,
                Permission.VIEW_EMPLOYEE_GAMIFICATION,
                Permission.ENDORSE_SKILLS
            },
            UserRole.DEPARTMENT_HEAD: {
                Permission.VIEW_OWN_PROFILE,
                Permission.EDIT_OWN_PROFILE,
                Permission.VIEW_OWN_SKILLS,
                Permission.EDIT_OWN_SKILLS,
                Permission.VIEW_EMPLOYEE_PROFILES,
                Permission.VIEW_EMPLOYEE_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.CREATE_VACANCIES,
                Permission.EDIT_VACANCIES,
                Permission.VIEW_MATCHES,
                Permission.CREATE_MATCHES,
                Permission.VIEW_DEPARTMENT_ANALYTICS,
                Permission.VIEW_OWN_GAMIFICATION,
                Permission.VIEW_EMPLOYEE_GAMIFICATION,
                Permission.ENDORSE_SKILLS
            },
            UserRole.HR_SPECIALIST: {
                Permission.VIEW_EMPLOYEE_PROFILES,
                Permission.EDIT_EMPLOYEE_PROFILES,
                Permission.VIEW_EMPLOYEE_SKILLS,
                Permission.EDIT_EMPLOYEE_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.CREATE_VACANCIES,
                Permission.EDIT_VACANCIES,
                Permission.VIEW_MATCHES,
                Permission.CREATE_MATCHES,
                Permission.VIEW_BASIC_ANALYTICS,
                Permission.VIEW_DEPARTMENT_ANALYTICS,
                Permission.VIEW_EMPLOYEE_GAMIFICATION,
                Permission.MANAGE_GAMIFICATION,
                Permission.ENDORSE_SKILLS
            },
            UserRole.HR_MANAGER: {
                Permission.VIEW_EMPLOYEE_PROFILES,
                Permission.EDIT_EMPLOYEE_PROFILES,
                Permission.VIEW_EMPLOYEE_SKILLS,
                Permission.EDIT_EMPLOYEE_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.CREATE_VACANCIES,
                Permission.EDIT_VACANCIES,
                Permission.DELETE_VACANCIES,
                Permission.VIEW_MATCHES,
                Permission.CREATE_MATCHES,
                Permission.VIEW_COMPANY_ANALYTICS,
                Permission.EXPORT_ANALYTICS,
                Permission.VIEW_EMPLOYEE_GAMIFICATION,
                Permission.MANAGE_GAMIFICATION,
                Permission.ENDORSE_SKILLS
            },
            UserRole.ADMIN: {
                Permission.VIEW_EMPLOYEE_PROFILES,
                Permission.EDIT_EMPLOYEE_PROFILES,
                Permission.VIEW_EMPLOYEE_SKILLS,
                Permission.EDIT_EMPLOYEE_SKILLS,
                Permission.VIEW_VACANCIES,
                Permission.CREATE_VACANCIES,
                Permission.EDIT_VACANCIES,
                Permission.DELETE_VACANCIES,
                Permission.VIEW_MATCHES,
                Permission.CREATE_MATCHES,
                Permission.VIEW_COMPANY_ANALYTICS,
                Permission.EXPORT_ANALYTICS,
                Permission.VIEW_EMPLOYEE_GAMIFICATION,
                Permission.MANAGE_GAMIFICATION,
                Permission.MANAGE_USERS,
                Permission.MANAGE_ROLES,
                Permission.VIEW_AUDIT_LOG,
                Permission.ENDORSE_SKILLS
            },
            UserRole.SUPER_ADMIN: set(Permission)  # Все разрешения
        }
        
        # Правила маскировки данных
        self.masking_rules = {
            'personal_info': [
                DataMaskingRule('phone', DataSensitivity.CONFIDENTIAL, 'partial', Permission.VIEW_EMPLOYEE_PROFILES),
                DataMaskingRule('email', DataSensitivity.INTERNAL, 'partial', Permission.VIEW_EMPLOYEE_PROFILES),
                DataMaskingRule('address', DataSensitivity.CONFIDENTIAL, 'full', Permission.VIEW_EMPLOYEE_PROFILES),
                DataMaskingRule('salary', DataSensitivity.RESTRICTED, 'remove', Permission.VIEW_COMPANY_ANALYTICS),
                DataMaskingRule('performance_rating', DataSensitivity.CONFIDENTIAL, 'partial', Permission.VIEW_DEPARTMENT_ANALYTICS)
            ],
            'skills': [
                DataMaskingRule('skill_assessments', DataSensitivity.INTERNAL, 'partial', Permission.VIEW_EMPLOYEE_SKILLS),
                DataMaskingRule('peer_reviews', DataSensitivity.CONFIDENTIAL, 'partial', Permission.VIEW_DEPARTMENT_ANALYTICS)
            ]
        }
    
    async def authenticate_user(
        self,
        user_id: UUID,
        session_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[UserContext]:
        """
        Аутентификация пользователя
        
        Args:
            user_id: ID пользователя
            session_token: Токен сессии
            ip_address: IP-адрес пользователя
            user_agent: User-Agent браузера
            
        Returns:
            Контекст пользователя или None
        """
        try:
            async with get_db_session() as session:
                # Получаем данные сотрудника
                employee_query = select(Employee).where(
                    and_(
                        Employee.id == user_id,
                        Employee.is_active == True
                    )
                )
                result = await session.execute(employee_query)
                employee = result.scalar_one_or_none()
                
                if not employee:
                    await self.log_security_event(
                        user_id, AuditAction.LOGIN, "failed", 
                        {"reason": "user_not_found", "ip": ip_address}
                    )
                    return None
                
                # Проверяем токен сессии (упрощенная версия)
                if not self._validate_session_token(user_id, session_token):
                    await self.log_security_event(
                        user_id, AuditAction.LOGIN, "failed",
                        {"reason": "invalid_token", "ip": ip_address}
                    )
                    return None
                
                # Определяем роли пользователя
                user_roles = self._determine_user_roles(employee)
                
                # Собираем разрешения
                permissions = set()
                for role in user_roles:
                    permissions.update(self.role_permissions.get(role, set()))
                
                user_context = UserContext(
                    user_id=user_id,
                    employee_id=employee.id,
                    roles=user_roles,
                    permissions=permissions,
                    department=employee.department,
                    is_manager=self._is_manager(employee),
                    session_id=session_token,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                await self.log_security_event(
                    user_id, AuditAction.LOGIN, "success",
                    {"ip": ip_address, "roles": [r.value for r in user_roles]}
                )
                
                return user_context
                
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return None
    
    async def check_access(self, access_request: AccessRequest) -> bool:
        """
        Проверка доступа к ресурсу
        
        Args:
            access_request: Запрос на доступ
            
        Returns:
            True если доступ разрешен
        """
        try:
            user_context = access_request.user_context
            
            # Проверяем базовые разрешения
            required_permission = self._get_required_permission(
                access_request.resource_type,
                access_request.action
            )
            
            if required_permission and required_permission not in user_context.permissions:
                await self.log_security_event(
                    user_context.user_id, AuditAction.READ, "denied",
                    {
                        "resource_type": access_request.resource_type,
                        "resource_id": str(access_request.resource_id) if access_request.resource_id else None,
                        "reason": "insufficient_permissions"
                    }
                )
                return False
            
            # Проверяем контекстные ограничения
            if not await self._check_contextual_access(access_request):
                await self.log_security_event(
                    user_context.user_id, AuditAction.READ, "denied",
                    {
                        "resource_type": access_request.resource_type,
                        "resource_id": str(access_request.resource_id) if access_request.resource_id else None,
                        "reason": "contextual_restrictions"
                    }
                )
                return False
            
            # Проверяем уровень чувствительности данных
            if not self._check_data_sensitivity_access(
                user_context, access_request.data_sensitivity
            ):
                await self.log_security_event(
                    user_context.user_id, AuditAction.READ, "denied",
                    {
                        "resource_type": access_request.resource_type,
                        "resource_id": str(access_request.resource_id) if access_request.resource_id else None,
                        "reason": "data_sensitivity_violation"
                    }
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking access: {e}")
            return False
    
    async def mask_sensitive_data(
        self,
        data: Dict[str, Any],
        user_context: UserContext,
        data_type: str = 'general'
    ) -> Dict[str, Any]:
        """
        Маскировка чувствительных данных
        
        Args:
            data: Исходные данные
            user_context: Контекст пользователя
            data_type: Тип данных для применения правил маскировки
            
        Returns:
            Данные с примененной маскировкой
        """
        try:
            if not data:
                return data
            
            masked_data = data.copy()
            rules = self.masking_rules.get(data_type, [])
            
            for rule in rules:
                if rule.field_name in masked_data:
                    # Проверяем, есть ли у пользователя разрешение видеть данные
                    if rule.required_permission and rule.required_permission in user_context.permissions:
                        continue  # Пользователь может видеть данные без маскировки
                    
                    # Применяем маскировку
                    original_value = masked_data[rule.field_name]
                    masked_value = self._apply_masking(original_value, rule.masking_type)
                    masked_data[rule.field_name] = masked_value
            
            return masked_data
            
        except Exception as e:
            logger.error(f"Error masking sensitive data: {e}")
            return data
    
    async def log_security_event(
        self,
        user_id: UUID,
        action: AuditAction,
        status: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Логирование событий безопасности
        
        Args:
            user_id: ID пользователя
            action: Тип действия
            status: Статус (success, failed, denied)
            details: Дополнительные детали
        """
        try:
            async with get_db_session() as session:
                audit_entry = AuditLog(
                    user_id=user_id,
                    action=action.value,
                    resource_type="security",
                    status=status,
                    details=details or {},
                    ip_address=details.get('ip') if details else None,
                    user_agent=details.get('user_agent') if details else None,
                    timestamp=datetime.utcnow()
                )
                
                session.add(audit_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    async def get_audit_log(
        self,
        user_context: UserContext,
        user_id: Optional[UUID] = None,
        action: Optional[AuditAction] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Получение аудит-лога
        
        Args:
            user_context: Контекст пользователя
            user_id: Фильтр по пользователю
            action: Фильтр по действию
            date_from: Дата начала периода
            date_to: Дата окончания периода
            limit: Максимальное количество записей
            
        Returns:
            Список записей аудит-лога
        """
        try:
            # Проверяем разрешение на просмотр аудит-лога
            if Permission.VIEW_AUDIT_LOG not in user_context.permissions:
                return []
            
            async with get_db_session() as session:
                query = select(AuditLog)
                
                # Фильтры
                filters = []
                if user_id:
                    filters.append(AuditLog.user_id == user_id)
                if action:
                    filters.append(AuditLog.action == action.value)
                if date_from:
                    filters.append(AuditLog.timestamp >= date_from)
                if date_to:
                    filters.append(AuditLog.timestamp <= date_to)
                
                if filters:
                    query = query.where(and_(*filters))
                
                query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
                
                result = await session.execute(query)
                audit_entries = result.scalars().all()
                
                # Маскируем чувствительные данные в логах
                masked_entries = []
                for entry in audit_entries:
                    entry_dict = {
                        'id': entry.id,
                        'user_id': entry.user_id,
                        'action': entry.action,
                        'resource_type': entry.resource_type,
                        'resource_id': entry.resource_id,
                        'status': entry.status,
                        'timestamp': entry.timestamp,
                        'ip_address': entry.ip_address,
                        'user_agent': entry.user_agent
                    }
                    
                    # Маскируем детали если нужно
                    if entry.details:
                        entry_dict['details'] = await self.mask_sensitive_data(
                            entry.details, user_context, 'audit_log'
                        )
                    
                    masked_entries.append(entry_dict)
                
                return masked_entries
                
        except Exception as e:
            logger.error(f"Error getting audit log: {e}")
            return []
    
    async def create_session_token(self, user_id: UUID) -> str:
        """Создание токена сессии"""
        try:
            # Генерируем безопасный токен
            token = secrets.token_urlsafe(32)
            
            # В реальной системе здесь будет сохранение токена в Redis/БД
            # с TTL и привязкой к пользователю
            
            return token
            
        except Exception as e:
            logger.error(f"Error creating session token: {e}")
            return ""
    
    async def invalidate_session(self, user_id: UUID, session_token: str) -> bool:
        """Инвалидация сессии"""
        try:
            # В реальной системе здесь будет удаление токена из хранилища
            
            await self.log_security_event(
                user_id, AuditAction.LOGOUT, "success"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating session: {e}")
            return False
    
    def _validate_session_token(self, user_id: UUID, token: str) -> bool:
        """Валидация токена сессии"""
        # Упрощенная версия - в реальности здесь будет проверка
        # токена в Redis/БД с проверкой TTL
        return len(token) > 10
    
    def _determine_user_roles(self, employee: Employee) -> List[UserRole]:
        """Определение ролей пользователя на основе данных сотрудника"""
        roles = [UserRole.EMPLOYEE]  # Базовая роль
        
        # Определяем роли на основе должности и подразделения
        if employee.current_role:
            role_lower = employee.current_role.lower()
            
            if 'hr' in role_lower:
                if 'manager' in role_lower or 'head' in role_lower:
                    roles.append(UserRole.HR_MANAGER)
                else:
                    roles.append(UserRole.HR_SPECIALIST)
            
            if 'lead' in role_lower or 'manager' in role_lower:
                roles.append(UserRole.TEAM_LEAD)
            
            if 'head' in role_lower or 'director' in role_lower:
                roles.append(UserRole.DEPARTMENT_HEAD)
            
            if 'admin' in role_lower:
                roles.append(UserRole.ADMIN)
        
        # Проверяем специальные флаги
        if hasattr(employee, 'is_admin') and employee.is_admin:
            roles.append(UserRole.ADMIN)
        
        if hasattr(employee, 'is_super_admin') and employee.is_super_admin:
            roles.append(UserRole.SUPER_ADMIN)
        
        return roles
    
    def _is_manager(self, employee: Employee) -> bool:
        """Проверка, является ли сотрудник руководителем"""
        if not employee.current_role:
            return False
        
        role_lower = employee.current_role.lower()
        manager_keywords = ['lead', 'manager', 'head', 'director', 'supervisor']
        
        return any(keyword in role_lower for keyword in manager_keywords)
    
    def _get_required_permission(self, resource_type: str, action: str) -> Optional[Permission]:
        """Определение требуемого разрешения для ресурса и действия"""
        permission_map = {
            ('employee_profile', 'read'): Permission.VIEW_EMPLOYEE_PROFILES,
            ('employee_profile', 'write'): Permission.EDIT_EMPLOYEE_PROFILES,
            ('own_profile', 'read'): Permission.VIEW_OWN_PROFILE,
            ('own_profile', 'write'): Permission.EDIT_OWN_PROFILE,
            ('skills', 'read'): Permission.VIEW_EMPLOYEE_SKILLS,
            ('skills', 'write'): Permission.EDIT_EMPLOYEE_SKILLS,
            ('vacancy', 'read'): Permission.VIEW_VACANCIES,
            ('vacancy', 'write'): Permission.CREATE_VACANCIES,
            ('match', 'read'): Permission.VIEW_MATCHES,
            ('match', 'write'): Permission.CREATE_MATCHES,
            ('analytics', 'read'): Permission.VIEW_BASIC_ANALYTICS,
            ('gamification', 'read'): Permission.VIEW_EMPLOYEE_GAMIFICATION,
            ('gamification', 'write'): Permission.MANAGE_GAMIFICATION
        }
        
        return permission_map.get((resource_type, action))
    
    async def _check_contextual_access(self, access_request: AccessRequest) -> bool:
        """Проверка контекстных ограничений доступа"""
        user_context = access_request.user_context
        
        # Проверяем доступ к собственным данным
        if access_request.resource_type == 'own_profile':
            return access_request.resource_id == user_context.employee_id
        
        # Проверяем доступ руководителя к подчиненным
        if user_context.is_manager and access_request.resource_type == 'employee_profile':
            # В реальной системе здесь будет проверка иерархии
            return True
        
        # Проверяем доступ по подразделению
        if access_request.resource_type == 'department_analytics':
            if Permission.VIEW_DEPARTMENT_ANALYTICS in user_context.permissions:
                # Проверяем, что пользователь имеет доступ к данному подразделению
                return True
        
        return True
    
    def _check_data_sensitivity_access(
        self,
        user_context: UserContext,
        data_sensitivity: DataSensitivity
    ) -> bool:
        """Проверка доступа к данным по уровню чувствительности"""
        # Определяем максимальный уровень доступа для ролей пользователя
        max_access_level = DataSensitivity.PUBLIC
        
        for role in user_context.roles:
            if role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
                max_access_level = DataSensitivity.SECRET
                break
            elif role == UserRole.HR_MANAGER:
                max_access_level = DataSensitivity.RESTRICTED
            elif role in [UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_HEAD]:
                max_access_level = DataSensitivity.CONFIDENTIAL
            elif role == UserRole.TEAM_LEAD:
                max_access_level = DataSensitivity.INTERNAL
        
        # Проверяем уровень доступа
        sensitivity_levels = {
            DataSensitivity.PUBLIC: 0,
            DataSensitivity.INTERNAL: 1,
            DataSensitivity.CONFIDENTIAL: 2,
            DataSensitivity.RESTRICTED: 3,
            DataSensitivity.SECRET: 4
        }
        
        return sensitivity_levels[data_sensitivity] <= sensitivity_levels[max_access_level]
    
    def _apply_masking(self, value: Any, masking_type: str) -> Any:
        """Применение маскировки к значению"""
        if value is None:
            return value
        
        str_value = str(value)
        
        if masking_type == 'remove':
            return None
        elif masking_type == 'full':
            return '*' * len(str_value)
        elif masking_type == 'partial':
            if len(str_value) <= 4:
                return '*' * len(str_value)
            else:
                return str_value[:2] + '*' * (len(str_value) - 4) + str_value[-2:]
        elif masking_type == 'hash':
            return hashlib.sha256(str_value.encode()).hexdigest()[:8]
        else:
            return value


# Глобальный экземпляр сервиса
security_service = SecurityService()