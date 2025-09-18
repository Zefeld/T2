import asyncio
import logging
from typing import Dict, Any, Optional
import PyPDF2
import fitz  # PyMuPDF
import docx
import io
from pathlib import Path

from .gemma_client import GemmaClient

logger = logging.getLogger(__name__)

class ResumeAnalyzer:
    """Сервис анализа резюме с использованием Gemma 3"""
    
    def __init__(self, gemma_client: GemmaClient):
        self.gemma_client = gemma_client
        self.supported_formats = ['.pdf', '.docx', '.txt']
    
    async def analyze_resume(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Анализ резюме из файла (основной метод для совместимости)
        
        Args:
            file_content: Содержимое файла в байтах
            filename: Имя файла
            
        Returns:
            JSON с анализом резюме
        """
        return await self.analyze_resume_file(file_content, filename)
    
    async def analyze_resume_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Анализ резюме из файла
        
        Args:
            file_content: Содержимое файла в байтах
            filename: Имя файла
            
        Returns:
            JSON с анализом резюме
        """
        try:
            # Извлечение текста из файла
            text = await self._extract_text_from_file(file_content, filename)
            
            if not text.strip():
                return self._create_error_response("Не удалось извлечь текст из файла")
            
            # Анализ текста с помощью Gemma 3
            analysis = await self.gemma_client.analyze_resume_json(text)
            
            # Добавление метаданных
            analysis['metadata'] = {
                'filename': filename,
                'file_size': len(file_content),
                'text_length': len(text),
                'analysis_timestamp': self._get_timestamp()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Ошибка анализа резюме: {str(e)}")
            return self._create_error_response(f"Ошибка анализа: {str(e)}")
    
    async def analyze_resume_text(self, text: str) -> Dict[str, Any]:
        """
        Анализ резюме из текста
        
        Args:
            text: Текст резюме
            
        Returns:
            JSON с анализом резюме
        """
        try:
            if not text.strip():
                return self._create_error_response("Пустой текст резюме")
            
            analysis = await self.gemma_client.analyze_resume_json(text)
            
            analysis['metadata'] = {
                'source': 'text_input',
                'text_length': len(text),
                'analysis_timestamp': self._get_timestamp()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Ошибка анализа текста резюме: {str(e)}")
            return self._create_error_response(f"Ошибка анализа: {str(e)}")
    
    async def _extract_text_from_file(self, file_content: bytes, filename: str) -> str:
        """
        Извлечение текста из файла различных форматов
        
        Args:
            file_content: Содержимое файла
            filename: Имя файла
            
        Returns:
            Извлеченный текст
        """
        file_extension = Path(filename).suffix.lower()
        
        if file_extension == '.pdf':
            return await self._extract_from_pdf(file_content)
        elif file_extension == '.docx':
            return await self._extract_from_docx(file_content)
        elif file_extension == '.txt':
            return await self._extract_from_txt(file_content)
        else:
            raise ValueError(f"Неподдерживаемый формат файла: {file_extension}")
    
    async def _extract_from_pdf(self, file_content: bytes) -> str:
        """Извлечение текста из PDF"""
        text = ""
        
        try:
            # Попытка с PyMuPDF (лучше для сложных PDF)
            pdf_file = io.BytesIO(file_content)
            doc = fitz.open(stream=pdf_file, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            
            if text.strip():
                return text.strip()
                
        except Exception as e:
            logger.warning(f"PyMuPDF не смог обработать PDF: {str(e)}")
        
        try:
            # Резервный вариант с PyPDF2
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"PyPDF2 не смог обработать PDF: {str(e)}")
            raise ValueError(f"Не удалось прочитать PDF файл: {str(e)}")
    
    async def _extract_from_docx(self, file_content: bytes) -> str:
        """Извлечение текста из DOCX"""
        try:
            docx_file = io.BytesIO(file_content)
            doc = docx.Document(docx_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Ошибка извлечения текста из DOCX: {str(e)}")
            raise ValueError(f"Не удалось прочитать DOCX файл: {str(e)}")
    
    async def _extract_from_txt(self, file_content: bytes) -> str:
        """Извлечение текста из TXT"""
        try:
            # Попытка декодирования в различных кодировках
            encodings = ['utf-8', 'cp1251', 'latin1']
            
            for encoding in encodings:
                try:
                    return file_content.decode(encoding)
                except UnicodeDecodeError:
                    continue
            
            # Если все кодировки не сработали
            raise ValueError("Не удалось определить кодировку файла")
            
        except Exception as e:
            logger.error(f"Ошибка извлечения текста из TXT: {str(e)}")
            raise ValueError(f"Не удалось прочитать TXT файл: {str(e)}")
    
    def validate_file_format(self, filename: str) -> bool:
        """
        Проверка поддерживаемого формата файла
        
        Args:
            filename: Имя файла
            
        Returns:
            True если формат поддерживается
        """
        file_extension = Path(filename).suffix.lower()
        return file_extension in self.supported_formats
    
    def get_supported_formats(self) -> list:
        """Получение списка поддерживаемых форматов"""
        return self.supported_formats.copy()
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Создание ответа об ошибке"""
        return {
            "error": True,
            "message": error_message,
            "personal_info": {
                "name": "Ошибка",
                "position": "Не определено",
                "experience_years": 0
            },
            "skills": {
                "technical_skills": [],
                "soft_skills": [],
                "languages": []
            },
            "experience": {
                "companies": [],
                "roles": [],
                "achievements": []
            },
            "education": {
                "degree": "Не определено",
                "institution": "Не определено",
                "specialization": "Не определено"
            },
            "assessment": {
                "overall_score": 0,
                "strengths": [],
                "weaknesses": [error_message],
                "recommendation": "Необходимо исправить ошибки и повторить анализ"
            },
            "metadata": {
                "analysis_timestamp": self._get_timestamp(),
                "error": True
            }
        }
    
    def _get_timestamp(self) -> str:
        """Получение текущего времени в ISO формате"""
        from datetime import datetime
        return datetime.now().isoformat()