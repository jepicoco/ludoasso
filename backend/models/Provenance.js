/**
 * Modèle Provenance
 *
 * Gère les types de provenance des articles (achat, don, échange, etc.)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Provenance = sequelize.define('Provenance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique de la provenance'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé affiché'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-box',
      comment: 'Icône Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#6c757d',
      comment: 'Couleur hexadécimale'
    },
    est_acquisition: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'True si l\'article devient propriété de la structure'
    },
    retour_prevu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True si l\'article doit être retourné'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'provenances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Récupère toutes les provenances actives
   */
  Provenance.getActives = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre', 'ASC'], ['libelle', 'ASC']]
    });
  };

  /**
   * Récupère une provenance par son code
   */
  Provenance.getByCode = async function(code) {
    return await this.findOne({
      where: { code, actif: true }
    });
  };

  /**
   * Récupère les provenances qui sont des acquisitions (propriété)
   */
  Provenance.getAcquisitions = async function() {
    return await this.findAll({
      where: { actif: true, est_acquisition: true },
      order: [['ordre', 'ASC']]
    });
  };

  /**
   * Récupère les provenances avec retour prévu (prêt, dépôt)
   */
  Provenance.getTemporaires = async function() {
    return await this.findAll({
      where: { actif: true, retour_prevu: true },
      order: [['ordre', 'ASC']]
    });
  };

  return Provenance;
};
