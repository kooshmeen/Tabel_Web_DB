#!/bin/bash
echo "Opresc aplicația..."

# Oprește containerul PostgreSQL (nu îl șterge)
echo "Opresc containerul PostgreSQL..."
docker stop $(docker ps -q --filter "ancestor=postgres:15") 2>/dev/null || true

# Oprește serverul Node.js
if [ -f server.pid ]; then
    PID=$(cat server.pid)
    kill $PID 2>/dev/null && echo "Server oprit (PID: $PID)"
    rm server.pid
else
    pkill -f "nodemon.*app.js" 2>/dev/null || true
fi

echo "Aplicația a fost oprită!"