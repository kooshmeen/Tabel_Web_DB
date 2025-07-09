// middleware for veryfying JWT tokens
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.getUserById(decoded.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Attach user information to the request object
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role // Assuming the User model has a role field
        };
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
}

module.exports = authMiddleware;