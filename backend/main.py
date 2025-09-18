from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import os
import json
from typing import Dict, Any, List
import uvicorn
import tempfile
import uuid

from services.resume_analyzer import ResumeAnalyzer
from services.interview_service import InterviewService
from services.stt_service import STTService
from services.tts_service import TTSService
from services.session_manager import SessionManager

app = FastAPI(title="AI Interview System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
from services.gemma_client import GemmaClient

gemma_client = GemmaClient()
resume_analyzer = ResumeAnalyzer(gemma_client)
interview_service = InterviewService()
stt_service = STTService()
tts_service = TTSService()
session_manager = SessionManager()

# Создание необходимых директорий
os.makedirs("uploads", exist_ok=True)
os.makedirs("reports", exist_ok=True)
os.makedirs("audio", exist_ok=True)

# Pydantic models
class InterviewMessage(BaseModel):
    message: str
    session_id: str

class TestSubmission(BaseModel):
    code: str
    task_description: str
    session_id: str

class VoiceMessage(BaseModel):
    session_id: str

class SessionCreate(BaseModel):
    candidate_name: str = "Неизвестный кандидат"

@app.get("/")
async def root():
    return {"message": "AI Interview System API", "version": "1.0.0"}

@app.post("/api/create-session")
async def create_session(session_data: SessionCreate):
    """Создание новой сессии интервью"""
    try:
        session_id = session_manager.create_session(session_data.candidate_name)
        return {
            "success": True,
            "session_id": session_id,
            "message": "Сессия создана успешно"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания сессии: {str(e)}")

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...), session_id: str = Form(...)):
    """Загрузка и анализ резюме"""
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="Не указан session_id")
        
        # Проверка типа файла
        if not file.filename.lower().endswith(('.pdf', '.txt', '.docx')):
            raise HTTPException(status_code=400, detail="Поддерживаются только PDF, TXT и DOCX файлы")
        
        # Сохранение файла
        file_path = f"uploads/{session_id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Анализ резюме
        analysis = await resume_analyzer.analyze_resume(file_path)
        
        # Сохранение результата в сессии
        session_manager.update_resume_analysis(session_id, analysis)
        
        # Удаление временного файла
        try:
            os.remove(file_path)
        except:
            pass
        
        return {
            "success": True,
            "analysis": analysis,
            "message": "Резюме успешно проанализировано"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа резюме: {str(e)}")

@app.post("/api/start-interview")
async def start_interview(session_data: Dict[str, Any]):
    """Начало интервью"""
    try:
        session_id = session_data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Не указан session_id")
        
        # Получение данных сессии
        session_info = session_manager.get_session_data(session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Генерация первого вопроса
        first_question = await interview_service.start_interview(session_info.get("resume_analysis", {}))
        
        # Сохранение вопроса в транскрипт
        session_manager.add_interview_message(session_id, "Интервьюер", first_question)
        
        return {
            "success": True,
            "question": first_question,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка начала интервью: {str(e)}")

@app.post("/api/interview-message")
async def process_interview_message(message: InterviewMessage):
    """Обработка сообщения в интервью"""
    try:
        # Сохранение ответа кандидата
        session_manager.add_interview_message(message.session_id, "Кандидат", message.message)
        
        # Получение данных сессии
        session_info = session_manager.get_session_data(message.session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Генерация следующего вопроса
        next_question = await interview_service.process_answer(
            message.message, 
            session_info.get("resume_analysis", {}),
            session_info.get("interview_transcript", "")
        )
        
        # Сохранение вопроса в транскрипт
        session_manager.add_interview_message(message.session_id, "Интервьюер", next_question)
        
        return {
            "success": True,
            "response": next_question
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки сообщения: {str(e)}")

@app.post("/api/voice-interview")
async def process_voice_message(file: UploadFile = File(...), session_id: str = ""):
    """Обработка голосового сообщения в интервью"""
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="Не указан session_id")
        
        # Сохранение аудио файла
        audio_path = f"audio/{session_id}_{uuid.uuid4().hex}.wav"
        with open(audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Транскрибация речи
        transcription = await stt_service.transcribe_audio(audio_path)
        
        # Сохранение ответа кандидата
        session_manager.add_interview_message(session_id, "Кандидат", transcription)
        
        # Получение данных сессии
        session_info = session_manager.get_session_data(session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Генерация ответа
        response_text = await interview_service.process_answer(
            transcription,
            session_info.get("resume_analysis", {}),
            session_info.get("interview_transcript", "")
        )
        
        # Сохранение ответа интервьюера
        session_manager.add_interview_message(session_id, "Интервьюер", response_text)
        
        # Генерация аудио ответа
        response_audio_path = f"audio/{session_id}_response_{uuid.uuid4().hex}.wav"
        await tts_service.generate_speech(response_text, response_audio_path)
        
        # Очистка входного аудио файла
        try:
            os.remove(audio_path)
        except:
            pass
        
        return {
            "success": True,
            "transcription": transcription,
            "response": response_text,
            "audio_url": f"/api/audio/{os.path.basename(response_audio_path)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки голоса: {str(e)}")

@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str):
    """Получение аудио файла"""
    file_path = f"audio/{filename}"
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav")
    else:
        raise HTTPException(status_code=404, detail="Аудио файл не найден")

@app.post("/api/submit-test")
async def submit_test_assignment(submission: TestSubmission):
    """Отправка тестового задания"""
    try:
        # Анализ кода
        result = await interview_service.analyze_code(submission.code, submission.task_description)
        
        # Сохранение результата в сессии
        session_manager.update_coding_test_result(submission.session_id, result)
        
        return {
            "success": True,
            "result": result,
            "message": "Тестовое задание успешно проанализировано"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа кода: {str(e)}")

@app.get("/api/session-report/{session_id}")
async def get_session_report(session_id: str):
    """Получение отчета по сессии для работодателя"""
    try:
        report = session_manager.generate_final_report(session_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        return {
            "success": True,
            "report": report
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации отчета: {str(e)}")

@app.get("/api/candidate-feedback/{session_id}")
async def get_candidate_feedback(session_id: str):
    """Получение обратной связи для кандидата"""
    try:
        session_data = session_manager.get_session_data(session_id)
        
        if not session_data:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Генерация обратной связи
        feedback = await interview_service.generate_candidate_feedback(session_data)
        
        return {
            "success": True,
            "feedback": feedback
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации обратной связи: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)