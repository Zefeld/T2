import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CodingTest.css';

const CodingTest = () => {
  const [testData, setTestData] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentSessionId = localStorage.getItem('sessionId');
    const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
    
    if (!currentSessionId || !sessionData.resume_analyzed) {
      navigate('/');
      return;
    }
    
    setSessionId(currentSessionId);
  }, [navigate]);

  useEffect(() => {
    let timer;
    if (testStarted && timeLeft > 0 && !testCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testStarted, timeLeft, testCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTest = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/coding-test/start', {
        session_id: sessionId,
        language: language
      });
      
      setTestData(response.data);
      setCode(response.data.starter_code || '');
      setTimeLeft(response.data.time_limit || 1800); // 30 минут по умолчанию
      setTestStarted(true);
      
      // Update session data
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      sessionData.coding_test_started = true;
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error starting test:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/coding-test/run', {
        session_id: sessionId,
        code: code,
        language: language
      });
      
      setTestResults(response.data);
    } catch (error) {
      console.error('Error running code:', error);
      setTestResults({
        success: false,
        error: 'Ошибка при выполнении кода'
      });
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/coding-test/submit', {
        session_id: sessionId,
        code: code,
        language: language
      });
      
      setTestResults(response.data);
      setTestCompleted(true);
      
      // Update session data
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      sessionData.coding_test_completed = true;
      sessionData.coding_test_results = response.data;
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setLoading(false);
    }
  };

  const proceedToResults = () => {
    navigate('/results');
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  if (!testStarted) {
    return (
      <div className="coding-test">
        <div className="container">
          <div className="page-header">
            <h2>Тестовое задание</h2>
            <p>Продемонстрируйте ваши навыки программирования</p>
          </div>

          <div className="test-setup">
            <div className="setup-card">
              <div className="setup-icon">💻</div>
              <h3>Готовы к тестовому заданию?</h3>
              <p>
                Вам будет предложено решить практическую задачу по программированию. 
                У вас есть ограниченное время на выполнение задания.
              </p>

              <div className="language-selection">
                <h4>Выберите язык программирования:</h4>
                <div className="language-options">
                  <label className={`language-option ${language === 'python' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      value="python"
                      checked={language === 'python'}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                    <span className="language-icon">🐍</span>
                    <span className="language-name">Python</span>
                  </label>
                  
                  <label className={`language-option ${language === 'javascript' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      value="javascript"
                      checked={language === 'javascript'}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                    <span className="language-icon">🟨</span>
                    <span className="language-name">JavaScript</span>
                  </label>
                  
                  <label className={`language-option ${language === 'java' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      value="java"
                      checked={language === 'java'}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                    <span className="language-icon">☕</span>
                    <span className="language-name">Java</span>
                  </label>
                </div>
              </div>

              <div className="test-info">
                <h4>Информация о тесте:</h4>
                <ul>
                  <li>Время выполнения: 30 минут</li>
                  <li>Можно запускать код для проверки</li>
                  <li>Оценивается корректность и качество кода</li>
                  <li>Доступны базовые библиотеки языка</li>
                </ul>
              </div>

              <button 
                onClick={startTest} 
                disabled={loading}
                className="btn start-btn"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Подготовка задания...
                  </>
                ) : (
                  'Начать тестовое задание'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="coding-test">
      <div className="container">
        <div className="test-header">
          <div className="test-info-bar">
            <h2>Тестовое задание</h2>
            <div className="test-status">
              <div className="timer">
                <span className="timer-icon">⏱️</span>
                <span className={`timer-value ${timeLeft < 300 ? 'warning' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="language-badge">
                {language.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="test-workspace">
          <div className="task-panel">
            <div className="task-content">
              <h3>{testData?.title || 'Загрузка задания...'}</h3>
              <div className="task-description">
                {testData?.description ? (
                  <div dangerouslySetInnerHTML={{ __html: testData.description }} />
                ) : (
                  <p>Загрузка описания задания...</p>
                )}
              </div>
              
              {testData?.examples && (
                <div className="task-examples">
                  <h4>Примеры:</h4>
                  {testData.examples.map((example, index) => (
                    <div key={index} className="example">
                      <div className="example-input">
                        <strong>Вход:</strong> {example.input}
                      </div>
                      <div className="example-output">
                        <strong>Выход:</strong> {example.output}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="code-panel">
            <div className="code-editor">
              <div className="editor-header">
                <span>Редактор кода</span>
                <div className="editor-actions">
                  <button 
                    onClick={runCode} 
                    disabled={loading || !code.trim()}
                    className="btn run-btn"
                  >
                    {loading ? 'Выполнение...' : 'Запустить'}
                  </button>
                  <button 
                    onClick={submitTest} 
                    disabled={loading || testCompleted}
                    className="btn submit-btn"
                  >
                    {loading ? 'Отправка...' : 'Отправить решение'}
                  </button>
                </div>
              </div>
              
              <textarea
                value={code}
                onChange={handleCodeChange}
                placeholder={`Введите ваш код на ${language}...`}
                className="code-textarea"
                spellCheck="false"
                disabled={testCompleted}
              />
            </div>

            {testResults && (
              <div className="results-panel">
                <h4>Результаты выполнения:</h4>
                <div className={`result-content ${testResults.success ? 'success' : 'error'}`}>
                  {testResults.success ? (
                    <div>
                      <div className="result-status">✅ Код выполнен успешно</div>
                      {testResults.output && (
                        <div className="result-output">
                          <strong>Вывод:</strong>
                          <pre>{testResults.output}</pre>
                        </div>
                      )}
                      {testResults.tests_passed !== undefined && (
                        <div className="test-results">
                          <strong>Тесты пройдены:</strong> {testResults.tests_passed} из {testResults.total_tests}
                        </div>
                      )}
                      {testResults.score !== undefined && (
                        <div className="score-display">
                          <strong>Оценка:</strong> {testResults.score} из 100
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="result-status">❌ Ошибка выполнения</div>
                      <div className="result-error">
                        <strong>Ошибка:</strong>
                        <pre>{testResults.error}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {testCompleted && (
          <div className="test-completed">
            <div className="completion-message">
              <h3>Тестовое задание завершено!</h3>
              <p>Ваше решение отправлено на проверку. Результаты будут доступны в итоговом отчете.</p>
            </div>
            <div className="next-steps">
              <button onClick={proceedToResults} className="btn">
                Посмотреть результаты
              </button>
              <button onClick={() => navigate('/')} className="btn secondary-btn">
                Вернуться на главную
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingTest;