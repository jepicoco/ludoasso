const { ParametresStructure, Adherent } = require('../models');

/**
 * Récupérer les paramètres de la structure
 */
exports.getParametres = async (req, res) => {
  try {
    // Récupérer le premier (et unique) enregistrement
    let parametres = await ParametresStructure.findOne();

    // Si aucun paramètre n'existe, créer un enregistrement par défaut
    if (!parametres) {
      parametres = await ParametresStructure.create({
        nom_structure: 'Ludothèque',
        pays: 'France'
      });
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des paramètres',
      message: error.message
    });
  }
};

/**
 * Récupérer les paramètres publics (sans données sensibles)
 */
exports.getParametresPublics = async (req, res) => {
  try {
    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create({
        nom_structure: 'Ludothèque',
        pays: 'France'
      });
    }

    res.json(parametres.toPublicJSON());
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres publics:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des paramètres publics',
      message: error.message
    });
  }
};

/**
 * Mettre à jour les paramètres de la structure
 * Accessible uniquement aux administrateurs
 */
exports.updateParametres = async (req, res) => {
  try {
    const updateData = req.body;

    // Récupérer ou créer les paramètres
    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create(updateData);
    } else {
      await parametres.update(updateData);
    }

    res.json({
      message: 'Paramètres mis à jour avec succès',
      parametres
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour des paramètres',
      message: error.message
    });
  }
};

/**
 * Upload du logo de la structure
 * Accessible uniquement aux administrateurs
 */
exports.uploadLogo = async (req, res) => {
  try {
    // TODO: Implémenter l'upload de fichier avec multer
    // Pour l'instant, on accepte juste un chemin/URL
    const { logo } = req.body;

    if (!logo) {
      return res.status(400).json({
        error: 'Aucun logo fourni'
      });
    }

    let parametres = await ParametresStructure.findOne();

    if (!parametres) {
      parametres = await ParametresStructure.create({ logo });
    } else {
      await parametres.update({ logo });
    }

    res.json({
      message: 'Logo mis à jour avec succès',
      logo: parametres.logo
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'upload du logo',
      message: error.message
    });
  }
};

/**
 * Récupérer la liste des utilisateurs avec leurs rôles
 * Accessible aux administrateurs et gestionnaires
 */
exports.getUtilisateurs = async (req, res) => {
  try {
    const { role, statut } = req.query;

    let where = {};

    if (role) {
      where.role = role;
    }

    if (statut) {
      where.statut = statut;
    }

    const utilisateurs = await Adherent.findAll({
      where,
      attributes: [
        'id', 'nom', 'prenom', 'email', 'telephone',
        'role', 'statut', 'date_adhesion', 'code_barre'
      ],
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    res.json(utilisateurs);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs',
      message: error.message
    });
  }
};

/**
 * Changer le rôle d'un utilisateur
 * Accessible uniquement aux administrateurs
 */
exports.changerRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validation du rôle
    const rolesValides = ['usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur'];
    if (!rolesValides.includes(role)) {
      return res.status(400).json({
        error: 'Rôle invalide',
        message: `Le rôle doit être l'un des suivants: ${rolesValides.join(', ')}`
      });
    }

    // Récupérer l'utilisateur
    const utilisateur = await Adherent.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Empêcher un utilisateur de modifier son propre rôle
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(403).json({
        error: 'Action interdite',
        message: 'Vous ne pouvez pas modifier votre propre rôle'
      });
    }

    const ancienRole = utilisateur.role;
    await utilisateur.update({ role });

    // TODO: Log de l'audit - enregistrer qui a changé quel rôle pour qui

    res.json({
      message: `Rôle changé de ${ancienRole} à ${role}`,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role
      }
    });
  } catch (error) {
    console.error('Erreur lors du changement de rôle:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de rôle',
      message: error.message
    });
  }
};

/**
 * Réinitialiser le mot de passe d'un utilisateur
 * Envoie un email avec un lien de réinitialisation
 * Accessible uniquement aux administrateurs
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const crypto = require('crypto');
    const emailService = require('../services/emailService');

    // Récupérer l'utilisateur
    const utilisateur = await Adherent.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la réinitialisation du mot de passe d'un admin par un autre admin
    if (utilisateur.role === 'administrateur') {
      return res.status(403).json({
        error: 'Action interdite',
        message: 'Impossible de réinitialiser le mot de passe d\'un administrateur'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Sauvegarder le token (dans un champ notes temporairement, ou ajouter un champ dédié)
    // Pour l'instant, on génère un nouveau mot de passe temporaire et on l'envoie
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Mettre à jour le mot de passe (le hook beforeUpdate va le hasher)
    await utilisateur.update({ password: tempPassword });

    // Envoyer l'email avec le mot de passe temporaire
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';

      await emailService.sendEmail({
        to: utilisateur.email,
        subject: 'Réinitialisation de votre mot de passe - Ludothèque',
        html: `
          <h2>Réinitialisation de votre mot de passe</h2>
          <p>Bonjour ${utilisateur.prenom},</p>
          <p>Votre mot de passe a été réinitialisé par un administrateur.</p>
          <p><strong>Votre nouveau mot de passe temporaire :</strong> <code>${tempPassword}</code></p>
          <p>Veuillez vous connecter avec ce mot de passe et le changer immédiatement.</p>
          <p><a href="${appUrl}/admin/login.html">Se connecter</a></p>
          <br>
          <p><em>Si vous n'avez pas demandé cette réinitialisation, veuillez contacter l'administrateur.</em></p>
        `,
        adherentId: utilisateur.id,
        metadata: {
          destinataire_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
          type: 'password_reset'
        }
      });

      res.json({
        message: 'Email de réinitialisation envoyé',
        email: utilisateur.email
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      // Le mot de passe a quand même été changé, on informe l'admin
      res.status(500).json({
        error: 'Mot de passe réinitialisé mais erreur d\'envoi d\'email',
        message: emailError.message,
        tempPassword: tempPassword // On renvoie le mot de passe temporaire à l'admin en cas d'échec email
      });
    }
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({
      error: 'Erreur lors de la réinitialisation du mot de passe',
      message: error.message
    });
  }
};

/**
 * Récupérer la liste des rôles disponibles
 */
exports.getRoles = async (req, res) => {
  try {
    const roles = [
      {
        valeur: 'usager',
        libelle: 'Usager',
        description: 'Accès consultation uniquement (profil et emprunts personnels)',
        niveau: 0
      },
      {
        valeur: 'benevole',
        libelle: 'Bénévole',
        description: 'Gestion des emprunts/retours, consultation des adhérents et jeux',
        niveau: 1
      },
      {
        valeur: 'gestionnaire',
        libelle: 'Gestionnaire',
        description: 'Gestion complète des adhérents, jeux, emprunts et cotisations',
        niveau: 2
      },
      {
        valeur: 'comptable',
        libelle: 'Comptable',
        description: 'Accès comptabilité, cotisations et exports',
        niveau: 3
      },
      {
        valeur: 'administrateur',
        libelle: 'Administrateur',
        description: 'Accès total à toutes les fonctionnalités',
        niveau: 4
      }
    ];

    res.json(roles);
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des rôles',
      message: error.message
    });
  }
};
