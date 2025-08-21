/**
 * WebSocket handler for live game coordination
 */
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const SudokuModel = require('../models/sudokuModel');

class GameSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.activeConnections = new Map(); // userId -> ws connection
        this.matchRooms = new Map(); // matchId -> Set of userIds
        
        this.wss.on('connection', this.handleConnection.bind(this));
    }
    
    handleConnection(ws, req) {
        let userId = null;
        
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                
                switch(data.type) {
                    case 'AUTH':
                        userId = await this.authenticateUser(data.token);
                        if (userId) {
                            this.activeConnections.set(userId, ws);
                            ws.userId = userId;
                            ws.send(JSON.stringify({ 
                                type: 'AUTH_SUCCESS',
                                userId 
                            }));
                        }
                        break;
                        
                    case 'JOIN_MATCH':
                        await this.handleJoinMatch(userId, data.matchId, ws);
                        break;
                        
                    case 'START_GAME':
                        await this.handleStartGame(userId, data.matchId);
                        break;
                        
                    case 'UPDATE_PROGRESS':
                        await this.handleProgressUpdate(userId, data.matchId, data.timeSeconds);
                        break;
                        
                    case 'COMPLETE_GAME':
                        await this.handleGameCompletion(userId, data.matchId, data.timeSeconds, data.mistakes);
                        break;
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({ 
                    type: 'ERROR', 
                    message: error.message 
                }));
            }
        });
        
        ws.on('close', () => {
            if (userId) {
                this.activeConnections.delete(userId);
                // Remove from all match rooms
                this.matchRooms.forEach((users, matchId) => {
                    users.delete(userId);
                });
            }
        });
    }
    
    async authenticateUser(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded.userId;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
    
    async handleJoinMatch(userId, matchId, ws) {
        // Add user to match room
        if (!this.matchRooms.has(matchId)) {
            this.matchRooms.set(matchId, new Set());
        }
        this.matchRooms.get(matchId).add(userId);
        
        // Check if both players are connected
        const match = await SudokuModel.getLiveMatchById(matchId);
        const room = this.matchRooms.get(matchId);
        
        if (room.has(match.challenger_id) && room.has(match.challenged_id)) {
            // Both players connected, notify them
            this.broadcastToMatch(matchId, {
                type: 'BOTH_PLAYERS_READY',
                match: match
            });
        }
    }
    
    async handleStartGame(userId, matchId) {
        const match = await SudokuModel.getLiveMatchById(matchId);
        const now = new Date();
        
        // Update start time for the player
        if (userId === match.challenger_id) {
            await SudokuModel.updateMatchStartTime(matchId, 'challenger', now);
        } else {
            await SudokuModel.updateMatchStartTime(matchId, 'challenged', now);
        }
        
        // Notify opponent that this player started
        const opponentId = userId === match.challenger_id ? 
            match.challenged_id : match.challenger_id;
            
        this.sendToUser(opponentId, {
            type: 'OPPONENT_STARTED',
            timestamp: now
        });
    }
    
    async handleProgressUpdate(userId, matchId, timeSeconds) {
        const match = await SudokuModel.getLiveMatchById(matchId);
        const opponentId = userId === match.challenger_id ? 
            match.challenged_id : match.challenger_id;
            
        // Send time update to opponent
        this.sendToUser(opponentId, {
            type: 'OPPONENT_PROGRESS',
            timeSeconds: timeSeconds
        });
    }
    
    async handleGameCompletion(userId, matchId, timeSeconds, mistakes) {
        const match = await SudokuModel.getLiveMatchById(matchId);
        const isChallenger = userId === match.challenger_id;
        
        // Update match with player's completion
        const result = await SudokuModel.completeLiveMatch(
            matchId, 
            userId, 
            timeSeconds, 
            mistakes
        );
        
        // Notify the player who finished
        this.sendToUser(userId, {
            type: 'GAME_SUBMITTED',
            status: result.status
        });
        
        // Notify opponent
        const opponentId = isChallenger ? 
            match.challenged_id : match.challenger_id;
            
        if (result.status === 'completed') {
            // Both players finished - send final results
            this.broadcastToMatch(matchId, {
                type: 'MATCH_COMPLETED',
                winner: result.winner,
                challengerTime: result.challengerTime,
                challengedTime: result.challengedTime,
                challengerScore: result.challengerScore,
                challengedScore: result.challengedScore
            });
        } else {
            // Opponent still playing
            this.sendToUser(opponentId, {
                type: 'OPPONENT_FINISHED',
                opponentTime: timeSeconds
            });
        }
    }
    
    broadcastToMatch(matchId, data) {
        const room = this.matchRooms.get(matchId);
        if (room) {
            room.forEach(userId => {
                this.sendToUser(userId, data);
            });
        }
    }
    
    sendToUser(userId, data) {
        const ws = this.activeConnections.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
}

module.exports = GameSocketServer;