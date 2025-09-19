import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Interview.css';

const Interview = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Voice-related states
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const currentSessionId = localStorage.getItem('sessionId');
    const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
    
    if (!currentSessionId || !sessionData.resume_analyzed) {
      navigate('/');
      return;
    }
    
    setSessionId(currentSessionId);
  }, [navigate]);

  // Initialize media recorder
  useEffect(() => {
    if (voiceMode && !mediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setAudioChunks(prev => [...prev, event.data]);
            }
          };
          
          recorder.onstop = () => {
            // Audio processing will be handled in stopRecording
          };
        })
        .catch(error => {
          console.error('Error accessing microphone:', error);
          alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
          setVoiceMode(false);
        });
    }
  }, [voiceMode, mediaRecorder]);

  const startInterview = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      
      const response = await axios.post('/api/start-interview', formData);
      
      const firstMessage = {
        role: 'assistant',
        content: response.data.first_question,
        timestamp: new Date().toISOString()
      };
      
      setMessages([firstMessage]);
      setInterviewStarted(true);
      
      // If voice mode is enabled, play the first question
      if (voiceMode) {
        await playAudioResponse(response.data.first_question);
      }
      
      // Update session data
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      sessionData.interview_started = true;
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      
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
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('message', currentMessage);
      
      const response = await axios.post('/api/interview-message', formData);

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If voice mode is enabled, play the response
      if (voiceMode) {
        await playAudioResponse(response.data.response);
      }

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

  const startRecording = () => {
    if (!mediaRecorder || isRecording) return;
    
    setAudioChunks([]);
    setIsRecording(true);
    mediaRecorder.start();
  };

  const stopRecording = async () => {
    if (!mediaRecorder || !isRecording) return;
    
    setIsRecording(false);
    mediaRecorder.stop();
    
    // Wait for the audio chunks to be processed
    setTimeout(async () => {
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        setAudioChunks([]);
      }
    }, 100);
  };

  const sendVoiceMessage = async (audioBlob) => {
    if (!sessionId || loading) return;

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.wav');
      formData.append('session_id', sessionId);

      const response = await axios.post('/api/voice-interview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add user message (transcription)
      const userMessage = {
        role: 'user',
        content: response.data.transcription,
        timestamp: new Date().toISOString(),
        isVoice: true
      };

      setMessages(prev => [...prev, userMessage]);

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        audioUrl: response.data.audio_url
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Play the audio response
      if (response.data.audio_url) {
        await playAudioFromUrl(response.data.audio_url);
      }

    } catch (error) {
      console.error('Error sending voice message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Извините, произошла ошибка при обработке голосового сообщения.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const playAudioResponse = async (text) => {
    // This would generate TTS audio for the text
    // For now, we'll just log it
    console.log('Playing TTS for:', text);
  };

  const playAudioFromUrl = async (audioUrl) => {
    if (currentAudio) {
      currentAudio.pause();
    }

    try {
      const audio = new Audio(`http://localhost:8000${audioUrl}`);
      setCurrentAudio(audio);
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        console.error('Error playing audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
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
      const formData = new FormData();
      formData.append('session_id', sessionId);
      
      const response = await axios.post('/api/interview/complete', formData);
      
      setInterviewCompleted(true);
      
      // Update session data
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      sessionData.interview_completed = true;
      sessionData.interview_results = response.data;
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      
    } catch (error) {
      console.error('Error completing interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const proceedToResults = () => {
    navigate('/results');
  };

  const proceedToCodingTest = () => {
    navigate('/coding-test');
  };

  return (
    <div className="interview">
      <div className="container">
        <div className="page-header">
          <h2>ИИ-Интервью</h2>
          <p>Пройдите интерактивное интервью с ИИ-ассистентом</p>
          <div className="voice-toggle">
            <button 
              onClick={toggleVoiceMode}
              className={`btn voice-toggle-btn ${voiceMode ? 'active' : ''}`}
            >
              {voiceMode ? '🎤 Голосовой режим' : '💬 Текстовый режим'}
            </button>
          </div>
        </div>

        <div className="interview-container">
          {!interviewStarted ? (
            <div className="interview-start">
              <div className="start-card">
                <div className="start-icon">🤖</div>
                <h3>Готовы начать интервью?</h3>
                <p>
                  ИИ-ассистент задаст вам несколько вопросов о вашем опыте, навыках и карьерных целях. 
                  {voiceMode ? 
                    ' В голосовом режиме вы можете отвечать голосом, а ИИ будет озвучивать вопросы.' :
                    ' Отвечайте честно и подробно для получения наилучшей оценки.'
                  }
                </p>
                <div className="interview-tips">
                  <h4>Советы для успешного интервью:</h4>
                  <ul>
                    <li>Будьте конкретными в ответах</li>
                    <li>Приводите примеры из вашего опыта</li>
                    <li>Не бойтесь задавать уточняющие вопросы</li>
                    <li>Интервью займет примерно 10-15 минут</li>
                    {voiceMode && <li>Говорите четко и не слишком быстро</li>}
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
                      <div className="message-text">
                        {message.content}
                        {message.isVoice && <span className="voice-indicator">🎤</span>}
                      </div>
                      {message.audioUrl && (
                        <button 
                          onClick={() => playAudioFromUrl(message.audioUrl)}
                          className="btn audio-play-btn"
                          disabled={isPlaying}
                        >
                          {isPlaying ? '⏸️ Остановить' : '▶️ Прослушать'}
                        </button>
                      )}
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
                  {voiceMode ? (
                    <div className="voice-input-container">
                      <div className="voice-controls">
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={loading}
                          className={`btn voice-record-btn ${isRecording ? 'recording' : ''}`}
                        >
                          {isRecording ? (
                            <>
                              <div className="recording-indicator"></div>
                              Остановить запись
                            </>
                          ) : (
                            <>
                              🎤 Начать запись
                            </>
                          )}
                        </button>
                        <div className="voice-status">
                          {isRecording && <span className="recording-text">Идет запись...</span>}
                          {loading && <span className="processing-text">Обработка...</span>}
                        </div>
                      </div>
                      <button
                        onClick={completeInterview}
                        className="btn secondary-btn"
                        disabled={loading}
                      >
                        Завершить интервью
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              ) : (
                <div className="interview-completed">
                  <div className="completion-message">
                    <h3>Интервью завершено!</h3>
                    <p>Спасибо за ваши ответы. Результаты обрабатываются...</p>
                  </div>
                  <div className="next-steps">
                    <button onClick={proceedToResults} className="btn">
                      Посмотреть результаты
                    </button>
                    <button onClick={proceedToCodingTest} className="btn secondary-btn">
                      Выполнить тестовое задание
                    </button>
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