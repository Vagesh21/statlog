#!/bin/bash

# Raspberry Pi Monitor - Start Script

echo "Starting Raspberry Pi Monitor..."

# Check if MongoDB is running
if ! pgrep -x mongod > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongodb || mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb
fi

# Start backend
echo "Starting backend..."
cd /app/backend
source venv/bin/activate 2>/dev/null || true
python -m uvicorn server:app --host 0.0.0.0 --port 8003 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd /app/frontend
yarn dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access the dashboard at: http://localhost:3003"
echo "API documentation at: http://localhost:8003/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
