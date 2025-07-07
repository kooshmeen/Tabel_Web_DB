#!/bin/bash
echo "Opresc aplicația..."

# Oprește baza de date
docker-compose down

# Oprește serverul folosind PID-ul salvat
if [ -f server.pid ]; then
    PID=$(cat server.pid)
    kill $PID 2>/dev/null && echo "Server oprit (PID: $PID)"
    rm server.pid
else
    # Backup - oprește toate procesele Node.js
    pkill -f "nodemon.*app.js" 2>/dev/null || true
fi

echo "Aplicația a fost oprită!"