@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    T2 Career Platform                       ║
echo ║                   Быстрый запуск                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [INFO] Проверка зависимостей...

REM Проверяем Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не установлен. Установите Node.js 18+ с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверяем npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm не найден
    pause
    exit /b 1
)

echo [INFO] Node.js и npm найдены

REM Проверяем установку зависимостей для веб-приложения
if not exist "apps\web\node_modules" (
    echo [INFO] Установка зависимостей для веб-приложения...
    cd apps\web
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка установки зависимостей для веб-приложения
        pause
        exit /b 1
    )
    cd ..\..
)

REM Проверяем установку зависимостей для gateway
if not exist "services\gateway\node_modules" (
    echo [INFO] Установка зависимостей для gateway...
    cd services\gateway
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка установки зависимостей для gateway
        pause
        exit /b 1
    )
    cd ..\..
)

REM Проверяем установку зависимостей для llm-adapter
if not exist "services\llm-adapter\node_modules" (
    echo [INFO] Установка зависимостей для llm-adapter...
    cd services\llm-adapter
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка установки зависимостей для llm-adapter
        pause
        exit /b 1
    )
    cd ..\..
)

echo.
echo [INFO] Все зависимости установлены!
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Запуск сервисов                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Запуск Gateway на порту 8080...
echo [INFO] Запуск Web UI на порту 3000...
echo.
echo Откройте новые окна терминала и выполните:
echo.
echo 1. Для Gateway:
echo    cd services\gateway
echo    npm run dev
echo.
echo 2. Для Web UI:
echo    cd apps\web  
echo    npm start
echo.
echo 3. Для LLM Adapter:
echo    cd services\llm-adapter
echo    npm run dev
echo.
echo После запуска откройте: http://localhost:3000
echo.
echo Нажмите любую клавишу для автоматического запуска...
pause >nul

REM Запуск Gateway в фоне
echo [INFO] Запуск Gateway...
start "T2 Gateway" cmd /k "cd services\gateway && npm run dev"

REM Небольшая задержка
timeout /t 3 /nobreak >nul

REM Запуск LLM Adapter в фоне  
echo [INFO] Запуск LLM Adapter...
start "T2 LLM Adapter" cmd /k "cd services\llm-adapter && npm run dev"

REM Небольшая задержка
timeout /t 3 /nobreak >nul

REM Запуск Web UI в фоне
echo [INFO] Запуск Web UI...
start "T2 Web UI" cmd /k "cd apps\web && npm start"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🚀 Сервисы запускаются!                  ║
echo ║                                                              ║
echo ║  Web UI:      http://localhost:3000                         ║
echo ║  API Gateway: http://localhost:8080                         ║
echo ║  LLM Adapter: http://localhost:8083                         ║
echo ║                                                              ║
echo ║  Подождите 30-60 секунд для полной загрузки                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Ждем немного и открываем браузер
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo Нажмите любую клавишу для выхода...
pause >nul