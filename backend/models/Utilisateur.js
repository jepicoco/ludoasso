const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Calculate the default date_fin_adhesion_association
 * Based on academic year (Sept -> Aug)
 * @returns {string} Date in YYYY-MM-DD format
 */
function calculateDefaultAdhesionEndDate() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // If month >= 9 (September), end year is next year
  // If month < 9, end year is current year
  const endYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

  return `${endYear}-08-31`;
}

module.exports = (sequelize) => {
  const Utilisateur = sequelize.define('Utilisateur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      comment: 'Format: USA00000001 (ancien: ADH00000001)'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/
      }
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date d\'adhesion'
    },
    date_fin_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin de cotisation (pour emprunts)'
    },
    adhesion_association: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Membre de l\'association (pour reduction cotisation) - DEPRECATED use date_fin_adhesion_association'
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif', 'suspendu'),
      allowNull: false,
      defaultValue: 'actif'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL ou chemin vers la photo'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_fin_adhesion_association: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin d\'adhesion a l\'association (31/08 de l\'annee academique)'
    },
    role: {
      type: DataTypes.ENUM('usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'),
      allowNull: false,
      defaultValue: 'usager',
      comment: 'Role de l\'utilisateur dans le systeme. Hierarchie: usager(0) < benevole(1) < agent(2) < gestionnaire(3) < comptable(4) < administrateur(5)'
    },
    modules_autorises: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Liste des modules autorises: ludotheque, bibliotheque, filmotheque, discotheque. NULL = tous les modules'
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Token de reinitialisation de mot de passe'
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date expiration du token reset'
    },
    password_created: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Mot de passe deja cree par usager'
    }
  }, {
    tableName: 'utilisateurs',
    timestamps: false,
    hooks: {
      beforeCreate: async (utilisateur) => {
        if (utilisateur.password) {
          const salt = await bcrypt.genSalt(10);
          utilisateur.password = await bcrypt.hash(utilisateur.password, salt);
        }
      },
      afterCreate: async (utilisateur) => {
        // Generate barcode: USA + 8-digit padded ID
        if (!utilisateur.code_barre) {
          const paddedId = String(utilisateur.id).padStart(8, '0');
          utilisateur.code_barre = `USA${paddedId}`;
          await utilisateur.update({ code_barre: utilisateur.code_barre }, { hooks: false });
        }
      },
      beforeUpdate: async (utilisateur) => {
        if (utilisateur.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          utilisateur.password = await bcrypt.hash(utilisateur.password, salt);
        }
      }
    }
  });

  // Instance methods
  Utilisateur.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  Utilisateur.prototype.generateAuthToken = function() {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        statut: this.statut
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  };

  Utilisateur.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.password_reset_token;
    delete values.password_reset_expires;
    return values;
  };

  // Generate a password reset token valid for 24h
  Utilisateur.prototype.generatePasswordResetToken = async function() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    this.password_reset_token = hashedToken;
    this.password_reset_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.save({ hooks: false });

    return token; // Return unhashed token for email
  };

  // Check if reset token is valid
  Utilisateur.findByResetToken = async function(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return await this.findOne({
      where: {
        password_reset_token: hashedToken,
        password_reset_expires: { [sequelize.Sequelize.Op.gt]: new Date() }
      }
    });
  };

  /**
   * Check if user is an association member (adhesion active)
   * @returns {boolean}
   */
  Utilisateur.prototype.isAssociationMember = function() {
    if (!this.date_fin_adhesion_association) return false;
    const today = new Date();
    const endDate = new Date(this.date_fin_adhesion_association);
    return endDate >= today;
  };

  /**
   * Set the user as association member with default end date
   */
  Utilisateur.prototype.setAssociationMember = async function() {
    this.date_fin_adhesion_association = calculateDefaultAdhesionEndDate();
    await this.save({ hooks: false });
  };

  /**
   * Get the default adhesion end date for the current academic year
   */
  Utilisateur.getDefaultAdhesionEndDate = calculateDefaultAdhesionEndDate;

  /**
   * Check if user has access to a specific module
   * Admin has access to all modules
   * NULL or empty modules_autorises = access to all modules (permissive)
   * @param {string} module - Module code: ludotheque, bibliotheque, filmotheque, discotheque
   * @returns {boolean}
   */
  Utilisateur.prototype.hasModuleAccess = function(module) {
    // Admin has access to everything
    if (this.role === 'administrateur') return true;

    // NULL or empty array = access to all modules (permissive)
    if (!this.modules_autorises || this.modules_autorises.length === 0) return true;

    // Check if module is in the allowed list
    return this.modules_autorises.includes(module);
  };

  /**
   * Get the list of allowed modules for this user
   * @returns {Array<string>|null} - Array of module codes or null for all modules
   */
  Utilisateur.prototype.getAllowedModules = function() {
    // Admin has access to everything
    if (this.role === 'administrateur') return null;

    // NULL or empty = all modules
    if (!this.modules_autorises || this.modules_autorises.length === 0) return null;

    return this.modules_autorises;
  };

  /**
   * Available modules constant
   */
  Utilisateur.MODULES = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

  /**
   * Role hierarchy constant
   */
  Utilisateur.ROLE_HIERARCHY = {
    'usager': 0,
    'benevole': 1,
    'agent': 2,
    'gestionnaire': 3,
    'comptable': 4,
    'administrateur': 5
  };

  return Utilisateur;
};
