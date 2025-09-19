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
    position: str = "Не указана"

@app.get("/")
async def root():
    return {"message": "AI Interview System API", "version": "1.0.0"}

@app.post("/api/create-session")
async def create_session(session_data: SessionCreate):
    """Создание новой сессии интервью"""
    try:
        session_id = session_manager.create_session(
            session_data.candidate_name, 
            session_data.position
        )
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
        
        # Чтение содержимого файла
        content = await file.read()
        
        # Анализ резюме
        analysis = await resume_analyzer.analyze_resume(content, file.filename)
        
        # Сохранение результата в сессии
        session_manager.update_resume_analysis(session_id, analysis)

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
async def process_voice_message(file: UploadFile = File(...), session_id: str = Form(...)):
    """Обработка голосового сообщения в интервью"""
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="Не указан session_id")
        
        # Проверка сессии
        if not session_manager.session_exists(session_id):
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Чтение аудио данных
        audio_data = await file.read()
        
        # Транскрипция аудио с помощью STT
        transcription_result = stt_service.transcribe_audio(
            audio_data=audio_data,
            use_api=True  # Используем Nemo Parakeet V3 API
        )
        
        if not transcription_result.get('success', False):
            # Fallback к локальной модели
            transcription_result = stt_service.transcribe_audio(
                audio_data=audio_data,
                use_api=False
            )
        
        if not transcription_result.get('success', False):
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка транскрипции: {transcription_result.get('error', 'Неизвестная ошибка')}"
            )
        
        transcribed_text = transcription_result.get('text', '').strip()
        
        if not transcribed_text:
            return {
                "success": False,
                "error": "Не удалось распознать речь",
                "transcription_info": transcription_result
            }
        
        # Обработка сообщения через интервью сервис
        interview_response = interview_service.process_message(
            session_id, 
            transcribed_text
        )
        
        # Генерация аудио ответа с помощью TTS
        tts_result = tts_service.generate_speech(interview_response.get('response', ''))
        
        # Возвращаем аудио данные в base64 для прямой передачи
        audio_data_b64 = None
        if tts_result.get('success', False) and tts_result.get('audio_data'):
            import base64
            audio_data_b64 = base64.b64encode(tts_result['audio_data']).decode('utf-8')
        
        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "response": interview_response.get('response', ''),
            "audio_data": audio_data_b64,
            "interview_status": interview_response.get('status', 'active'),
            "transcription_model": transcription_result.get('model', 'unknown'),
            "tts_model": tts_result.get('model', 'unknown'),
            "warnings": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": f"Ошибка обработки голосового сообщения: {str(e)}"
        }

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