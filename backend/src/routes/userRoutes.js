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

module.exports = router;
