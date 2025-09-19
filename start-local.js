#!/usr/bin/env node

/**
 * Локальный запуск T2 Career Platform без Docker
 * Этот скрипт запускает все сервисы в режиме разработки
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (service, message, color = colors.reset) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}]${colors.reset} ${message}`);
};

// Конфигурация сервисов
const services = [
  {
    name: 'Web UI',
    cwd: path.join(__dirname, 'apps', 'web'),
    command: 'npm',
    args: ['start'],
    port: 3000,
    color: colors.cyan,
    env: {
      ...process.env,
      PORT: '3000',
      REACT_APP_API_URL: 'http://localhost:8080'
    }
  },
  {
    name: 'Gateway',
    cwd: path.join(__dirname, 'services', 'gateway'),
    command: 'npm',
    args: ['run', 'dev'],
    port: 8080,
    color: colors.green,
    env: {
      ...process.env,
      PORT: '8080',
      NODE_ENV: 'development',
      // Используем in-memory базы данных для демо
      DATABASE_URL: 'sqlite::memory:',
      REDIS_URL: 'redis://localhost:6379'
    }
  },
  {
    name: 'LLM Adapter',
    cwd: path.join(__dirname, 'services', 'llm-adapter'),
    command: 'npm',
    args: ['run', 'dev'],
    port: 8083,
    color: colors.magenta,
    env: {
      ...process.env,
      PORT: '8083',
      NODE_ENV: 'development'
    }
  }
];

// Массив для хранения процессов
const processes = [];

// Функция для запуска сервиса
function startService(service) {
  return new Promise((resolve, reject) => {
    log(service.name, `Запуск на порту ${service.port}...`, service.color);
    
    // Проверяем существование директории
    if (!fs.existsSync(service.cwd)) {
      log(service.name, `Директория не найдена: ${service.cwd}`, colors.red);
      reject(new Error(`Directory not found: ${service.cwd}`));
      return;
    }

    // Проверяем наличие package.json
    const packageJsonPath = path.join(service.cwd, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(service.name, `package.json не найден в ${service.cwd}`, colors.red);
      reject(new Error(`package.json not found in ${service.cwd}`));
      return;
    }

    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      env: service.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    processes.push({ name: service.name, process: child });

    child.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(service.name, message, service.color);
      }
    });

    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('webpack compiled')) {
        log(service.name, `ERROR: ${message}`, colors.red);
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        log(service.name, `Процесс завершился с кодом ${code}`, colors.red);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        log(service.name, 'Процесс завершен успешно', colors.green);
        resolve();
      }
    });

    child.on('error', (err) => {
      log(service.name, `Ошибка запуска: ${err.message}`, colors.red);
      reject(err);
    });

    // Считаем что сервис запустился через 3 секунды
    setTimeout(() => {
      log(service.name, `Сервис запущен на http://localhost:${service.port}`, colors.green);
      resolve();
    }, 3000);
  });
}

// Функция для остановки всех процессов
function stopAllServices() {
  log('System', 'Остановка всех сервисов...', colors.yellow);
  
  processes.forEach(({ name, process }) => {
    if (process && !process.killed) {
      log(name, 'Остановка...', colors.yellow);
      process.kill('SIGTERM');
    }
  });

  setTimeout(() => {
    processes.forEach(({ name, process }) => {
      if (process && !process.killed) {
        log(name, 'Принудительная остановка...', colors.red);
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
}

// Обработчики сигналов
process.on('SIGINT', stopAllServices);
process.on('SIGTERM', stopAllServices);

// Главная функция
async function main() {
  console.log(`${colors.bright}${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                    T2 Career Platform                       ║
║                   Локальный запуск                          ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log('System', 'Проверка зависимостей...', colors.yellow);

  // Проверяем установку зависимостей
  for (const service of services) {
    const nodeModulesPath = path.join(service.cwd, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log(service.name, 'Зависимости не установлены. Запустите: npm install', colors.red);
      process.exit(1);
    }
  }

  log('System', 'Запуск сервисов...', colors.green);

  try {
    // Запускаем сервисы последовательно с небольшой задержкой
    for (let i = 0; i < services.length; i++) {
      await startService(services[i]);
      if (i < services.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`${colors.bright}${colors.green}
╔══════════════════════════════════════════════════════════════╗
║                    🚀 Все сервисы запущены!                 ║
║                                                              ║
║  Web UI:      http://localhost:3000                         ║
║  API Gateway: http://localhost:8080                         ║
║  LLM Adapter: http://localhost:8083                         ║
║                                                              ║
║  Для остановки нажмите Ctrl+C                              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    // Держим процесс активным
    setInterval(() => {
      // Проверяем что процессы еще живы
      const aliveProcesses = processes.filter(({ process }) => !process.killed);
      if (aliveProcesses.length === 0) {
        log('System', 'Все процессы завершены', colors.red);
        process.exit(1);
      }
    }, 10000);

  } catch (error) {
    log('System', `Ошибка запуска: ${error.message}`, colors.red);
    stopAllServices();
  }
}

// Запуск
main().catch((error) => {
  console.error(`${colors.red}Критическая ошибка: ${error.message}${colors.reset}`);
  process.exit(1);
});