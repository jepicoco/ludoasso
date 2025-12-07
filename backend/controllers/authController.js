const { Utilisateur } = require('../models');
const auditLogger = require('../utils/auditLogger');

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await Utilisateur.findOne({ where: { email } });

    if (!user) {
      // Log failed login attempt
      auditLogger.login({
        userId: null,
        email,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false
      });

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Log failed login attempt
      auditLogger.login({
        userId: user.id,
        email,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false
      });

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (user.statut === 'suspendu') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact administration.'
      });
    }

    if (user.statut === 'inactif') {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account is inactive. Please contact administration.'
      });
    }

    // Generate token
    const token = user.generateAuthToken();

    // Log successful login
    auditLogger.login({
      userId: user.id,
      email,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        code_barre: user.code_barre,
        statut: user.statut,
        role: user.role || 'usager',
        modules_autorises: user.modules_autorises
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, adresse, ville, code_postal, date_naissance } = req.body;

    // Validate required fields
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nom, prenom, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await Utilisateur.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create new user
    const user = await Utilisateur.create({
      nom,
      prenom,
      email,
      password,
      telephone,
      adresse,
      ville,
      code_postal,
      date_naissance,
      date_adhesion: new Date(),
      statut: 'actif'
    });

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        code_barre: user.code_barre,
        statut: user.statut
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by verifyToken middleware
    const user = req.user;

    res.json({
      user: {
        id: user.id,
        code_barre: user.code_barre,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        ville: user.ville,
        code_postal: user.code_postal,
        date_naissance: user.date_naissance,
        date_adhesion: user.date_adhesion,
        date_fin_adhesion: user.date_fin_adhesion,
        statut: user.statut,
        photo: user.photo,
        notes: user.notes,
        role: user.role || 'usager',
        modules_autorises: user.modules_autorises
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { nom, prenom, telephone, adresse, ville, code_postal, date_naissance } = req.body;

    // Update allowed fields
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone !== undefined) user.telephone = telephone;
    if (adresse !== undefined) user.adresse = adresse;
    if (ville !== undefined) user.ville = ville;
    if (code_postal !== undefined) user.code_postal = code_postal;
    if (date_naissance !== undefined) user.date_naissance = date_naissance;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        code_barre: user.code_barre,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        ville: user.ville,
        code_postal: user.code_postal,
        date_naissance: user.date_naissance,
        statut: user.statut
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile
};
