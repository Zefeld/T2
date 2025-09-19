import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

logger = logging.getLogger(__name__)

Base = declarative_base()

class InterviewSession(Base):
    """Модель сессии интервью"""
    __tablename__ = "interview_sessions"
    
    session_id = Column(String, primary_key=True)
    candidate_name = Column(String)
    position = Column(String)
    resume_analysis = Column(JSON)
    interview_transcript = Column(Text)
    interview_analysis = Column(JSON)
    coding_test_result = Column(JSON)
    final_report = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="started")  # started, resume_uploaded, interview_completed, test_completed, finished

class SessionManager:
    """Менеджер сессий для управления данными кандидатов"""
    
    def __init__(self, db_path: str = "sessions.db"):
        self.db_path = db_path
        self.engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def create_session(self, candidate_name: str = None, position: str = None) -> str:
        """Создание новой сессии"""
        session_id = str(uuid.uuid4())
        
        with self.SessionLocal() as db:
            session = InterviewSession(
                session_id=session_id,
                candidate_name=candidate_name or "Неизвестный кандидат",
                position=position or "Не указана"
            )
            db.add(session)
            db.commit()
            
        logger.info(f"Создана новая сессия: {session_id}")
        return session_id
    
    def update_resume_analysis(self, session_id: str, analysis: Dict[str, Any]):
        """Обновление анализа резюме"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if session:
                session.resume_analysis = analysis
                session.status = "resume_uploaded"
                session.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Обновлен анализ резюме для сессии {session_id}")
            else:
                logger.error(f"Сессия не найдена: {session_id}")
    
    def add_interview_message(self, session_id: str, role: str, message: str):
        """Добавление сообщения в транскрипт интервью"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if session:
                # Получение существующего транскрипта или создание нового
                transcript = session.interview_transcript or ""
                timestamp = datetime.now().strftime("%H:%M:%S")
                new_message = f"[{timestamp}] {role}: {message}\n"
                
                session.interview_transcript = transcript + new_message
                session.updated_at = datetime.utcnow()
                db.commit()
            else:
                logger.error(f"Сессия не найдена: {session_id}")
    
    def update_interview_analysis(self, session_id: str, analysis: Dict[str, Any]):
        """Обновление анализа интервью"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if session:
                session.interview_analysis = analysis
                session.status = "interview_completed"
                session.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Обновлен анализ интервью для сессии {session_id}")
            else:
                logger.error(f"Сессия не найдена: {session_id}")
    
    def update_coding_test_result(self, session_id: str, result: Dict[str, Any]):
        """Обновление результата тестового задания"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if session:
                session.coding_test_result = result
                session.status = "test_completed"
                session.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Обновлен результат теста для сессии {session_id}")
            else:
                logger.error(f"Сессия не найдена: {session_id}")
    
    def generate_final_report(self, session_id: str) -> Dict[str, Any]:
        """Генерация финального отчета"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if not session:
                logger.error(f"Сессия не найдена: {session_id}")
                return {}
            
            # Формирование итогового отчета
            report = {
                "session_id": session_id,
                "candidate_name": session.candidate_name,
                "created_at": session.created_at.isoformat(),
                "status": session.status,
                "resume_analysis": session.resume_analysis or {},
                "interview_analysis": session.interview_analysis or {},
                "coding_test_result": session.coding_test_result or {},
                "interview_transcript": session.interview_transcript or "",
                "overall_score": self._calculate_overall_score(session),
                "recommendations": self._generate_recommendations(session)
            }
            
            # Сохранение финального отчета
            session.final_report = report
            session.status = "finished"
            session.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Сгенерирован финальный отчет для сессии {session_id}")
            return report
    
    def session_exists(self, session_id: str) -> bool:
        """Проверка существования сессии"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            return session is not None

    def get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Получение данных сессии"""
        with self.SessionLocal() as db:
            session = db.query(InterviewSession).filter(
                InterviewSession.session_id == session_id
            ).first()
            
            if session:
                return {
                    "session_id": session.session_id,
                    "candidate_name": session.candidate_name,
                    "status": session.status,
                    "resume_analysis": session.resume_analysis,
                    "interview_transcript": session.interview_transcript,
                    "interview_analysis": session.interview_analysis,
                    "coding_test_result": session.coding_test_result,
                    "final_report": session.final_report,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "updated_at": session.updated_at.isoformat() if session.updated_at else None
                }
            return None
    
    def _calculate_overall_score(self, session: InterviewSession) -> float:
        """Расчет общего балла кандидата"""
        scores = []
        
        # Балл за резюме
        if session.resume_analysis and "overall_score" in session.resume_analysis:
            scores.append(session.resume_analysis["overall_score"])
        
        # Балл за интервью
        if session.interview_analysis and "overall_score" in session.interview_analysis:
            scores.append(session.interview_analysis["overall_score"])
        
        # Балл за тестовое задание
        if session.coding_test_result and "overall_score" in session.coding_test_result:
            scores.append(session.coding_test_result["overall_score"])
        
        return sum(scores) / len(scores) if scores else 0.0
    
    def _generate_recommendations(self, session: InterviewSession) -> List[str]:
        """Генерация рекомендаций для кандидата"""
        recommendations = []
        
        # Анализ резюме
        if session.resume_analysis:
            if session.resume_analysis.get("experience_score", 0) < 7:
                recommendations.append("Рекомендуется получить больше практического опыта в выбранной области")
            if session.resume_analysis.get("skills_score", 0) < 7:
                recommendations.append("Стоит развить технические навыки и получить дополнительные сертификации")
        
        # Анализ интервью
        if session.interview_analysis:
            if session.interview_analysis.get("communication_score", 0) < 7:
                recommendations.append("Работайте над навыками коммуникации и презентации")
            if session.interview_analysis.get("problem_solving_score", 0) < 7:
                recommendations.append("Развивайте аналитическое мышление и навыки решения проблем")
        
        # Анализ кода
        if session.coding_test_result:
            if session.coding_test_result.get("code_quality_score", 0) < 7:
                recommendations.append("Изучите лучшие практики написания чистого кода")
            if session.coding_test_result.get("algorithm_score", 0) < 7:
                recommendations.append("Углубите знания алгоритмов и структур данных")
        
        return recommendations if recommendations else ["Отличная работа! Продолжайте в том же духе."]