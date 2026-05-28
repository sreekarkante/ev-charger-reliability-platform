const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_ev_reliability_system_key_2026');

    // Retrieve user and verify current account status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if suspended
    if (user.account_status === 'SUSPENDED') {
      return res.status(403).json({ message: 'This account has been suspended for violating system policies.' });
    }

    // Check if cooldown has expired
    if (user.account_status === 'COOLDOWN') {
      if (user.cooldown_until && new Date() < new Date(user.cooldown_until)) {
        const remainingHours = Math.ceil((new Date(user.cooldown_until) - new Date()) / (1000 * 60 * 60));
        return res.status(403).json({ 
          message: `Your account is temporarily locked for suspicious behavior. Cooldown expires in ${remainingHours} hour(s).` 
        });
      } else {
        // Cooldown has expired, automatically restore to active status in DB
        await prisma.user.update({
          where: { id: user.id },
          data: { account_status: 'ACTIVE', cooldown_until: null }
        });
        user.account_status = 'ACTIVE';
        user.cooldown_until = null;
      }
    }

    // Attach user information to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustScore: user.trust_score,
      accountStatus: user.account_status
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Invalid or tampered token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied: Administrative privileges required' });
  }
  next();
};

module.exports = {
  verifyJWT,
  requireAdmin
};
