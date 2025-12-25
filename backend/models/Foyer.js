const { DataTypes } = require('sequelize');

/**
 * Modèle Foyer
 * Représente un ménage/foyer familial
 */
module.exports = (sequelize) => {
  const Foyer = sequelize.define('Foyer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nom du foyer (optionnel, ex: "Famille Dupont")'
    },
    responsable_principal_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Responsable principal du foyer'
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
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    quotient_familial: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'QF du foyer (hérité par les membres)'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'foyers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Génère le nom du foyer à partir du responsable principal
   */
  Foyer.prototype.genererNom = async function() {
    if (!this.responsable_principal_id) return;

    const Utilisateur = sequelize.models.Utilisateur;
    const responsable = await Utilisateur.findByPk(this.responsable_principal_id);

    if (responsable) {
      this.nom = `Foyer ${responsable.nom}`;
      await this.save({ hooks: false });
    }
  };

  /**
   * Compte le nombre de membres du foyer
   */
  Foyer.prototype.compterMembres = async function() {
    const MembreFoyer = sequelize.models.MembreFoyer;
    return await MembreFoyer.count({
      where: {
        foyer_id: this.id,
        date_fin: null
      }
    });
  };

  /**
   * Récupère tous les membres actifs du foyer
   */
  Foyer.prototype.getMembres = async function() {
    const MembreFoyer = sequelize.models.MembreFoyer;
    const Utilisateur = sequelize.models.Utilisateur;

    return await MembreFoyer.findAll({
      where: {
        foyer_id: this.id,
        date_fin: null
      },
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'date_naissance', 'code_barre']
      }],
      order: [
        ['type_lien', 'ASC'],
        [{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']
      ]
    });
  };

  return Foyer;
};
