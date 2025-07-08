const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

// Definește rutele pentru utilizatori
// Toate rutele vor avea prefixul /api/users

// GET /api/users - Listează toți utilizatorii
router.get('/', UserController.getAllUsers);

// GET /api/users/:id - Găsește user după ID
router.get('/:id', UserController.getUserById);

// POST /api/users - Creează user nou
router.post('/', UserController.createUser);

// PUT /api/users/:id - Actualizează user
router.put('/:id', UserController.updateUser);

// DELETE /api/users/:id - Șterge user
router.delete('/:id', UserController.deleteUser);

// POST /api/users/authenticate - Login
router.post('/authenticate', UserController.authenticateUser);

// POST /api/users/register - Register a new user
router.post('/register', UserController.createUser);

// Add this at the top of your userRoutes.js, right after the route definition
router.post('/register', (req, res, next) => {
    console.log('🔥 ROUTE HIT: /api/users/register');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    next(); // Continue to the actual controller
}, UserController.createUser);

module.exports = router;
