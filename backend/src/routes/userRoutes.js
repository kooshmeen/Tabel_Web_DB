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

// GET /api/users/tables/:tableName - Get data from specific table (admin only)
router.get('/tables/:tableName', authMiddleware, UserController.getTableData);

// GET /api/users/tables/:tableName/columns - Get columns for specific table
router.get('/tables/:tableName/columns', authMiddleware, UserController.getTableColumns);

// POST /api/users/tables/:tableName/rows - Create new row in specific table
router.post('/tables/:tableName/rows', authMiddleware, UserController.addTableRow);

// PATCH /api/users/tables/:tableName/rows/:rowId - Update specific row
router.patch('/tables/:tableName/rows/:rowId', authMiddleware, UserController.updateTableRow);

// DELETE /api/users/tables/:tableName/rows/:rowId - Delete specific row
router.delete('/tables/:tableName/rows/:rowId', authMiddleware, UserController.deleteTableRow);



module.exports = router;
