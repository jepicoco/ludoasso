/**
 * Modele ConfigurationAccesDonnees
 * Configuration des champs PII visibles par role
 * Table singleton (une seule ligne)
 */

const { DataTypes } = require('sequelize');

// Champs PII configurables
const PII_FIELDS = [
  'nom', 'prenom', 'email', 'telephone',
  'adresse', 'ville', 'code_postal',
  'date_naissance', 'photo', 'notes'
];

// Roles disponibles
const ROLES = ['benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];

// Configuration par defaut
const DEFAULT_CHAMPS = {
  administrateur: [...PII_FIELDS],
  comptable: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal'],
  gestionnaire: [...PII_FIELDS],
  agent: ['nom', 'prenom', 'email', 'telephone'],
  benevole: ['nom', 'prenom']
};

const DEFAULT_EMPRUNTS = {
  administrateur: true,
  comptable: true,
  gestionnaire: true,
  agent: true,
  benevole: true
};

const DEFAULT_COTISATIONS = {
  administrateur: true,
  comptable: true,
  gestionnaire: true,
  agent: false,
  benevole: false
};

module.exports = (sequelize) => {
  const ConfigurationAccesDonnees = sequelize.define('ConfigurationAccesDonnees', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    champs_visibles_par_role: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: DEFAULT_CHAMPS,
      get() {
        const val = this.getDataValue('champs_visibles_par_role');
        return val || DEFAULT_CHAMPS;
      }
    },
    acces_historique_emprunts: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: DEFAULT_EMPRUNTS,
      get() {
        const val = this.getDataValue('acces_historique_emprunts');
        return val || DEFAULT_EMPRUNTS;
      }
    },
    acces_cotisations: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: DEFAULT_COTISATIONS,
      get() {
        const val = this.getDataValue('acces_cotisations');
        return val || DEFAULT_COTISATIONS;
      }
    }
  }, {
    tableName: 'configuration_acces_donnees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Obtient l'instance unique de configuration (cree si inexistante)
   */
  ConfigurationAccesDonnees.getInstance = async function() {
    let config = await this.findOne();
    if (!config) {
      config = await this.create({
        champs_visibles_par_role: DEFAULT_CHAMPS,
        acces_historique_emprunts: DEFAULT_EMPRUNTS,
        acces_cotisations: DEFAULT_COTISATIONS
      });
    }
    return config;
  };

  /**
   * Obtient les champs visibles pour un role
   * @param {string} role - Role de l'utilisateur
   * @returns {Promise<string[]>} Liste des champs visibles
   */
  ConfigurationAccesDonnees.getChampsVisibles = async function(role) {
    // Admin voit toujours tout
    if (role === 'administrateur') {
      return PII_FIELDS;
    }

    const config = await this.getInstance();
    const champsConfig = config.champs_visibles_par_role || {};
    return champsConfig[role] || ['nom', 'prenom'];
  };

  /**
   * Verifie si un role peut voir l'historique des emprunts
   * @param {string} role
   * @returns {Promise<boolean>}
   */
  ConfigurationAccesDonnees.peutVoirEmprunts = async function(role) {
    if (role === 'administrateur') return true;

    const config = await this.getInstance();
    const accesConfig = config.acces_historique_emprunts || {};
    return accesConfig[role] !== false;
  };

  /**
   * Verifie si un role peut voir les cotisations
   * @param {string} role
   * @returns {Promise<boolean>}
   */
  ConfigurationAccesDonnees.peutVoirCotisations = async function(role) {
    if (role === 'administrateur') return true;

    const config = await this.getInstance();
    const accesConfig = config.acces_cotisations || {};
    return accesConfig[role] === true;
  };

  // Constantes exportees
  ConfigurationAccesDonnees.PII_FIELDS = PII_FIELDS;
  ConfigurationAccesDonnees.ROLES = ROLES;
  ConfigurationAccesDonnees.DEFAULT_CHAMPS = DEFAULT_CHAMPS;
  ConfigurationAccesDonnees.DEFAULT_EMPRUNTS = DEFAULT_EMPRUNTS;
  ConfigurationAccesDonnees.DEFAULT_COTISATIONS = DEFAULT_COTISATIONS;

  return ConfigurationAccesDonnees;
};
