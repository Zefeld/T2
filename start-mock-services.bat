@echo off
echo ========================================
echo Starting Mock Services for T2 Platform
echo ========================================

REM Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js не найден. Установите Node.js и попробуйте снова.
    pause
    exit /b 1
)

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python не найден. Установите Python и попробуйте снова.
    pause
    exit /b 1
)

echo Node.js и Python найдены. Запускаем сервисы...
echo.

REM Запускаем Gateway сервис
echo [1/5] Запуск Gateway сервиса...
cd /d "%~dp0services\gateway"
start "Gateway Service" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

REM Запускаем LLM Adapter (если зависимости установлены)
echo [2/5] Запуск LLM Adapter...
cd /d "%~dp0services\llm-adapter"
if exist "node_modules" (
    start "LLM Adapter" cmd /k "npm run dev"
) else (
    echo LLM Adapter пропущен - зависимости не установлены
)
timeout /t 3 /nobreak >nul

REM Запускаем Mock STT сервис
echo [3/5] Запуск Mock STT сервиса...
cd /d "%~dp0services\stt-service\src"
start "STT Service (Mock)" cmd /k "python mock_main.py"
timeout /t 3 /nobreak >nul

REM Запускаем Mock TTS сервис
echo [4/5] Запуск Mock TTS сервиса...
cd /d "%~dp0services\tts-service\src"
start "TTS Service (Mock)" cmd /k "python mock_main.py"
timeout /t 3 /nobreak >nul

REM Запускаем Web приложение
echo [5/5] Запуск Web приложения...
cd /d "%~dp0apps\web"
if exist "node_modules" (
    start "Web Application" cmd /k "npm start"
    timeout /t 5 /nobreak >nul
    echo.
    echo ========================================
    echo Все сервисы запущены!
    echo ========================================
    echo.
    echo Доступные сервисы:
    echo - Web UI: http://localhost:3000
    echo - Gateway: http://localhost:8080
    echo - LLM Adapter: http://localhost:8081
    echo - STT Service (Mock): http://localhost:5001
    echo - TTS Service (Mock): http://localhost:5002
    echo.
    echo Откройте браузер и перейдите по адресу: http://localhost:3000
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
) else (
    echo Web приложение пропущено - зависимости не установлены
)

echo.
echo Нажмите любую клавишу для выхода...
pause >nul