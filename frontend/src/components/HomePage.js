import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли сохраненная сессия
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
      loadSession(savedSessionId);
    }
  }, []);

  const createNewSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      const response = await axios.post('/api/create-session', formData);
      const newSessionId = response.data.session_id;
      
      setSessionId(newSessionId);
      localStorage.setItem('sessionId', newSessionId);
      
      // Загружаем данные сессии
      await loadSession(newSessionId);
      
    } catch (err) {
      setError('Ошибка создания сессии: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (id) => {
    try {
      const response = await axios.get(`/api/sessions/${id}`);
      setSessionData(response.data);
      setSessionId(id);
    } catch (err) {
      console.error('Ошибка загрузки сессии:', err);
      // Если сессия не найдена, удаляем из localStorage
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setSessionData(null);
    }
  };

  const startNewAssessment = () => {
    if (sessionId) {
      // Сбрасываем текущую сессию
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setSessionData(null);
    }
    createNewSession();
  };

  const continueAssessment = () => {
    if (!sessionData) return;
    
    // Переходим к следующему шагу в зависимости от текущего состояния
    switch (sessionData.current_step) {
      case 'resume':
        navigate('/resume');
        break;
      case 'interview':
        navigate('/interview');
        break;
      case 'coding_test':
        navigate('/coding-test');
        break;
      case 'completed':
        navigate('/results');
        break;
      default:
        navigate('/resume');
    }
  };

  const getStepStatus = (step) => {
    if (!sessionData) return 'pending';
    
    switch (step) {
      case 'resume':
        return sessionData.resume_analysis ? 'completed' : 
               sessionData.current_step === 'resume' ? 'active' : 'pending';
      case 'interview':
        return sessionData.interview_data?.final_result ? 'completed' :
               sessionData.current_step === 'interview' || sessionData.current_step === 'interview_active' ? 'active' : 
               sessionData.resume_analysis ? 'available' : 'pending';
      case 'coding_test':
        return sessionData.coding_test_data?.result ? 'completed' :
               sessionData.current_step === 'coding_test' || sessionData.current_step === 'coding_test_active' ? 'active' :
               sessionData.interview_data ? 'available' : 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <div className="home-page">
      <div className="container">
        <div className="welcome-section">
          <h2>Добро пожаловать в систему оценки кандидатов</h2>
          <p>Пройдите три этапа оценки для получения персонализированной обратной связи</p>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="session-controls">
            {!sessionId ? (
              <button 
                onClick={createNewSession} 
                disabled={loading}
                className="btn primary-btn"
              >
                {loading ? 'Создание сессии...' : 'Начать оценку'}
              </button>
            ) : (
              <div className="session-info">
                <p>Сессия: {sessionId.substring(0, 8)}...</p>
                <div className="session-buttons">
                  <button 
                    onClick={continueAssessment}
                    className="btn primary-btn"
                  >
                    Продолжить
                  </button>
                  <button 
                    onClick={startNewAssessment}
                    className="btn secondary-btn"
                  >
                    Начать заново
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="steps-grid">
          <div className={`step-card ${getStepStatus('resume')}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Анализ резюме</h3>
              <p>Загрузите ваше резюме в формате PDF для автоматического анализа ключевых навыков и опыта</p>
              <button 
                onClick={() => navigate('/resume')}
                disabled={!sessionId || getStepStatus('resume') === 'pending'}
                className="btn step-btn"
              >
                {getStepStatus('resume') === 'completed' ? 'Просмотреть результат' : 'Загрузить резюме'}
              </button>
            </div>
          </div>

          <div className={`step-card ${getStepStatus('interview')}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>ИИ-Интервью</h3>
              <p>Пройдите интерактивное интервью с ИИ-ассистентом, который задаст вопросы о вашем опыте</p>
              <button 
                onClick={() => navigate('/interview')}
                disabled={!sessionId || getStepStatus('interview') === 'pending'}
                className="btn step-btn"
              >
                {getStepStatus('interview') === 'completed' ? 'Просмотреть результат' : 'Начать интервью'}
              </button>
            </div>
          </div>

          <div className={`step-card ${getStepStatus('coding_test')}`}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Тестовое задание</h3>
              <p>Выполните практическое задание для демонстрации ваших технических навыков</p>
              <button 
                onClick={() => navigate('/coding-test')}
                disabled={!sessionId || getStepStatus('coding_test') === 'pending'}
                className="btn step-btn"
              >
                {getStepStatus('coding_test') === 'completed' ? 'Просмотреть результат' : 'Выполнить тест'}
              </button>
            </div>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h4>Что вас ждет?</h4>
            <ul>
              <li>Персонализированная оценка ваших навыков</li>
              <li>Детальная обратная связь по каждому этапу</li>
              <li>Рекомендации для профессионального развития</li>
              <li>Возможность голосового интервью в реальном времени</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h4>Технические требования</h4>
            <ul>
              <li>Современный веб-браузер</li>
              <li>Микрофон для голосового интервью</li>
              <li>Резюме в формате PDF</li>
              <li>Стабильное интернет-соединение</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;