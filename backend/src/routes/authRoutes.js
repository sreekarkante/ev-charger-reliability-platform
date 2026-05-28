const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyJWT, getProfile);

module.exports = router;
