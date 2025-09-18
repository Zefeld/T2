import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="container">
        <div className="welcome-section">
          <h2>Добро пожаловать в систему оценки кандидатов</h2>
          <p>Пройдите три этапа оценки для получения персонализированной обратной связи</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Анализ резюме</h3>
              <p>Загрузите ваше резюме в формате PDF для автоматического анализа ключевых навыков и опыта</p>
              <Link to="/resume" className="btn step-btn">
                Загрузить резюме
              </Link>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>ИИ-Интервью</h3>
              <p>Пройдите интерактивное интервью с ИИ-ассистентом, который задаст вопросы о вашем опыте</p>
              <Link to="/interview" className="btn step-btn">
                Начать интервью
              </Link>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Тестовое задание</h3>
              <p>Выполните практическое задание для демонстрации ваших технических навыков</p>
              <Link to="/coding-test" className="btn step-btn">
                Выполнить тест
              </Link>
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