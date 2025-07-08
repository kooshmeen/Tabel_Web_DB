const express = require('express');
const UserController = require('../controllers/userController');
const authController = require('../controllers/authController');
const User = require('../models/User');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

// Definește rutele pentru utilizatori
// Toate rutele vor avea prefixul /api/users

// GET /api/users - Listează toți utilizatorii
router.get('/', UserController.getAllUsers);

// GET /api/tables - Lists all tables
router.get('/tables', UserController.getAllTables);

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

// POST /api/users/login - Login
router.post('/login', UserController.authenticateUser);

module.exports = router;
