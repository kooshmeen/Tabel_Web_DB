#!/bin/bash
echo "Pornesc aplicația..."

# Pornește baza de date
docker-compose up -d

# Pornește serverul în fundal
cd backend
npm run dev > ../logs/server.log 2>&1 &
echo $! > ../server.pid

echo "Aplicația a pornit!"
echo "Server PID: $(cat ../server.pid)"
echo "Logs: tail -f logs/server.log"