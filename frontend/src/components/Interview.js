import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Interview.css';

const Interview = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/interview/start');
      setSessionId(response.data.session_id);
      setMessages([{
        role: 'assistant',
        content: response.data.first_question,
        timestamp: new Date().toISOString()
      }]);
      setInterviewStarted(true);
    } catch (error) {
      console.error('Error starting interview:', error);
      setMessages([{
        role: 'assistant',
        content: 'Извините, произошла ошибка при запуске интервью. Попробуйте еще раз.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/interview/message', {
        session_id: sessionId,
        message: currentMessage
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.interview_completed) {
        setInterviewCompleted(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const completeInterview = async () => {
    setLoading(true);
    try {
      await axios.post('/api/interview/complete', {
        session_id: sessionId
      });
      setInterviewCompleted(true);
    } catch (error) {
      console.error('Error completing interview:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interview">
      <div className="container">
        <div className="page-header">
          <h2>ИИ-Интервью</h2>
          <p>Пройдите интерактивное интервью с ИИ-ассистентом</p>
        </div>

        <div className="interview-container">
          {!interviewStarted ? (
            <div className="interview-start">
              <div className="start-card">
                <div className="start-icon">🤖</div>
                <h3>Готовы начать интервью?</h3>
                <p>
                  ИИ-ассистент задаст вам несколько вопросов о вашем опыте, навыках и карьерных целях. 
                  Отвечайте честно и подробно для получения наилучшей оценки.
                </p>
                <div className="interview-tips">
                  <h4>Советы для успешного интервью:</h4>
                  <ul>
                    <li>Будьте конкретными в ответах</li>
                    <li>Приводите примеры из вашего опыта</li>
                    <li>Не бойтесь задавать уточняющие вопросы</li>
                    <li>Интервью займет примерно 10-15 минут</li>
                  </ul>
                </div>
                <button 
                  onClick={startInterview} 
                  disabled={loading}
                  className="btn start-btn"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Подготовка...
                    </>
                  ) : (
                    'Начать интервью'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-container">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'assistant' ? '🤖' : '👤'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message assistant">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!interviewCompleted ? (
                <div className="chat-input">
                  <div className="input-container">
                    <textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Введите ваш ответ..."
                      disabled={loading}
                      rows="3"
                    />
                    <div className="input-actions">
                      <button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || loading}
                        className="btn send-btn"
                      >
                        Отправить
                      </button>
                      <button
                        onClick={completeInterview}
                        className="btn secondary-btn"
                        disabled={loading}
                      >
                        Завершить интервью
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="interview-completed">
                  <div className="completion-message">
                    <h3>Интервью завершено!</h3>
                    <p>Спасибо за ваши ответы. Результаты обрабатываются...</p>
                  </div>
                  <div className="next-steps">
                    <Link to="/voice-interview" className="btn">
                      Перейти к голосовому интервью
                    </Link>
                    <Link to="/coding-test" className="btn secondary-btn">
                      Выполнить тестовое задание
                    </Link>
                    <Link to="/results" className="btn secondary-btn">
                      Посмотреть результаты
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Interview;