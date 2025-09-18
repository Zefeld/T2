import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime
import uuid
import os
from pathlib import Path

from .gemma_client import GemmaClient

logger = logging.getLogger(__name__)

class ReportService:
    """Сервис генерации отчетов для работодателей"""
    
    def __init__(self, gemma_client: GemmaClient, reports_dir: str = "reports"):
        self.gemma_client = gemma_client
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(exist_ok=True)
        self.candidate_reports = {}  # Хранение отчетов по кандидатам
        
    async def create_candidate_report(self, candidate_id: str, candidate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Создание комплексного отчета по кандидату
        
        Args:
            candidate_id: ID кандидата
            candidate_data: Данные кандидата со всех этапов
            
        Returns:
            Сгенерированный отчет
        """
        try:
            report_id = str(uuid.uuid4())
            
            # Извлечение данных по этапам
            resume_analysis = candidate_data.get('resume_analysis', {})
            interview_results = candidate_data.get('interview_results', {})
            coding_test_results = candidate_data.get('coding_test_results', {})
            
            # Генерация основного отчета
            main_report = await self._generate_main_report(
                resume_analysis, interview_results, coding_test_results
            )
            
            # Создание сводной таблицы
            summary_table = await self._create_summary_table(
                resume_analysis, interview_results, coding_test_results
            )
            
            # Генерация рекомендаций
            recommendations = await self._generate_recommendations(
                resume_analysis, interview_results, coding_test_results
            )
            
            # Создание транскрипции интервью
            interview_transcript = self._format_interview_transcript(interview_results)
            
            # Формирование финального отчета
            final_report = {
                'report_id': report_id,
                'candidate_id': candidate_id,
                'generated_at': datetime.now().isoformat(),
                'candidate_info': self._extract_candidate_info(resume_analysis),
                'summary_table': summary_table,
                'main_report': main_report,
                'recommendations': recommendations,
                'interview_transcript': interview_transcript,
                'attachments': {
                    'resume_analysis': resume_analysis,
                    'interview_results': interview_results,
                    'coding_test_results': coding_test_results
                },
                'overall_score': self._calculate_overall_score(
                    resume_analysis, interview_results, coding_test_results
                ),
                'hiring_recommendation': self._get_hiring_recommendation(
                    resume_analysis, interview_results, coding_test_results
                )
            }
            
            # Сохранение отчета
            await self._save_report(report_id, final_report)
            self.candidate_reports[candidate_id] = final_report
            
            return {
                'report_id': report_id,
                'status': 'generated',
                'summary': summary_table,
                'overall_score': final_report['overall_score'],
                'recommendation': final_report['hiring_recommendation'],
                'report_url': f"/reports/{report_id}"
            }
            
        except Exception as e:
            logger.error(f"Ошибка создания отчета: {str(e)}")
            return {
                'error': True,
                'message': f"Ошибка создания отчета: {str(e)}"
            }
    
    async def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Получение отчета по ID
        
        Args:
            report_id: ID отчета
            
        Returns:
            Отчет или None если не найден
        """
        try:
            report_path = self.reports_dir / f"{report_id}.json"
            
            if report_path.exists():
                with open(report_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            return None
            
        except Exception as e:
            logger.error(f"Ошибка получения отчета: {str(e)}")
            return None
    
    async def get_candidate_reports(self, candidate_id: str) -> List[Dict[str, Any]]:
        """
        Получение всех отчетов по кандидату
        
        Args:
            candidate_id: ID кандидата
            
        Returns:
            Список отчетов
        """
        reports = []
        
        try:
            for report_file in self.reports_dir.glob("*.json"):
                with open(report_file, 'r', encoding='utf-8') as f:
                    report = json.load(f)
                    if report.get('candidate_id') == candidate_id:
                        reports.append(report)
            
            # Сортировка по дате создания
            reports.sort(key=lambda x: x.get('generated_at', ''), reverse=True)
            
        except Exception as e:
            logger.error(f"Ошибка получения отчетов кандидата: {str(e)}")
        
        return reports
    
    async def generate_batch_report(self, candidate_ids: List[str]) -> Dict[str, Any]:
        """
        Генерация пакетного отчета по нескольким кандидатам
        
        Args:
            candidate_ids: Список ID кандидатов
            
        Returns:
            Пакетный отчет
        """
        try:
            batch_id = str(uuid.uuid4())
            candidates_data = []
            
            for candidate_id in candidate_ids:
                reports = await self.get_candidate_reports(candidate_id)
                if reports:
                    latest_report = reports[0]  # Последний отчет
                    candidates_data.append({
                        'candidate_id': candidate_id,
                        'report': latest_report
                    })
            
            # Создание сравнительного анализа
            comparison = await self._create_candidates_comparison(candidates_data)
            
            # Ранжирование кандидатов
            ranking = self._rank_candidates(candidates_data)
            
            batch_report = {
                'batch_id': batch_id,
                'generated_at': datetime.now().isoformat(),
                'candidates_count': len(candidates_data),
                'candidates_summary': [
                    {
                        'candidate_id': data['candidate_id'],
                        'name': data['report']['candidate_info'].get('name', 'Не указано'),
                        'overall_score': data['report']['overall_score'],
                        'recommendation': data['report']['hiring_recommendation']
                    }
                    for data in candidates_data
                ],
                'comparison_analysis': comparison,
                'ranking': ranking,
                'top_candidates': ranking[:3] if len(ranking) >= 3 else ranking
            }
            
            # Сохранение пакетного отчета
            batch_path = self.reports_dir / f"batch_{batch_id}.json"
            with open(batch_path, 'w', encoding='utf-8') as f:
                json.dump(batch_report, f, ensure_ascii=False, indent=2)
            
            return batch_report
            
        except Exception as e:
            logger.error(f"Ошибка создания пакетного отчета: {str(e)}")
            return {
                'error': True,
                'message': f"Ошибка создания пакетного отчета: {str(e)}"
            }
    
    async def _generate_main_report(self, resume_analysis: Dict[str, Any], 
                                  interview_results: Dict[str, Any], 
                                  coding_test_results: Dict[str, Any]) -> str:
        """Генерация основного текстового отчета"""
        system_prompt = """
        Создай подробный отчет о кандидате для работодателя на основе результатов всех этапов отбора.
        
        Отчет должен включать:
        1. Краткое резюме кандидата
        2. Анализ технических навыков
        3. Оценку коммуникативных способностей
        4. Результаты тестового задания
        5. Общие выводы и рекомендации
        
        Стиль: профессиональный, объективный, конструктивный.
        """
        
        prompt = f"""
        Данные кандидата:
        
        Анализ резюме: {json.dumps(resume_analysis, ensure_ascii=False)}
        
        Результаты интервью: {json.dumps(interview_results, ensure_ascii=False)}
        
        Результаты тестового задания: {json.dumps(coding_test_results, ensure_ascii=False)}
        
        Создай комплексный отчет о кандидате.
        """
        
        try:
            return await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=2000)
        except Exception as e:
            logger.error(f"Ошибка генерации основного отчета: {str(e)}")
            return f"Ошибка генерации отчета: {str(e)}"
    
    async def _create_summary_table(self, resume_analysis: Dict[str, Any], 
                                  interview_results: Dict[str, Any], 
                                  coding_test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Создание сводной таблицы с оценками"""
        
        # Извлечение оценок из каждого этапа
        resume_score = resume_analysis.get('overall_score', 0)
        interview_score = interview_results.get('overall_score', 0)
        coding_score = coding_test_results.get('final_report', {}).get('overall_score', 0)
        
        # Технические навыки
        technical_skills = resume_analysis.get('technical_skills', [])
        
        # Soft skills из интервью
        soft_skills = interview_results.get('soft_skills_assessment', {})
        
        # Опыт работы
        experience = resume_analysis.get('experience_years', 0)
        experience_level = resume_analysis.get('experience_level', 'junior')
        
        summary_table = {
            'candidate_scores': {
                'resume_analysis': resume_score,
                'interview_performance': interview_score,
                'coding_test': coding_score,
                'overall_average': round((resume_score + interview_score + coding_score) / 3, 1)
            },
            'technical_assessment': {
                'programming_skills': technical_skills,
                'coding_test_language': coding_test_results.get('final_report', {}).get('best_submission', {}).get('language', 'N/A'),
                'algorithm_efficiency': coding_test_results.get('final_report', {}).get('best_submission', {}).get('assessment', {}).get('algorithm_efficiency', 0),
                'code_quality': coding_test_results.get('final_report', {}).get('best_submission', {}).get('assessment', {}).get('code_quality', 0)
            },
            'soft_skills_assessment': {
                'communication': soft_skills.get('communication', 0),
                'problem_solving': soft_skills.get('problem_solving', 0),
                'teamwork': soft_skills.get('teamwork', 0),
                'leadership': soft_skills.get('leadership', 0)
            },
            'experience_profile': {
                'years_of_experience': experience,
                'experience_level': experience_level,
                'relevant_projects': len(resume_analysis.get('projects', [])),
                'education_level': resume_analysis.get('education', {}).get('level', 'Не указано')
            },
            'interview_highlights': {
                'total_questions': interview_results.get('total_questions', 0),
                'response_quality': interview_results.get('average_response_quality', 0),
                'engagement_level': interview_results.get('engagement_score', 0)
            }
        }
        
        return summary_table
    
    async def _generate_recommendations(self, resume_analysis: Dict[str, Any], 
                                      interview_results: Dict[str, Any], 
                                      coding_test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Генерация рекомендаций по найму"""
        system_prompt = """
        На основе результатов всех этапов отбора создай рекомендации для работодателя.
        
        Включи:
        1. Рекомендацию по найму (hire/consider/reject)
        2. Сильные стороны кандидата
        3. Области для развития
        4. Подходящие роли/позиции
        5. Условия найма (если применимо)
        
        Отвечай в формате JSON:
        {
            "hiring_decision": "hire/consider/reject",
            "confidence_level": "high/medium/low",
            "strengths": ["сильная_сторона1", "сильная_сторона2"],
            "development_areas": ["область1", "область2"],
            "suitable_roles": ["роль1", "роль2"],
            "salary_range_recommendation": "диапазон",
            "onboarding_suggestions": ["предложение1", "предложение2"],
            "risk_factors": ["риск1", "риск2"],
            "additional_notes": "дополнительные_заметки"
        }
        """
        
        prompt = f"""
        Результаты оценки кандидата:
        
        Резюме: {json.dumps(resume_analysis, ensure_ascii=False)}
        Интервью: {json.dumps(interview_results, ensure_ascii=False)}
        Тестовое задание: {json.dumps(coding_test_results, ensure_ascii=False)}
        
        Создай рекомендации по найму.
        """
        
        try:
            response = await self.gemma_client.generate_response(prompt, system_prompt, max_tokens=1000)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Ошибка генерации рекомендаций: {str(e)}")
            return {
                "hiring_decision": "consider",
                "confidence_level": "low",
                "strengths": ["Прошел все этапы отбора"],
                "development_areas": ["Требуется дополнительная оценка"],
                "suitable_roles": ["Требует уточнения"],
                "salary_range_recommendation": "Требует анализа рынка",
                "onboarding_suggestions": ["Стандартная программа адаптации"],
                "risk_factors": [f"Ошибка автоматической оценки: {str(e)}"],
                "additional_notes": "Рекомендуется ручная проверка результатов"
            }
    
    def _format_interview_transcript(self, interview_results: Dict[str, Any]) -> str:
        """Форматирование транскрипции интервью"""
        try:
            transcript = interview_results.get('transcript', [])
            
            if not transcript:
                return "Транскрипция интервью недоступна"
            
            formatted_lines = []
            formatted_lines.append("=== ТРАНСКРИПЦИЯ ИНТЕРВЬЮ ===\n")
            
            for entry in transcript:
                timestamp = entry.get('timestamp', 'N/A')
                speaker = entry.get('speaker', 'Unknown')
                message = entry.get('message', '')
                
                formatted_lines.append(f"[{timestamp}] {speaker}: {message}")
            
            formatted_lines.append(f"\n=== КОНЕЦ ТРАНСКРИПЦИИ ===")
            
            return "\n".join(formatted_lines)
            
        except Exception as e:
            logger.error(f"Ошибка форматирования транскрипции: {str(e)}")
            return f"Ошибка форматирования транскрипции: {str(e)}"
    
    def _extract_candidate_info(self, resume_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Извлечение основной информации о кандидате"""
        personal_info = resume_analysis.get('personal_info', {})
        
        return {
            'name': personal_info.get('name', 'Не указано'),
            'email': personal_info.get('email', 'Не указано'),
            'phone': personal_info.get('phone', 'Не указано'),
            'position': personal_info.get('position', 'Не указано'),
            'location': personal_info.get('location', 'Не указано'),
            'experience_years': resume_analysis.get('experience_years', 0),
            'education': resume_analysis.get('education', {}),
            'key_skills': resume_analysis.get('technical_skills', [])[:5]  # Топ 5 навыков
        }
    
    def _calculate_overall_score(self, resume_analysis: Dict[str, Any], 
                               interview_results: Dict[str, Any], 
                               coding_test_results: Dict[str, Any]) -> float:
        """Расчет общей оценки кандидата"""
        try:
            # Веса для каждого этапа
            weights = {
                'resume': 0.25,
                'interview': 0.40,
                'coding': 0.35
            }
            
            resume_score = resume_analysis.get('overall_score', 0)
            interview_score = interview_results.get('overall_score', 0)
            coding_score = coding_test_results.get('final_report', {}).get('overall_score', 0)
            
            overall_score = (
                resume_score * weights['resume'] +
                interview_score * weights['interview'] +
                coding_score * weights['coding']
            )
            
            return round(overall_score, 1)
            
        except Exception as e:
            logger.error(f"Ошибка расчета общей оценки: {str(e)}")
            return 0.0
    
    def _get_hiring_recommendation(self, resume_analysis: Dict[str, Any], 
                                 interview_results: Dict[str, Any], 
                                 coding_test_results: Dict[str, Any]) -> str:
        """Получение рекомендации по найму на основе оценок"""
        overall_score = self._calculate_overall_score(
            resume_analysis, interview_results, coding_test_results
        )
        
        if overall_score >= 8.0:
            return "hire"
        elif overall_score >= 6.0:
            return "consider"
        else:
            return "reject"
    
    async def _create_candidates_comparison(self, candidates_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Создание сравнительного анализа кандидатов"""
        if len(candidates_data) < 2:
            return {"message": "Недостаточно кандидатов для сравнения"}
        
        comparison = {
            'total_candidates': len(candidates_data),
            'score_distribution': {},
            'skills_analysis': {},
            'experience_comparison': {},
            'top_performers': []
        }
        
        # Анализ распределения оценок
        scores = [data['report']['overall_score'] for data in candidates_data]
        comparison['score_distribution'] = {
            'average': round(sum(scores) / len(scores), 1),
            'highest': max(scores),
            'lowest': min(scores),
            'median': sorted(scores)[len(scores) // 2]
        }
        
        # Топ исполнители
        sorted_candidates = sorted(
            candidates_data, 
            key=lambda x: x['report']['overall_score'], 
            reverse=True
        )
        
        comparison['top_performers'] = [
            {
                'candidate_id': data['candidate_id'],
                'name': data['report']['candidate_info'].get('name', 'Не указано'),
                'score': data['report']['overall_score'],
                'recommendation': data['report']['hiring_recommendation']
            }
            for data in sorted_candidates[:5]  # Топ 5
        ]
        
        return comparison
    
    def _rank_candidates(self, candidates_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ранжирование кандидатов по общей оценке"""
        return sorted(
            [
                {
                    'rank': i + 1,
                    'candidate_id': data['candidate_id'],
                    'name': data['report']['candidate_info'].get('name', 'Не указано'),
                    'overall_score': data['report']['overall_score'],
                    'recommendation': data['report']['hiring_recommendation'],
                    'key_strengths': data['report']['recommendations'].get('strengths', [])[:3]
                }
                for i, data in enumerate(sorted(
                    candidates_data, 
                    key=lambda x: x['report']['overall_score'], 
                    reverse=True
                ))
            ],
            key=lambda x: x['overall_score'],
            reverse=True
        )
    
    async def _save_report(self, report_id: str, report_data: Dict[str, Any]):
        """Сохранение отчета в файл"""
        try:
            report_path = self.reports_dir / f"{report_id}.json"
            
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Отчет {report_id} сохранен")
            
        except Exception as e:
            logger.error(f"Ошибка сохранения отчета: {str(e)}")
            raise
    
    async def export_report_to_formats(self, report_id: str, formats: List[str] = ['json', 'txt']) -> Dict[str, str]:
        """
        Экспорт отчета в различные форматы
        
        Args:
            report_id: ID отчета
            formats: Список форматов ('json', 'txt', 'csv')
            
        Returns:
            Словарь с путями к экспортированным файлам
        """
        try:
            report = await self.get_report(report_id)
            if not report:
                return {'error': 'Отчет не найден'}
            
            export_paths = {}
            
            for format_type in formats:
                if format_type == 'json':
                    # JSON уже сохранен
                    export_paths['json'] = str(self.reports_dir / f"{report_id}.json")
                
                elif format_type == 'txt':
                    # Текстовый формат
                    txt_path = self.reports_dir / f"{report_id}.txt"
                    with open(txt_path, 'w', encoding='utf-8') as f:
                        f.write(self._format_report_as_text(report))
                    export_paths['txt'] = str(txt_path)
            
            return export_paths
            
        except Exception as e:
            logger.error(f"Ошибка экспорта отчета: {str(e)}")
            return {'error': f"Ошибка экспорта: {str(e)}"}
    
    def _format_report_as_text(self, report: Dict[str, Any]) -> str:
        """Форматирование отчета в текстовый вид"""
        lines = []
        
        lines.append("=" * 60)
        lines.append("ОТЧЕТ О КАНДИДАТЕ")
        lines.append("=" * 60)
        lines.append("")
        
        # Основная информация
        candidate_info = report.get('candidate_info', {})
        lines.append("ИНФОРМАЦИЯ О КАНДИДАТЕ:")
        lines.append(f"Имя: {candidate_info.get('name', 'Не указано')}")
        lines.append(f"Email: {candidate_info.get('email', 'Не указано')}")
        lines.append(f"Позиция: {candidate_info.get('position', 'Не указано')}")
        lines.append(f"Опыт: {candidate_info.get('experience_years', 0)} лет")
        lines.append("")
        
        # Сводная таблица
        summary = report.get('summary_table', {})
        scores = summary.get('candidate_scores', {})
        lines.append("ОЦЕНКИ:")
        lines.append(f"Резюме: {scores.get('resume_analysis', 0)}/10")
        lines.append(f"Интервью: {scores.get('interview_performance', 0)}/10")
        lines.append(f"Тестовое задание: {scores.get('coding_test', 0)}/10")
        lines.append(f"Общая оценка: {scores.get('overall_average', 0)}/10")
        lines.append("")
        
        # Рекомендации
        recommendations = report.get('recommendations', {})
        lines.append("РЕКОМЕНДАЦИЯ ПО НАЙМУ:")
        lines.append(f"Решение: {recommendations.get('hiring_decision', 'Не определено')}")
        lines.append(f"Уровень уверенности: {recommendations.get('confidence_level', 'Не определен')}")
        lines.append("")
        
        # Основной отчет
        lines.append("ПОДРОБНЫЙ АНАЛИЗ:")
        lines.append(report.get('main_report', 'Отчет недоступен'))
        lines.append("")
        
        # Транскрипция
        lines.append("ТРАНСКРИПЦИЯ ИНТЕРВЬЮ:")
        lines.append(report.get('interview_transcript', 'Транскрипция недоступна'))
        
        return "\n".join(lines)
    
    async def get_reports_statistics(self) -> Dict[str, Any]:
        """Получение статистики по отчетам"""
        try:
            total_reports = len(list(self.reports_dir.glob("*.json")))
            
            # Подсчет рекомендаций
            recommendations_count = {'hire': 0, 'consider': 0, 'reject': 0}
            
            for report_file in self.reports_dir.glob("*.json"):
                try:
                    with open(report_file, 'r', encoding='utf-8') as f:
                        report = json.load(f)
                        recommendation = report.get('hiring_recommendation', 'unknown')
                        if recommendation in recommendations_count:
                            recommendations_count[recommendation] += 1
                except Exception:
                    continue
            
            return {
                'total_reports': total_reports,
                'recommendations_distribution': recommendations_count,
                'reports_directory': str(self.reports_dir)
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики: {str(e)}")
            return {'error': f"Ошибка получения статистики: {str(e)}"}