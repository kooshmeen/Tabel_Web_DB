const User = require('../models/User');
const jwt = require('jsonwebtoken');


class AuthController {
    static async login(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        try {
            const user = await User.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const isPasswordValid = await User.verifyPassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }

            // Generate JWT token
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
                expiresIn: '1h' // Token valid for 1 hour
            });

            res.json({
                success: true,
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    token: token // Include the token in the response
                },
                message: 'Login successful'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    static async register(req, res) {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        try {
            const userExists = await User.emailExists(email);
            if (userExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already exists'
                });
            }

            const newUser = await User.createUser(name, email, password);
            res.status(201).json({
                success: true,
                data: { id: newUser.id, name: newUser.name, email: newUser.email },
                message: 'User registered successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}