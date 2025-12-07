/**
 * Routes d'authentification pour les usagers (adherents)
 * Separees de l'authentification admin
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Utilisateur, ParametresFront } = require('../models');
const emailService = require('../services/emailService');
const { authUsager } = require('../middleware/usagerAuth');
const { loginLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/usager/auth/login
 * @desc    Connexion d'un usager (email ou code_barre)
 * @access  Public
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { identifiant, password } = req.body;

    if (!identifiant || !password) {
      return res.status(400).json({
        error: 'Champs requis',
        message: 'Identifiant et mot de passe requis'
      });
    }

    // Rechercher par email OU code_barre
    const utilisateur =await Utilisateur.findOne({
      where: {
        [Op.or]: [
          { email: identifiant },
          { code_barre: identifiant }
        ]
      }
    });

    if (!utilisateur) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email/code barre ou mot de passe incorrect'
      });
    }

    // Verifier le mot de passe
    const isMatch = await utilisateur.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email/code barre ou mot de passe incorrect'
      });
    }

    // Verifier le statut
    if (utilisateur.statut !== 'actif') {
      return res.status(403).json({
        error: 'Compte inactif',
        message: `Votre compte est ${utilisateur.statut}. Contactez l'association.`
      });
    }

    // Generer le token
    const token = utilisateur.generateAuthToken();

    res.json({
      message: 'Connexion reussie',
      token,
      usager: {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        code_barre: utilisateur.code_barre,
        statut: utilisateur.statut,
        date_fin_adhesion: utilisateur.date_fin_adhesion
      }
    });
  } catch (error) {
    console.error('Erreur login usager:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la connexion'
    });
  }
});

/**
 * @route   POST /api/usager/auth/forgot-password
 * @desc    Demande de reinitialisation de mot de passe (par email ou code-barres)
 * @access  Public
 */
router.post('/forgot-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, code_barre } = req.body;

    if (!email && !code_barre) {
      return res.status(400).json({
        error: 'Identifiant requis',
        message: 'Veuillez fournir votre email ou scanner votre carte'
      });
    }

    // Rechercher par email ou code_barre
    const whereClause = email ? { email } : { code_barre };
    const utilisateur =await Utilisateur.findOne({ where: whereClause });

    // Toujours repondre OK pour eviter l'enumeration
    if (!utilisateur) {
      return res.json({
        message: 'Si cet email existe, un lien de reinitialisation a ete envoye'
      });
    }

    // Generer le token
    const resetToken = await utilisateur.generatePasswordResetToken();

    // Recuperer le nom du site
    const params = await ParametresFront.getParametres();

    // Construire le lien
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/usager/reset-password.html?token=${resetToken}`;

    // Envoyer l'email
    try {
      await emailService.sendEmail({
        to: utilisateur.email,
        subject: `Reinitialisation de votre mot de passe - ${params.nom_site || 'Association'}`,
        html: `
          <h2>Reinitialisation de mot de passe</h2>
          <p>Bonjour ${utilisateur.prenom},</p>
          <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe :</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: ${params.couleur_primaire || '#0d6efd'}; color: white; text-decoration: none; border-radius: 5px;">Reinitialiser mon mot de passe</a></p>
          <p>Ce lien est valable 24 heures.</p>
          <p>Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
          <br>
          <p>Cordialement,<br>${params.nom_site || 'L\'equipe'}</p>
        `,
        adherentId: utilisateur.id
      });
    } catch (emailError) {
      console.error('Erreur envoi email reset:', emailError);
      // Ne pas exposer l'erreur email a l'utilisateur
    }

    res.json({
      message: 'Si cet email existe, un lien de reinitialisation a ete envoye'
    });
  } catch (error) {
    console.error('Erreur forgot password:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la demande'
    });
  }
});

/**
 * @route   POST /api/usager/auth/reset-password
 * @desc    Reinitialisation du mot de passe avec token
 * @access  Public
 */
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Champs requis',
        message: 'Token et nouveau mot de passe requis'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Mots de passe differents',
        message: 'Les mots de passe ne correspondent pas'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 6 caracteres'
      });
    }

    // Trouver l'adherent avec le token valide
    const utilisateur =await Utilisateur.findByResetToken(token);

    if (!utilisateur) {
      return res.status(400).json({
        error: 'Token invalide',
        message: 'Le lien est invalide ou a expire'
      });
    }

    // Mettre a jour le mot de passe
    utilisateur.password = password;
    utilisateur.password_reset_token = null;
    utilisateur.password_reset_expires = null;
    utilisateur.password_created = true;
    await utilisateur.save();

    res.json({
      message: 'Mot de passe mis a jour avec succes'
    });
  } catch (error) {
    console.error('Erreur reset password:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la reinitialisation'
    });
  }
});

/**
 * @route   POST /api/usager/auth/create-password
 * @desc    Creation initiale du mot de passe (premier acces)
 * @access  Public
 */
router.post('/create-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Champs requis',
        message: 'Token et mot de passe requis'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Mots de passe differents',
        message: 'Les mots de passe ne correspondent pas'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 6 caracteres'
      });
    }

    // Trouver l'adherent avec le token valide
    const utilisateur =await Utilisateur.findByResetToken(token);

    if (!utilisateur) {
      return res.status(400).json({
        error: 'Token invalide',
        message: 'Le lien est invalide ou a expire'
      });
    }

    // Verifier que le mot de passe n'a pas deja ete cree
    if (utilisateur.password_created) {
      return res.status(400).json({
        error: 'Deja cree',
        message: 'Votre mot de passe a deja ete cree. Utilisez "Mot de passe oublie".'
      });
    }

    // Mettre a jour le mot de passe
    utilisateur.password = password;
    utilisateur.password_reset_token = null;
    utilisateur.password_reset_expires = null;
    utilisateur.password_created = true;
    await utilisateur.save();

    // Generer un token de connexion
    const authToken = utilisateur.generateAuthToken();

    res.json({
      message: 'Mot de passe cree avec succes',
      token: authToken,
      usager: {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        code_barre: utilisateur.code_barre
      }
    });
  } catch (error) {
    console.error('Erreur create password:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la creation du mot de passe'
    });
  }
});

/**
 * @route   GET /api/usager/auth/me
 * @desc    Recuperer les infos de l'usager connecte
 * @access  Private (usager)
 */
router.get('/me', authUsager, async (req, res) => {
  try {
    const utilisateur =await Utilisateur.findByPk(req.usagerId, {
      attributes: [
        'id', 'code_barre', 'prenom', 'nom', 'email', 'telephone',
        'adresse', 'ville', 'code_postal', 'date_naissance',
        'date_adhesion', 'date_fin_adhesion', 'statut', 'photo'
      ]
    });

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Non trouve',
        message: 'Utilisateur non trouve'
      });
    }

    // Verifier si l'adhesion est expiree
    const adhesionExpiree = utilisateur.date_fin_adhesion &&
      new Date(utilisateur.date_fin_adhesion) < new Date();

    res.json({
      ...utilisateur.toJSON(),
      adhesion_expiree: adhesionExpiree
    });
  } catch (error) {
    console.error('Erreur get me:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation du profil'
    });
  }
});

/**
 * @route   PUT /api/usager/auth/password
 * @desc    Changer son mot de passe (connecte)
 * @access  Private (usager)
 */
router.put('/password', authUsager, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Champs requis',
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Mots de passe differents',
        message: 'Les nouveaux mots de passe ne correspondent pas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 6 caracteres'
      });
    }

    const utilisateur =await Utilisateur.findByPk(req.usagerId);

    // Verifier l'ancien mot de passe
    const isMatch = await utilisateur.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Mot de passe incorrect',
        message: 'Le mot de passe actuel est incorrect'
      });
    }

    // Mettre a jour
    utilisateur.password = newPassword;
    await utilisateur.save();

    res.json({
      message: 'Mot de passe mis a jour avec succes'
    });
  } catch (error) {
    console.error('Erreur change password:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

/**
 * @route   GET /api/usager/auth/verify-token/:token
 * @desc    Verifier si un token de reset est valide
 * @access  Public
 */
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const utilisateur =await Utilisateur.findByResetToken(token);

    if (!utilisateur) {
      return res.status(400).json({
        valid: false,
        message: 'Token invalide ou expire'
      });
    }

    res.json({
      valid: true,
      isFirstAccess: !utilisateur.password_created,
      email: utilisateur.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masquer l'email
    });
  } catch (error) {
    console.error('Erreur verify token:', error);
    res.status(500).json({
      valid: false,
      message: 'Erreur lors de la verification'
    });
  }
});

module.exports = router;
