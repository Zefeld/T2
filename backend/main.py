from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import json
from typing import Dict, Any, List
import uvicorn

from services.resume_analyzer import ResumeAnalyzer
from services.interview_service import InterviewService
from services.stt_service import STTService
from services.tts_service import TTSService

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
resume_analyzer = ResumeAnalyzer()
interview_service = InterviewService()
stt_service = STTService()
tts_service = TTSService()

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

@app.get("/")
async def root():
    return {"message": "AI Interview System API", "version": "1.0.0"}

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Загрузка и анализ резюме кандидата"""
    try:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Сохранение файла
        upload_path = f"uploads/{file.filename}"
        os.makedirs("uploads", exist_ok=True)
        
        with open(upload_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Анализ резюме
        analysis_result = await resume_analyzer.analyze_resume(upload_path)
        
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "analysis": analysis_result
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@app.post("/api/start-interview")
async def start_interview(session_data: Dict[str, Any]):
    """Начало AI интервью"""
    try:
        session_id = session_data.get("session_id")
        resume_analysis = session_data.get("resume_analysis", {})
        
        interview_session = await interview_service.start_interview(session_id, resume_analysis)
        
        return JSONResponse(content={
            "status": "success",
            "session_id": session_id,
            "first_question": interview_session["first_question"]
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting interview: {str(e)}")

@app.post("/api/interview-message")
async def process_interview_message(message: InterviewMessage):
    """Обработка сообщения в текстовом интервью"""
    try:
        response = await interview_service.process_message(
            message.session_id, 
            message.message
        )
        
        return JSONResponse(content={
            "status": "success",
            "response": response["response"],
            "is_complete": response.get("is_complete", False),
            "analysis": response.get("analysis", {})
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@app.post("/api/voice-interview")
async def process_voice_message(file: UploadFile = File(...), session_id: str = ""):
    """Обработка голосового сообщения в интервью"""
    try:
        # Сохранение аудио файла
        audio_path = f"uploads/audio_{session_id}_{file.filename}"
        os.makedirs("uploads", exist_ok=True)
        
        with open(audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Транскрибация речи
        transcription = await stt_service.transcribe_audio(audio_path)
        
        # Обработка через интервью сервис
        response = await interview_service.process_message(session_id, transcription)
        
        # Генерация голосового ответа
        audio_response_path = await tts_service.generate_speech(
            response["response"], 
            f"uploads/response_{session_id}.wav"
        )
        
        return JSONResponse(content={
            "status": "success",
            "transcription": transcription,
            "response": response["response"],
            "audio_response": audio_response_path,
            "is_complete": response.get("is_complete", False),
            "analysis": response.get("analysis", {})
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing voice message: {str(e)}")

@app.post("/api/submit-test")
async def submit_test_assignment(submission: TestSubmission):
    """Отправка тестового задания"""
    try:
        # Анализ кода через Gemma 3
        code_analysis = await interview_service.analyze_code(
            submission.code, 
            submission.task_description
        )
        
        return JSONResponse(content={
            "status": "success",
            "analysis": code_analysis,
            "session_id": submission.session_id
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing code: {str(e)}")

@app.get("/api/session-report/{session_id}")
async def get_session_report(session_id: str):
    """Получение полного отчета по сессии"""
    try:
        report = await interview_service.generate_final_report(session_id)
        
        return JSONResponse(content={
            "status": "success",
            "report": report
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.get("/api/candidate-feedback/{session_id}")
async def get_candidate_feedback(session_id: str):
    """Получение обратной связи для кандидата"""
    try:
        feedback = await interview_service.generate_candidate_feedback(session_id)
        
        return JSONResponse(content={
            "status": "success",
            "feedback": feedback
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)