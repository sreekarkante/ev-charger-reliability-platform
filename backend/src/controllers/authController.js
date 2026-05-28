const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ev_reliability_system_key_2026';

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Auto-detect admin role from email for demonstration purposes
    let role = 'USER';
    if (email.toLowerCase().includes('@charger-admin.com') || email.toLowerCase().startsWith('admin@')) {
      role = 'ADMIN';
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash,
        role,
        trust_score: 0.5,
        total_reports: 0,
        verified_correct_reports: 0,
        account_status: 'ACTIVE'
      }
    });

    // Sign JWT
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account successfully registered',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        trustScore: newUser.trust_score,
        accountStatus: newUser.account_status,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'An error occurred during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustScore: user.trust_score,
        accountStatus: user.account_status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'An error occurred during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        reports: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            station: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustScore: user.trust_score,
        totalReports: user.total_reports,
        verifiedCorrectReports: user.verified_correct_reports,
        accountStatus: user.account_status,
        cooldownUntil: user.cooldown_until,
        createdAt: user.created_at,
        reports: user.reports
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: 'An error occurred while fetching user profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
