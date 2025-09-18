import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ResumeAnalysis.css';

const ResumeAnalysis = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Пожалуйста, загрузите файл в формате PDF');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const analyzeResume = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAnalysis(response.data);
    } catch (err) {
      setError('Ошибка при анализе резюме. Попробуйте еще раз.');
      console.error('Resume analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="resume-analysis">
      <div className="container">
        <div className="page-header">
          <h2>Анализ резюме</h2>
          <p>Загрузите ваше резюме в формате PDF для автоматического анализа</p>
        </div>

        {!analysis ? (
          <div className="upload-section">
            <div className="upload-card">
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="file-info">
                    <div className="file-icon">📄</div>
                    <div className="file-details">
                      <h4>{file.name}</h4>
                      <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">📁</div>
                    <h3>
                      {isDragActive
                        ? 'Отпустите файл здесь'
                        : 'Перетащите PDF файл сюда или нажмите для выбора'}
                    </h3>
                    <p>Поддерживается только формат PDF</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div className="upload-actions">
                {file && (
                  <>
                    <button
                      onClick={analyzeResume}
                      disabled={loading}
                      className="btn analyze-btn"
                    >
                      {loading ? (
                        <>
                          <div className="spinner"></div>
                          Анализируем...
                        </>
                      ) : (
                        'Анализировать резюме'
                      )}
                    </button>
                    <button onClick={resetAnalysis} className="btn secondary-btn">
                      Выбрать другой файл
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="analysis-results">
            <div className="results-header">
              <h3>Результаты анализа</h3>
              <button onClick={resetAnalysis} className="btn secondary-btn">
                Загрузить новое резюме
              </button>
            </div>

            <div className="results-grid">
              <div className="result-card">
                <h4>Общая оценка</h4>
                <div className="score-display">
                  <div className="score-circle">
                    <span className="score-value">{analysis.overall_score || 'N/A'}</span>
                    <span className="score-label">из 10</span>
                  </div>
                </div>
              </div>

              <div className="result-card">
                <h4>Ключевые навыки</h4>
                <div className="skills-list">
                  {analysis.skills && analysis.skills.length > 0 ? (
                    analysis.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>Навыки не определены</p>
                  )}
                </div>
              </div>

              <div className="result-card">
                <h4>Опыт работы</h4>
                <div className="experience-info">
                  <p><strong>Общий стаж:</strong> {analysis.experience_years || 'Не указан'} лет</p>
                  <p><strong>Количество мест работы:</strong> {analysis.job_count || 'Не указано'}</p>
                </div>
              </div>

              <div className="result-card full-width">
                <h4>Рекомендации</h4>
                <div className="recommendations">
                  {analysis.recommendations && analysis.recommendations.length > 0 ? (
                    <ul>
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Рекомендации не сформированы</p>
                  )}
                </div>
              </div>
            </div>

            <div className="next-steps">
              <h4>Следующие шаги</h4>
              <div className="steps-buttons">
                <Link to="/interview" className="btn">
                  Перейти к интервью
                </Link>
                <Link to="/coding-test" className="btn secondary-btn">
                  Выполнить тестовое задание
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalysis;