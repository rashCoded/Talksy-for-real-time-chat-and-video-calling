#!/bin/bash

echo "🚀 Starting Talksy Application..."
echo "================================"

# Check if port 8080 is in use and kill the process
echo "🔍 Checking for existing backend processes..."
for pid in $(netstat -tlnp 2>/dev/null | grep :8080 | awk '{print $7}' | cut -d'/' -f1); do
    if [ ! -z "$pid" ]; then
        echo "🛑 Killing existing process on port 8080 (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# Start backend
echo "🔧 Starting Spring Boot backend..."
cd backend
mvn spring-boot:run &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 15

# Test backend health
echo "🏥 Testing backend health..."
if curl -f http://localhost:8080/api/auth/test 2>/dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️ Backend health check failed, but continuing..."
fi

# Start frontend
echo "🎨 Starting Next.js frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "================================"
echo "🎉 Talksy is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8080"
echo "================================"
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait