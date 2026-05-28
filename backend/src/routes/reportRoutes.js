const express = require('express');
const { createReport, getReportsByStationId, getReportsByUserId } = require('../controllers/reportController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Protected report submissions
router.post('/', verifyJWT, createReport);

// Public listings
router.get('/station/:id', getReportsByStationId);
router.get('/user/:id', getReportsByUserId);

module.exports = router;
