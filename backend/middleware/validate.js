/**
 * Middleware de validation centralise avec express-validator
 *
 * Usage dans les routes:
 *   const { validate, schemas } = require('../middleware/validate');
 *   router.post('/', validate(schemas.emprunt.create), controller.create);
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware qui verifie les erreurs de validation
 * et retourne une reponse 400 si des erreurs sont presentes
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Executer toutes les validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Formater les erreurs de maniere coherente
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      error: 'Validation error',
      message: 'Les donnees fournies sont invalides',
      details: formattedErrors
    });
  };
};

/**
 * Validateurs communs reutilisables
 */
const common = {
  // ID numerique dans les parametres
  idParam: param('id')
    .isInt({ min: 1 })
    .withMessage('ID invalide'),

  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le numero de page doit etre un entier positif'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit etre entre 1 et 100'),

  // Email
  email: body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),

  emailOptional: body('email')
    .optional()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),

  // Telephone
  telephone: body('telephone')
    .optional()
    .matches(/^[0-9+\s.-]{10,20}$/)
    .withMessage('Numero de telephone invalide'),

  // Date
  date: (field) => body(field)
    .isISO8601()
    .withMessage(`${field} doit etre une date valide (ISO 8601)`),

  dateOptional: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} doit etre une date valide (ISO 8601)`),

  // Montant monetaire
  montant: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} doit etre un montant positif`),

  // Texte avec longueur
  text: (field, min = 1, max = 255) => body(field)
    .trim()
    .isLength({ min, max })
    .withMessage(`${field} doit contenir entre ${min} et ${max} caracteres`),

  textOptional: (field, max = 255) => body(field)
    .optional()
    .trim()
    .isLength({ max })
    .withMessage(`${field} ne doit pas depasser ${max} caracteres`)
};

/**
 * Schemas de validation par entite
 */
const schemas = {
  // Emprunts
  emprunt: {
    create: [
      body('utilisateur_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('utilisateur_id doit etre un entier positif'),
      body('adherent_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('adherent_id doit etre un entier positif'),
      body('jeu_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('jeu_id doit etre un entier positif'),
      body('livre_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('livre_id doit etre un entier positif'),
      body('film_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('film_id doit etre un entier positif'),
      body('cd_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('cd_id doit etre un entier positif'),
      common.dateOptional('date_retour_prevue'),
      common.textOptional('commentaire', 500)
    ],
    update: [
      common.idParam,
      common.dateOptional('date_retour_prevue'),
      common.textOptional('commentaire', 500),
      body('statut')
        .optional()
        .isIn(['en_cours', 'retourne', 'en_retard'])
        .withMessage('Statut invalide')
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Cotisations
  cotisation: {
    create: [
      body('utilisateur_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('utilisateur_id doit etre un entier positif'),
      body('adherent_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('adherent_id doit etre un entier positif'),
      body('tarif_cotisation_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('tarif_cotisation_id invalide'),
      common.montant('montant'),
      body('mode_paiement_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('mode_paiement_id invalide'),
      common.dateOptional('periode_debut'),
      common.dateOptional('periode_fin')
    ],
    update: [
      common.idParam,
      common.montant('montant').optional(),
      body('statut')
        .optional()
        .isIn(['en_cours', 'expiree', 'annulee'])
        .withMessage('Statut invalide')
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Utilisateurs / Adherents
  utilisateur: {
    create: [
      common.text('nom', 1, 100),
      common.text('prenom', 1, 100),
      common.email,
      common.telephone,
      body('date_naissance')
        .optional()
        .isISO8601()
        .withMessage('Date de naissance invalide'),
      common.textOptional('adresse', 255),
      common.textOptional('code_postal', 10),
      common.textOptional('ville', 100)
    ],
    update: [
      common.idParam,
      common.textOptional('nom', 100),
      common.textOptional('prenom', 100),
      common.emailOptional,
      common.telephone,
      body('statut')
        .optional()
        .isIn(['actif', 'inactif', 'suspendu', 'archive'])
        .withMessage('Statut invalide')
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Jeux
  jeu: {
    create: [
      common.text('nom', 1, 255),
      body('nb_joueurs_min')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Nombre de joueurs minimum invalide'),
      body('nb_joueurs_max')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Nombre de joueurs maximum invalide'),
      body('age_min')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Age minimum invalide'),
      body('duree_partie')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Duree de partie invalide'),
      common.textOptional('description', 2000)
    ],
    update: [
      common.idParam,
      common.textOptional('nom', 255),
      body('statut')
        .optional()
        .isIn(['disponible', 'emprunte', 'reserve', 'en_reparation', 'indisponible'])
        .withMessage('Statut invalide')
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Livres
  livre: {
    create: [
      common.text('titre', 1, 255),
      body('isbn')
        .optional()
        .isISBN()
        .withMessage('ISBN invalide'),
      body('annee_publication')
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
        .withMessage('Annee de publication invalide'),
      common.textOptional('resume', 2000)
    ],
    update: [
      common.idParam,
      common.textOptional('titre', 255),
      body('statut')
        .optional()
        .isIn(['disponible', 'emprunte', 'reserve', 'en_reparation', 'indisponible'])
        .withMessage('Statut invalide')
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Films
  film: {
    create: [
      common.text('titre', 1, 255),
      body('annee')
        .optional()
        .isInt({ min: 1888, max: new Date().getFullYear() + 5 })
        .withMessage('Annee invalide'),
      body('duree')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Duree invalide'),
      common.textOptional('synopsis', 2000)
    ],
    update: [
      common.idParam,
      common.textOptional('titre', 255)
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Disques
  disque: {
    create: [
      common.text('titre', 1, 255),
      body('annee')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('Annee invalide'),
      common.textOptional('label', 100)
    ],
    update: [
      common.idParam,
      common.textOptional('titre', 255)
    ],
    getById: [common.idParam],
    list: [common.page, common.limit]
  },

  // Authentification
  auth: {
    login: [
      common.email,
      body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
    ],
    changePassword: [
      body('currentPassword')
        .notEmpty()
        .withMessage('Mot de passe actuel requis'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Le nouveau mot de passe doit contenir au moins 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[0-9]/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
    ],
    forgotPassword: [common.email],
    resetPassword: [
      body('token')
        .notEmpty()
        .withMessage('Token requis'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caracteres')
    ]
  }
};

module.exports = {
  validate,
  schemas,
  common,
  // Re-export pour usage direct
  body,
  param,
  query,
  validationResult
};
