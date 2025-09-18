import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VoiceInterview.css';

const VoiceInterview = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Session validation
  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
    
    if (!storedSessionId || !sessionData.resume_analyzed) {
      navigate('/');
      return;
    }
    
    setSessionId(storedSessionId);
  }, [navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setMicrophonePermission(false);
      console.error('Microphone permission denied:', error);
    }
  };

  const setupAudioAnalyser = (stream) => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevel = () => {
      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255);
        requestAnimationFrame(updateAudioLevel);
      }
    };
    updateAudioLevel();
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/voice-interview/start');
      setSessionId(response.data.session_id);
      setMessages([{
        role: 'assistant',
        content: response.data.first_question,
        timestamp: new Date().toISOString(),
        audio_url: response.data.audio_url
      }]);
      setInterviewStarted(true);
      
      // Автоматически воспроизводим первый вопрос
      if (response.data.audio_url) {
        playAudio(response.data.audio_url);
      }
    } catch (error) {
      console.error('Error starting voice interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (audioUrl) => {
    try {
      setIsPlaying(true);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    if (!microphonePermission) {
      await checkMicrophonePermission();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      setupAudioAnalyser(stream);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setAudioLevel(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMicrophonePermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    setLoading(true);

    const userMessage = {
      role: 'user',
      content: 'Голосовое сообщение',
      timestamp: new Date().toISOString(),
      isAudio: true
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);

      const response = await axios.post('/api/voice-interview/message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        audio_url: response.data.audio_url
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Автоматически воспроизводим ответ
      if (response.data.audio_url) {
        playAudio(response.data.audio_url);
      }

      if (response.data.interview_completed) {
        setInterviewCompleted(true);
      }
    } catch (error) {
      console.error('Error sending audio message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Извините, произошла ошибка при обработке вашего сообщения.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!microphonePermission) {
    return (
      <div className="voice-interview">
        <div className="container">
          <div className="page-header">
            <h2>Голосовое интервью</h2>
            <p>Для проведения голосового интервью необходим доступ к микрофону</p>
          </div>
          
          <div className="permission-request">
            <div className="permission-card">
              <div className="permission-icon">🎤</div>
              <h3>Требуется доступ к микрофону</h3>
              <p>
                Для проведения голосового интервью необходимо разрешить доступ к микрофону. 
                Ваши аудиозаписи будут использованы только для анализа ответов.
              </p>
              <button onClick={checkMicrophonePermission} className="btn">
                Разрешить доступ к микрофону
              </button>
              <button onClick={() => navigate('/interview')} className="btn secondary-btn">
                Вернуться к текстовому интервью
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-interview">
      <div className="container">
        <div className="page-header">
          <h2>Голосовое интервью</h2>
          <p>Интерактивное интервью с голосовым ИИ-ассистентом</p>
        </div>

        <div className="interview-container">
          {!interviewStarted ? (
            <div className="interview-start">
              <div className="start-card">
                <div className="start-icon">🎙️</div>
                <h3>Готовы к голосовому интервью?</h3>
                <p>
                  ИИ-ассистент будет задавать вопросы голосом, а вы отвечайте, нажимая и удерживая кнопку записи.
                  Интервью проходит в режиме реального времени с использованием передовых технологий распознавания и синтеза речи.
                </p>
                <div className="voice-tips">
                  <h4>Советы для качественной записи:</h4>
                  <ul>
                    <li>Говорите четко и не торопясь</li>
                    <li>Находитесь в тихом помещении</li>
                    <li>Держите микрофон на расстоянии 15-20 см</li>
                    <li>Дождитесь окончания вопроса перед ответом</li>
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
                    'Начать голосовое интервью'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="voice-chat-container">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'assistant' ? '🤖' : '👤'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      {message.audio_url && (
                        <div className="audio-controls">
                          <button 
                            onClick={() => playAudio(message.audio_url)}
                            className="play-btn"
                            disabled={isPlaying}
                          >
                            {isPlaying ? '⏸️' : '▶️'} Воспроизвести
                          </button>
                        </div>
                      )}
                      {message.isAudio && (
                        <div className="audio-indicator">
                          🎵 Голосовое сообщение
                        </div>
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
                      <div className="processing-indicator">
                        <div className="spinner"></div>
                        Обрабатываю ваш ответ...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!interviewCompleted ? (
                <div className="voice-controls">
                  <div className="recording-area">
                    <div className={`audio-visualizer ${isRecording ? 'active' : ''}`}>
                      <div 
                        className="audio-level" 
                        style={{ height: `${audioLevel * 100}%` }}
                      ></div>
                    </div>
                    
                    <button
                      className={`record-btn ${isRecording ? 'recording' : ''}`}
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      disabled={loading || isPlaying}
                    >
                      <div className="record-icon">
                        {isRecording ? '⏹️' : '🎤'}
                      </div>
                      <span className="record-text">
                        {isRecording ? 'Отпустите для отправки' : 'Нажмите и удерживайте для записи'}
                      </span>
                    </button>
                  </div>
                  
                  <div className="control-buttons">
                    <button 
                      onClick={() => setInterviewCompleted(true)}
                      className="btn secondary-btn"
                      disabled={loading}
                    >
                      Завершить интервью
                    </button>
                  </div>
                </div>
              ) : (
                <div className="interview-completed">
                  <div className="completion-message">
                    <h3>Голосовое интервью завершено!</h3>
                    <p>Спасибо за участие. Ваши ответы анализируются...</p>
                  </div>
                  <div className="next-steps">
                    <button onClick={() => navigate('/coding-test')} className="btn">
                      Выполнить тестовое задание
                    </button>
                    <button onClick={() => navigate('/results')} className="btn secondary-btn">
                      Посмотреть результаты
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

export default VoiceInterview;