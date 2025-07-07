const User = require('../models/User');

// Controller pentru operațiuni cu utilizatori
class UserController {
    
    // GET /api/users - Listează toți utilizatorii
    static async getAllUsers(req, res) {
        try {
            const users = await User.listUsers();
            res.json({
                success: true,
                data: users,
                count: users.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // GET /api/users/:id - Găsește user după ID
    static async getUserById(req, res) {
        try {
            const userId = req.params.id;
            const user = await User.getUserById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // POST /api/users - Creează user nou
    static async createUser(req, res) {
        try {
            const { name, email, password } = req.body;
            
            // Validare de bază
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, email and password are required'
                });
            }
            
            // Verifică dacă email-ul există deja
            const emailExists = await User.emailExists(email);
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
            
            const user = await User.createUser({ name, email, password });
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // PUT /api/users/:id - Actualizează user
    static async updateUser(req, res) {
        try {
            const userId = req.params.id;
            const { name, email } = req.body;
            
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and email are required'
                });
            }
            
            const user = await User.updateUser(userId, { name, email });
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // DELETE /api/users/:id - Șterge user
    static async deleteUser(req, res) {
        try {
            const userId = req.params.id;
            const deletedUser = await User.deleteUser(userId);
            
            if (!deletedUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'User deleted successfully',
                data: { id: deletedUser.id }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // POST /api/users/authenticate - Login
    static async authenticateUser(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }
            
            const user = await User.authenticate(email, password);
            res.json({
                success: true,
                data: user,
                message: 'Authentication successful'
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = UserController;