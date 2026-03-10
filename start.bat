@echo off
echo 🚀 Starting Talksy Application...
echo ================================

REM Check and kill existing backend processes
echo 🔍 Checking for existing backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo 🛑 Killing existing process on port 8080 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

REM Start backend
echo 🔧 Starting Spring Boot backend...
cd backend
set "PATH=%PATH%;C:\Users\Rashmi Ranjan\Downloads\apache-maven-3.9.11-bin\apache-maven-3.9.11\bin"
start "Talksy Backend" mvn spring-boot:run

REM Wait for backend to start
echo ⏳ Waiting for backend to initialize...
timeout /t 20 /nobreak >nul

REM Start frontend
echo 🎨 Starting Next.js frontend...
cd ..
start "Talksy Frontend" npm run dev

echo ================================
echo 🎉 Talksy is running!
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:8080
echo ================================
echo Press any key to open frontend in browser...
pause >nul
start http://localhost:3000