import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import './Results.css';

const Results = () => {
  const location = useLocation();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Получаем результаты из состояния роутера или загружаем с сервера
    if (location.state && location.state.results) {
      setResults(location.state.results);
      setLoading(false);
    } else {
      fetchResults();
    }
  }, [location.state]);

  const fetchResults = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/results/latest');
      setResults(response.data);
    } catch (err) {
      setError('Ошибка при загрузке результатов');
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/report/download', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'interview_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Отлично';
    if (score >= 60) return 'Хорошо';
    if (score >= 40) return 'Удовлетворительно';
    return 'Требует улучшения';
  };

  if (loading) {
    return (
      <div className="results">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results">
        <div className="error-container">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results">
        <div className="no-results">
          <h2>Результаты не найдены</h2>
          <p>Пройдите собеседование, чтобы увидеть результаты</p>
          <Link to="/" className="btn btn-primary">Начать собеседование</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="results">
      <div className="results-header">
        <h1>Результаты собеседования</h1>
        <div className="results-actions">
          <button onClick={downloadReport} className="btn btn-download">
            Скачать отчет
          </button>
          <Link to="/" className="btn btn-primary">
            Пройти заново
          </Link>
        </div>
      </div>

      <div className="overall-score">
        <div className="score-circle">
          <div 
            className="score-value" 
            style={{ color: getScoreColor(results.overallScore) }}
          >
            {results.overallScore}%
          </div>
          <div className="score-label">
            {getScoreLabel(results.overallScore)}
          </div>
        </div>
        <div className="score-description">
          <h3>Общий результат</h3>
          <p>{results.overallFeedback}</p>
        </div>
      </div>

      <div className="results-sections">
        {/* Анализ резюме */}
        {results.resumeAnalysis && (
          <div className="result-section">
            <div className="section-header">
              <h3>Анализ резюме</h3>
              <div 
                className="section-score"
                style={{ color: getScoreColor(results.resumeAnalysis.score) }}
              >
                {results.resumeAnalysis.score}%
              </div>
            </div>
            <div className="section-content">
              <div className="analysis-grid">
                <div className="analysis-item">
                  <h4>Сильные стороны</h4>
                  <ul>
                    {results.resumeAnalysis.strengths?.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div className="analysis-item">
                  <h4>Области для улучшения</h4>
                  <ul>
                    {results.resumeAnalysis.improvements?.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="recommendations">
                <h4>Рекомендации</h4>
                <p>{results.resumeAnalysis.recommendations}</p>
              </div>
            </div>
          </div>
        )}

        {/* Текстовое интервью */}
        {results.textInterview && (
          <div className="result-section">
            <div className="section-header">
              <h3>Текстовое интервью</h3>
              <div 
                className="section-score"
                style={{ color: getScoreColor(results.textInterview.score) }}
              >
                {results.textInterview.score}%
              </div>
            </div>
            <div className="section-content">
              <div className="interview-stats">
                <div className="stat-item">
                  <span className="stat-label">Вопросов отвечено:</span>
                  <span className="stat-value">{results.textInterview.questionsAnswered}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Время интервью:</span>
                  <span className="stat-value">{results.textInterview.duration}</span>
                </div>
              </div>
              <div className="feedback">
                <h4>Обратная связь</h4>
                <p>{results.textInterview.feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Голосовое интервью */}
        {results.voiceInterview && (
          <div className="result-section">
            <div className="section-header">
              <h3>Голосовое интервью</h3>
              <div 
                className="section-score"
                style={{ color: getScoreColor(results.voiceInterview.score) }}
              >
                {results.voiceInterview.score}%
              </div>
            </div>
            <div className="section-content">
              <div className="voice-analysis">
                <div className="analysis-grid">
                  <div className="analysis-item">
                    <h4>Качество речи</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${results.voiceInterview.speechQuality}%`,
                          backgroundColor: getScoreColor(results.voiceInterview.speechQuality)
                        }}
                      ></div>
                    </div>
                    <span>{results.voiceInterview.speechQuality}%</span>
                  </div>
                  <div className="analysis-item">
                    <h4>Уверенность</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${results.voiceInterview.confidence}%`,
                          backgroundColor: getScoreColor(results.voiceInterview.confidence)
                        }}
                      ></div>
                    </div>
                    <span>{results.voiceInterview.confidence}%</span>
                  </div>
                </div>
              </div>
              <div className="feedback">
                <h4>Обратная связь</h4>
                <p>{results.voiceInterview.feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Тестовое задание */}
        {results.codingTest && (
          <div className="result-section">
            <div className="section-header">
              <h3>Тестовое задание</h3>
              <div 
                className="section-score"
                style={{ color: getScoreColor(results.codingTest.score) }}
              >
                {results.codingTest.score}%
              </div>
            </div>
            <div className="section-content">
              <div className="coding-stats">
                <div className="stat-item">
                  <span className="stat-label">Время выполнения:</span>
                  <span className="stat-value">{results.codingTest.timeSpent}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Тесты пройдены:</span>
                  <span className="stat-value">
                    {results.codingTest.testsPassed}/{results.codingTest.totalTests}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Язык программирования:</span>
                  <span className="stat-value">{results.codingTest.language}</span>
                </div>
              </div>
              <div className="code-analysis">
                <h4>Анализ кода</h4>
                <div className="analysis-grid">
                  <div className="analysis-item">
                    <h5>Правильность</h5>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${results.codingTest.correctness}%`,
                          backgroundColor: getScoreColor(results.codingTest.correctness)
                        }}
                      ></div>
                    </div>
                    <span>{results.codingTest.correctness}%</span>
                  </div>
                  <div className="analysis-item">
                    <h5>Эффективность</h5>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${results.codingTest.efficiency}%`,
                          backgroundColor: getScoreColor(results.codingTest.efficiency)
                        }}
                      ></div>
                    </div>
                    <span>{results.codingTest.efficiency}%</span>
                  </div>
                  <div className="analysis-item">
                    <h5>Читаемость</h5>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${results.codingTest.readability}%`,
                          backgroundColor: getScoreColor(results.codingTest.readability)
                        }}
                      ></div>
                    </div>
                    <span>{results.codingTest.readability}%</span>
                  </div>
                </div>
              </div>
              <div className="feedback">
                <h4>Обратная связь</h4>
                <p>{results.codingTest.feedback}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="recommendations-section">
        <h3>Общие рекомендации</h3>
        <div className="recommendations-grid">
          {results.recommendations?.map((recommendation, index) => (
            <div key={index} className="recommendation-card">
              <h4>{recommendation.title}</h4>
              <p>{recommendation.description}</p>
              {recommendation.resources && (
                <div className="resources">
                  <h5>Полезные ресурсы:</h5>
                  <ul>
                    {recommendation.resources.map((resource, idx) => (
                      <li key={idx}>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Results;