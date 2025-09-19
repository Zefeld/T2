from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import logging
import json
import os
from typing import Dict, Any, List, Optional
import uuid
from pathlib import Path
import asyncio

# Импорт сервисов
from services.gemma_client import GemmaClient
from services.resume_service import ResumeService
from services.interview_service import InterviewService
from services.tts_service import TTSService
from services.stt_service import STTService
from services.coding_test_service import CodingTestService

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создание FastAPI приложения
app = FastAPI(
    title="AI HR Consultant API",
    description="Персональный ИИ-консультант для HR и кандидатов",
    version="1.0.0"
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальные переменные для сервисов
gemma_client = None
resume_service = None
interview_service = None
tts_service = None
stt_service = None
coding_test_service = None

# Хранилище активных сессий
active_sessions = {}

@app.on_event("startup")
async def startup_event():
    """Инициализация сервисов при запуске"""
    global gemma_client, resume_service, interview_service, tts_service, stt_service, coding_test_service
    
    try:
        logger.info("Инициализация сервисов...")
        
        # Инициализация Gemma клиента
        gemma_client = GemmaClient()
        await gemma_client.initialize()
        
        # Инициализация сервисов
        resume_service = ResumeService(gemma_client)
        interview_service = InterviewService(gemma_client)
        tts_service = TTSService()
        stt_service = STTService()
        coding_test_service = CodingTestService(gemma_client)
        
        # Инициализация TTS
        await tts_service.initialize()
        
        logger.info("Все сервисы успешно инициализированы")
        
    except Exception as e:
        logger.error(f"Ошибка инициализации сервисов: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка ресурсов при завершении"""
    logger.info("Завершение работы сервисов...")

# === ОСНОВНЫЕ ENDPOINTS ===

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {"message": "AI HR Consultant API", "status": "running"}

@app.get("/health")
async def health_check():
    """Проверка состояния сервисов"""
    try:
        services_status = {
            "gemma_client": gemma_client is not None and await gemma_client.is_ready(),
            "resume_service": resume_service is not None,
            "interview_service": interview_service is not None,
            "tts_service": tts_service is not None and tts_service.is_model_ready(),
            "stt_service": stt_service is not None,
            "coding_test_service": coding_test_service is not None
        }
        
        all_ready = all(services_status.values())
        
        return {
            "status": "healthy" if all_ready else "partial",
            "services": services_status
        }
        
    except Exception as e:
        logger.error(f"Ошибка проверки здоровья: {e}")
        return {"status": "error", "message": str(e)}

# === СЕССИИ КАНДИДАТОВ ===

@app.post("/api/create-session")
async def create_session():
    """Создание новой сессии кандидата"""
    try:
        session_id = str(uuid.uuid4())
        
        active_sessions[session_id] = {
            "id": session_id,
            "created_at": asyncio.get_event_loop().time(),
            "status": "active",
            "resume_analysis": None,
            "interview_data": None,
            "coding_test_data": None,
            "current_step": "resume"
        }
        
        logger.info(f"Создана новая сессия: {session_id}")
        
        return {
            "session_id": session_id,
            "status": "created",
            "current_step": "resume"
        }
        
    except Exception as e:
        logger.error(f"Ошибка создания сессии: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Получение информации о сессии"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    
    return active_sessions[session_id]

# === БЛОК 1: АНАЛИЗ РЕЗЮМЕ ===

@app.post("/api/upload-resume")
async def upload_resume(session_id: str = Form(...), file: UploadFile = File(...)):
    """Загрузка резюме кандидата"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Сохранение файла
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / f"{session_id}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Анализ резюме
        resume_analysis = await resume_service.analyze_resume(str(file_path))
        
        # Обновление сессии
        session = active_sessions[session_id]
        session["resume_file"] = str(file_path)
        session["resume_analysis"] = resume_analysis
        session["current_step"] = "resume_analyzed"
        
        return {
            "status": "uploaded",
            "analysis": resume_analysis
        }
        
    except Exception as e:
        logger.error(f"Ошибка загрузки резюме: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/resume/analysis/{session_id}")
async def get_resume_analysis(session_id: str):
    """Получение результатов анализа резюме"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    
    analysis = active_sessions[session_id].get("resume_analysis")
    if not analysis:
        raise HTTPException(status_code=404, detail="Анализ резюме не найден")
    
    return analysis

# === БЛОК 2: AI ИНТЕРВЬЮ ===

@app.post("/api/start-interview")
async def start_interview(session_id: str = Form(...)):
    """Начало AI интервью"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        resume_analysis = session.get("resume_analysis")
        
        if not resume_analysis:
            raise HTTPException(status_code=400, detail="Сначала необходимо загрузить резюме")
        
        # Начало интервью
        interview_data = await interview_service.start_interview(session_id, resume_analysis)
        
        # Обновление сессии
        session["interview_data"] = interview_data
        session["current_step"] = "interview_active"
        
        return {
            "status": "started",
            "interview_id": interview_data["interview_id"],
            "first_question": interview_data["current_question"]
        }
        
    except Exception as e:
        logger.error(f"Ошибка начала интервью: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview-message")
async def send_interview_message(session_id: str = Form(...), message: str = Form(...)):
    """Отправка сообщения в интервью"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        interview_data = session.get("interview_data")
        
        if not interview_data:
            raise HTTPException(status_code=400, detail="Интервью не начато")
        
        # Обработка сообщения
        response = await interview_service.process_message(
            interview_data["interview_id"], 
            message
        )
        
        # Обновление данных интервью
        session["interview_data"] = response["interview_data"]
        
        return {
            "status": "success",
            "response": response["ai_response"],
            "is_completed": response.get("is_completed", False)
        }
        
    except Exception as e:
        logger.error(f"Ошибка обработки сообщения: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview/complete/{session_id}")
async def complete_interview(session_id: str):
    """Завершение интервью"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        interview_data = session.get("interview_data")
        
        if not interview_data:
            raise HTTPException(status_code=400, detail="Интервью не найдено")
        
        # Завершение интервью
        final_result = await interview_service.finalize_interview(interview_data["interview_id"])
        
        # Обновление сессии
        session["interview_data"]["final_result"] = final_result
        session["current_step"] = "coding_test"
        
        return {
            "status": "completed",
            "final_assessment": final_result,
            "next_step": "coding_test"
        }
        
    except Exception as e:
        logger.error(f"Ошибка завершения интервью: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ГОЛОСОВОЕ ИНТЕРВЬЮ ===

@app.post("/api/voice-interview")
async def voice_interview(session_id: str = Form(...), audio: UploadFile = File(...)):
    """Голосовое интервью"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        interview_data = session.get("interview_data")
        
        if not interview_data:
            raise HTTPException(status_code=400, detail="Интервью не начато")
        
        # Сохранение аудио файла
        audio_dir = Path("audio")
        audio_dir.mkdir(exist_ok=True)
        
        audio_path = audio_dir / f"{session_id}_{uuid.uuid4()}.wav"
        
        with open(audio_path, "wb") as buffer:
            content = await audio.read()
            buffer.write(content)
        
        # Распознавание речи
        text = await stt_service.transcribe_audio(str(audio_path))
        
        # Обработка сообщения
        response = await interview_service.process_message(
            interview_data["interview_id"], 
            text
        )
        
        # Генерация голосового ответа
        audio_response_path = await tts_service.generate_speech(response["ai_response"])
        
        # Обновление данных интервью
        session["interview_data"] = response["interview_data"]
        
        return {
            "status": "success",
            "transcribed_text": text,
            "response": response["ai_response"],
            "audio_response": audio_response_path,
            "is_completed": response.get("is_completed", False)
        }
        
    except Exception as e:
        logger.error(f"Ошибка голосового интервью: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === БЛОК 3: ТЕСТОВОЕ ЗАДАНИЕ ===

@app.post("/api/coding-test/generate/{session_id}")
async def generate_coding_test(session_id: str):
    """Генерация тестового задания"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        resume_analysis = session.get("resume_analysis")
        
        if not resume_analysis:
            raise HTTPException(status_code=400, detail="Анализ резюме не найден")
        
        # Генерация задания
        test_data = await coding_test_service.generate_coding_task(resume_analysis)
        
        # Обновление сессии
        session["coding_test_data"] = test_data
        session["current_step"] = "coding_test_active"
        
        return {
            "status": "generated",
            "test": test_data
        }
        
    except Exception as e:
        logger.error(f"Ошибка генерации теста: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/submit-test")
async def submit_coding_solution(session_id: str = Form(...), solution: str = Form(...)):
    """Отправка решения тестового задания"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        coding_test = session.get("coding_test")
        
        if not coding_test:
            raise HTTPException(status_code=400, detail="Тестовое задание не создано")
        
        # Оценка решения
        evaluation = await coding_test_service.evaluate_solution(
            coding_test["test_id"],
            solution
        )
        
        # Обновление сессии
        session["test_solution"] = solution
        session["test_evaluation"] = evaluation
        session["current_step"] = "completed"
        
        return {
            "status": "submitted",
            "evaluation": evaluation
        }
        
    except Exception as e:
        logger.error(f"Ошибка отправки решения: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ГЕНЕРАЦИЯ ОТЧЕТОВ ===

@app.get("/api/session-report/{session_id}")
async def generate_candidate_report(session_id: str):
    """Генерация отчета для кандидата"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        
        # Сбор всех данных
        resume_analysis = session.get("resume_analysis", {})
        interview_data = session.get("interview_data", {})
        coding_test_data = session.get("coding_test_data", {})
        
        # Формирование отчета для кандидата
        candidate_report = {
            "session_id": session_id,
            "timestamp": asyncio.get_event_loop().time(),
            "summary": {
                "overall_assessment": "Положительная оценка",
                "strengths": [],
                "areas_for_improvement": [],
                "recommendations": []
            },
            "resume_feedback": resume_analysis.get("feedback", {}),
            "interview_feedback": interview_data.get("final_result", {}).get("feedback", {}),
            "coding_feedback": coding_test_data.get("result", {}).get("feedback", {})
        }
        
        # Объединение сильных сторон
        if resume_analysis.get("strengths"):
            candidate_report["summary"]["strengths"].extend(resume_analysis["strengths"])
        
        if interview_data.get("final_result", {}).get("strengths"):
            candidate_report["summary"]["strengths"].extend(interview_data["final_result"]["strengths"])
        
        return {
            "status": "generated",
            "report": candidate_report
        }
        
    except Exception as e:
        logger.error(f"Ошибка генерации отчета: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
        return candidate_report
        
    except Exception as e:
        logger.error(f"Ошибка генерации отчета кандидата: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidate-feedback/{session_id}")
async def generate_employer_report(session_id: str):
    """Генерация отчета для работодателя"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        session = active_sessions[session_id]
        
        # Сбор всех данных
        resume_analysis = session.get("resume_analysis", {})
        interview_data = session.get("interview_data", {})
        coding_test_data = session.get("coding_test_data", {})
        
        # Формирование отчета для работодателя
        employer_report = {
            "candidate_id": session_id,
            "assessment_date": asyncio.get_event_loop().time(),
            "overall_score": 0,
            "recommendation": "Рассмотреть кандидатуру",
            "detailed_analysis": {
                "resume": resume_analysis,
                "interview": interview_data.get("final_result", {}),
                "coding_test": coding_test_data.get("result", {})
            },
            "interview_transcript": interview_data.get("transcript", []),
            "key_insights": [],
            "risk_factors": [],
            "strengths": []
        }
        
        # Расчет общего балла
        scores = []
        if resume_analysis.get("overall_score"):
            scores.append(resume_analysis["overall_score"])
        if interview_data.get("final_result", {}).get("overall_score"):
            scores.append(interview_data["final_result"]["overall_score"])
        if coding_test_data.get("result", {}).get("overall_score"):
            scores.append(coding_test_data["result"]["overall_score"])
        
        if scores:
            employer_report["overall_score"] = sum(scores) / len(scores)
        
        return {
            "status": "generated",
            "report": employer_report
        }
        
    except Exception as e:
        logger.error(f"Ошибка генерации отчета работодателя: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === WEBSOCKET ДЛЯ ГОЛОСОВОГО ИНТЕРВЬЮ ===

@app.websocket("/ws/voice-interview/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str):
    """WebSocket для голосового интервью в реальном времени"""
    await websocket.accept()
    
    try:
        if session_id not in active_sessions:
            await websocket.send_json({"error": "Сессия не найдена"})
            return
        
        logger.info(f"Начато голосовое интервью для сессии {session_id}")
        
        while True:
            # Получение аудио данных
            data = await websocket.receive_bytes()
            
            try:
                # Транскрибация аудио
                transcription = await stt_service.transcribe_audio(data)
                
                if transcription:
                    # Обработка через интервью сервис
                    session = active_sessions[session_id]
                    interview_data = session.get("interview_data")
                    
                    if interview_data:
                        response = await interview_service.process_message(
                            interview_data["interview_id"], 
                            transcription
                        )
                        
                        # Генерация голосового ответа
                        audio_response = await tts_service.generate_speech(response["ai_response"])
                        
                        # Отправка ответа
                        await websocket.send_json({
                            "type": "response",
                            "text": response["ai_response"],
                            "audio": audio_response,
                            "transcription": transcription
                        })
                        
                        # Обновление сессии
                        session["interview_data"] = response["interview_data"]
                
            except Exception as e:
                logger.error(f"Ошибка обработки голосового сообщения: {e}")
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        logger.info(f"Голосовое интервью завершено для сессии {session_id}")
    except Exception as e:
        logger.error(f"Ошибка WebSocket: {e}")

# === СТАТИЧЕСКИЕ ФАЙЛЫ ===

# Подключение статических файлов для фронтенда
if os.path.exists("../frontend/build"):
    app.mount("/static", StaticFiles(directory="../frontend/build/static"), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Обслуживание React приложения"""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        
        index_file = Path("../frontend/build/index.html")
        if index_file.exists():
            return FileResponse(index_file)
        else:
            raise HTTPException(status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)