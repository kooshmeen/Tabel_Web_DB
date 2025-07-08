const express = require('express');
const UserController = require('../controllers/userController');
const authController = require('../controllers/authController');
const User = require('../models/User');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

// Definește rutele pentru utilizatori
// Toate rutele vor avea prefixul /api/users

// GET /api/users - Listează toți utilizatorii
router.get('/users', authMiddleware, UserController.getAllUsers);

// GET /api/tables - Lists all tables
router.get('/tables', authMiddleware, UserController.getAllTables);

// GET /api/users/:id - Găsește user după ID
router.get('/:id', authMiddleware, UserController.getUserById);

// POST /api/users - Creează user nou
router.post('/', authMiddleware, UserController.createUser);

// PUT /api/users/:id - Actualizează user
router.put('/:id', authMiddleware, UserController.updateUser);

// DELETE /api/users/:id - Șterge user
router.delete('/:id', authMiddleware, UserController.deleteUser);

// POST /api/users/register - Register a new user
router.post('/register', UserController.createUser);

// POST /api/users/login - Login
router.post('/login', authController.login);

module.exports = router;
