import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import fitz  # PyMuPDF
import requests
from PIL import Image
import io
import base64

logger = logging.getLogger(__name__)

class ResumeService:
    """Сервис анализа резюме с использованием VLM"""
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
        self.upload_dir = Path("uploads/resumes")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Системный промпт для анализа резюме
        self.system_prompt = """
        Ты - эксперт по анализу резюме. Проанализируй предоставленное резюме и оцени кандидата по следующим критериям.
        
        Верни результат СТРОГО в формате JSON со следующими полями:
        {
            "personal_info": {
                "name": "ФИО кандидата",
                "age": "возраст или null",
                "location": "город/регион",
                "contact": "телефон/email"
            },
            "experience": {
                "total_years": "общий стаж в годах",
                "relevant_years": "релевантный стаж в годах",
                "positions": ["список должностей"],
                "companies": ["список компаний"]
            },
            "skills": {
                "technical": ["технические навыки"],
                "soft": ["мягкие навыки"],
                "languages": ["языки программирования/иностранные языки"]
            },
            "education": {
                "degree": "уровень образования",
                "institution": "учебное заведение",
                "specialization": "специализация"
            },
            "assessment": {
                "technical_level": "junior/middle/senior",
                "leadership_potential": 1-10,
                "communication_skills": 1-10,
                "adaptability": 1-10,
                "problem_solving": 1-10,
                "overall_score": 1-100
            },
            "strengths": ["сильные стороны"],
            "weaknesses": ["слабые стороны"],
            "recommendations": ["рекомендации для HR"]
        }
        
        Оценивай объективно, основываясь только на информации из резюме.
        """
    
    async def analyze_resume(self, file_path: str) -> Dict[str, Any]:
        """
        Анализ резюме из PDF файла
        
        Args:
            file_path: Путь к PDF файлу резюме
            
        Returns:
            Словарь с результатами анализа
        """
        try:
            # Извлечение текста из PDF
            text_content = await self._extract_text_from_pdf(file_path)
            
            if not text_content.strip():
                raise Exception("Не удалось извлечь текст из PDF")
            
            # Анализ через LLM
            analysis_result = await self._analyze_with_llm(text_content)
            
            # Сохранение результата
            result_path = await self._save_analysis_result(file_path, analysis_result)
            
            analysis_result["analysis_file"] = result_path
            analysis_result["source_file"] = file_path
            
            logger.info(f"Анализ резюме завершен: {file_path}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Ошибка анализа резюме {file_path}: {e}")
            return self._create_error_response(str(e))
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """Извлечение текста из PDF файла"""
        try:
            doc = fitz.open(file_path)
            text_content = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_content += page.get_text()
                text_content += "\n\n"
            
            doc.close()
            
            if not text_content.strip():
                # Попытка OCR если текст не извлекается
                text_content = await self._ocr_pdf(file_path)
            
            return text_content.strip()
            
        except Exception as e:
            logger.error(f"Ошибка извлечения текста из PDF: {e}")
            raise Exception(f"Не удалось обработать PDF файл: {e}")
    
    async def _ocr_pdf(self, file_path: str) -> str:
        """OCR для PDF файлов без текстового слоя"""
        try:
            doc = fitz.open(file_path)
            text_content = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                # Конвертация страницы в изображение
                mat = fitz.Matrix(2.0, 2.0)  # Увеличение разрешения
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                
                # Здесь можно добавить OCR через внешний сервис
                # Пока возвращаем заглушку
                text_content += f"[Страница {page_num + 1} - требуется OCR]\n"
            
            doc.close()
            return text_content
            
        except Exception as e:
            logger.error(f"Ошибка OCR: {e}")
            return "[Не удалось извлечь текст из изображения]"
    
    async def _analyze_with_llm(self, text_content: str) -> Dict[str, Any]:
        """Анализ текста резюме через LLM"""
        try:
            # Подготовка промпта
            user_prompt = f"""
            Проанализируй следующее резюме:
            
            {text_content}
            
            Верни результат в формате JSON согласно инструкции.
            """
            
            # Вызов LLM
            response = await self.llm_service._call_llm(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            # Парсинг JSON ответа
            try:
                analysis_result = json.loads(response)
                return analysis_result
            except json.JSONDecodeError:
                # Попытка извлечь JSON из ответа
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    analysis_result = json.loads(json_str)
                    return analysis_result
                else:
                    raise Exception("LLM не вернул валидный JSON")
            
        except Exception as e:
            logger.error(f"Ошибка анализа через LLM: {e}")
            return self._create_fallback_analysis(text_content)
    
    def _create_fallback_analysis(self, text_content: str) -> Dict[str, Any]:
        """Создание базового анализа при ошибке LLM"""
        return {
            "personal_info": {
                "name": "Не определено",
                "age": None,
                "location": "Не указано",
                "contact": "Не указано"
            },
            "experience": {
                "total_years": 0,
                "relevant_years": 0,
                "positions": [],
                "companies": []
            },
            "skills": {
                "technical": [],
                "soft": [],
                "languages": []
            },
            "education": {
                "degree": "Не указано",
                "institution": "Не указано",
                "specialization": "Не указано"
            },
            "assessment": {
                "technical_level": "junior",
                "leadership_potential": 5,
                "communication_skills": 5,
                "adaptability": 5,
                "problem_solving": 5,
                "overall_score": 50
            },
            "strengths": ["Требуется дополнительный анализ"],
            "weaknesses": ["Требуется дополнительный анализ"],
            "recommendations": ["Провести личное собеседование"],
            "error": "Автоматический анализ недоступен",
            "raw_text": text_content[:500] + "..." if len(text_content) > 500 else text_content
        }
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Создание ответа об ошибке"""
        return {
            "error": error_message,
            "status": "failed",
            "personal_info": {"name": "Ошибка обработки"},
            "assessment": {"overall_score": 0}
        }
    
    async def _save_analysis_result(self, source_file: str, analysis: Dict[str, Any]) -> str:
        """Сохранение результата анализа"""
        try:
            source_path = Path(source_file)
            result_filename = f"{source_path.stem}_analysis.json"
            result_path = self.upload_dir / result_filename
            
            with open(result_path, 'w', encoding='utf-8') as f:
                json.dump(analysis, f, ensure_ascii=False, indent=2)
            
            return str(result_path)
            
        except Exception as e:
            logger.error(f"Ошибка сохранения анализа: {e}")
            return ""
    
    async def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """
        Сохранение загруженного файла
        
        Args:
            file_content: Содержимое файла
            filename: Имя файла
            
        Returns:
            Путь к сохраненному файлу
        """
        try:
            # Создание уникального имени файла
            file_path = self.upload_dir / filename
            counter = 1
            
            while file_path.exists():
                name_parts = filename.rsplit('.', 1)
                if len(name_parts) == 2:
                    new_filename = f"{name_parts[0]}_{counter}.{name_parts[1]}"
                else:
                    new_filename = f"{filename}_{counter}"
                file_path = self.upload_dir / new_filename
                counter += 1
            
            # Сохранение файла
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"Файл сохранен: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Ошибка сохранения файла: {e}")
            raise Exception(f"Не удалось сохранить файл: {e}")
    
    def get_analysis_history(self) -> list:
        """Получение истории анализов"""
        try:
            analyses = []
            
            for file_path in self.upload_dir.glob("*_analysis.json"):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        analysis = json.load(f)
                    
                    analyses.append({
                        "file": file_path.name,
                        "timestamp": file_path.stat().st_mtime,
                        "candidate_name": analysis.get("personal_info", {}).get("name", "Неизвестно"),
                        "overall_score": analysis.get("assessment", {}).get("overall_score", 0)
                    })
                except Exception as e:
                    logger.warning(f"Ошибка чтения анализа {file_path}: {e}")
            
            # Сортировка по времени (новые первыми)
            analyses.sort(key=lambda x: x["timestamp"], reverse=True)
            return analyses
            
        except Exception as e:
            logger.error(f"Ошибка получения истории: {e}")
            return []