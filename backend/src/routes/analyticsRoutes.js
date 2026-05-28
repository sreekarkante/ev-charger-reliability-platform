const express = require('express');
const {
  getSystemAnalytics,
  getStationAnalytics,
  getUserAnalytics,
  updateUserAccountStatus
} = require('../controllers/analyticsController');
const { verifyJWT, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Enforce JWT + Admin verification for all analytics & moderation endpoints
router.use(verifyJWT);
router.use(requireAdmin);

router.get('/system', getSystemAnalytics);
router.get('/stations', getStationAnalytics);
router.get('/users', getUserAnalytics);

// User moderation status update endpoint
router.put('/users/:userId/status', updateUserAccountStatus);

module.exports = router;
