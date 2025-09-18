import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ResumeAnalysis from './components/ResumeAnalysis';
import Interview from './components/Interview';
import VoiceInterview from './components/VoiceInterview';
import CodingTest from './components/CodingTest';
import Results from './components/Results';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>ИИ-Консультант</h1>
          <p>Персональный помощник для карьерного развития</p>
        </header>
        
        <main className="App-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/resume" element={<ResumeAnalysis />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/voice-interview" element={<VoiceInterview />} />
            <Route path="/coding-test" element={<CodingTest />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
        
        <footer className="App-footer">
          <p>&copy; 2024 ИИ-Консультант. Все права защищены.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;