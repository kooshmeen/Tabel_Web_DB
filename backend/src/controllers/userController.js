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
            console.log('=== Registration Request ===');
            console.log('Request body:', req.body);
            
            const { name, email, password, userType, adminPassword } = req.body;
            
            // Basic validation
            if (!name || !email || !password) {
                console.log('❌ Basic validation failed');
                return res.status(400).json({
                    success: false,
                    error: 'Name, email and password are required'
                });
            }
            
            // Admin password validation
            if (userType === 'admin') {
                console.log('🔐 Admin registration detected');
                if (!adminPassword) {
                    console.log('❌ Admin password missing');
                    return res.status(400).json({
                        success: false,
                        error: 'Admin password is required for admin accounts'
                    });
                }
                
                const ADMIN_SECRET = process.env.ADMIN_SECRET;
                if (adminPassword !== ADMIN_SECRET) {
                    console.log('❌ Admin password incorrect');
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid admin password'
                    });
                }
                console.log('✅ Admin password correct');
            }
            
            // Check if email exists
            console.log('📧 Checking email existence...');
            const emailExists = await User.emailExists(email);
            if (emailExists) {
                console.log('❌ Email already exists');
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
            
            // Create user
            console.log('👤 Creating user...');
            const role = userType === 'admin' ? 'admin' : 'user';
            console.log('Role will be:', role);
            
            const user = await User.createUser({ name, email, password, role });
            
            console.log('✅ User created successfully:', user);
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
            
        } catch (error) {
            console.error('💥 Registration Error:', error.message);
            console.error('Stack:', error.stack);
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