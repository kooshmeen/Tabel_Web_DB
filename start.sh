#!/bin/bash
echo "Pornesc aplicația..."

# Verifică dacă containerul există și îl pornește, altfel îl creează
if docker ps -a --format "table {{.Names}}" | grep -q "postgres"; then
    echo "Pornesc containerul PostgreSQL existent..."
    docker start $(docker ps -aq --filter "name=postgres")
else
    echo "Creez și pornesc containerul PostgreSQL..."
    docker-compose up -d
fi

# Creează directorul logs dacă nu există
mkdir -p logs

# Pornește serverul în fundal
cd backend
npm run dev > ../logs/server.log 2>&1 &
echo $! > ../server.pid

echo "Aplicația a pornit!"
echo "Server PID: $(cat ./server.pid)"
echo "Logs: tail -f logs/server.log"