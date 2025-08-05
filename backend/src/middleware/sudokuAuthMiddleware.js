// Middleware for verifying JWT tokens for Sudoku API
const jwt = require('jsonwebtoken');
const SudokuModel = require('../models/sudokuModel');

const sudokuAuthMiddleware = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await SudokuModel.getUserById(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Attach user information to the request object
        req.user = {
            userId: user.id,
            username: user.username,
            email: user.email
        };
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = sudokuAuthMiddleware;
