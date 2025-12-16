const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModuleActif = sequelize.define('ModuleActif', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique du module (scanner, ludotheque, bibliotheque, etc.)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiche du module'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description du module et de son impact'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'box',
      comment: 'Icone Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'secondary',
      comment: 'Couleur Bootstrap ou code hex'
    },
    couleur_texte: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Couleur du texte (hex). Si null, calcule automatiquement'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Module actif ou non'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans la liste'
    }
  }, {
    tableName: 'modules_actifs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Recupere tous les modules actifs
   * @returns {Promise<Array<string>>} Liste des codes de modules actifs
   */
  ModuleActif.getActifs = async function() {
    const modules = await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']],
      attributes: ['code']
    });
    return modules.map(m => m.code);
  };

  /**
   * Verifie si un module est actif
   * @param {string} code - Code du module
   * @returns {Promise<boolean>}
   */
  ModuleActif.isActif = async function(code) {
    const module = await this.findOne({
      where: { code, actif: true }
    });
    return !!module;
  };

  /**
   * Active ou desactive un module
   * @param {string} code - Code du module
   * @returns {Promise<ModuleActif>}
   */
  ModuleActif.toggleModule = async function(code) {
    const module = await this.findOne({ where: { code } });
    if (!module) {
      throw new Error(`Module ${code} introuvable`);
    }
    module.actif = !module.actif;
    await module.save();
    return module;
  };

  /**
   * Recupere tous les modules avec leurs details
   * @returns {Promise<Array<ModuleActif>>}
   */
  ModuleActif.getAllWithDetails = async function() {
    return await this.findAll({
      order: [['ordre_affichage', 'ASC']]
    });
  };

  return ModuleActif;
};
