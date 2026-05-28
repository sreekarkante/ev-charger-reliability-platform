const express = require('express');
const {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation
} = require('../controllers/stationController');
const { verifyJWT, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes for viewing
router.get('/', getAllStations);
router.get('/:id', getStationById);

// Admin-only management routes
router.post('/', verifyJWT, requireAdmin, createStation);
router.put('/:id', verifyJWT, requireAdmin, updateStation);
router.delete('/:id', verifyJWT, requireAdmin, deleteStation);

module.exports = router;
