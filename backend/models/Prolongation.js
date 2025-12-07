const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prolongation = sequelize.define('Prolongation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    emprunt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'emprunts',
        key: 'id'
      }
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('automatique', 'manuelle'),
      allowNull: false,
      defaultValue: 'automatique',
      comment: 'Prolongation auto ou demande manuelle'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'validee', 'refusee'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'Statut de la prolongation'
    },
    date_demande: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date de la demande'
    },
    date_traitement: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de validation/refus'
    },
    ancienne_date_retour: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de retour avant prolongation'
    },
    nouvelle_date_retour: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Nouvelle date de retour apres prolongation'
    },
    jours_ajoutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Nombre de jours ajoutes'
    },
    reservation_en_attente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Un autre adherent attend cet article'
    },
    message_reservation_affiche: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Le message de reservation a ete affiche'
    },
    traite_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'ID admin qui a traite (si manuelle)'
    },
    commentaire_admin: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Commentaire admin'
    }
  }, {
    tableName: 'prolongations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['emprunt_id'] },
      { fields: ['utilisateur_id'] },
      { fields: ['statut'] },
      { fields: ['date_demande'] }
    ]
  });

  // Methodes d'instance
  Prolongation.prototype.valider = async function(adminId, commentaire = null) {
    this.statut = 'validee';
    this.date_traitement = new Date();
    this.traite_par = adminId;
    if (commentaire) this.commentaire_admin = commentaire;
    await this.save();

    // Mettre a jour l'emprunt
    const Emprunt = sequelize.models.Emprunt;
    const emprunt = await Emprunt.findByPk(this.emprunt_id);
    if (emprunt) {
      emprunt.date_retour_prevue = this.nouvelle_date_retour;
      emprunt.nb_prolongations += 1;
      await emprunt.save();
    }

    return this;
  };

  Prolongation.prototype.refuser = async function(adminId, commentaire = null) {
    this.statut = 'refusee';
    this.date_traitement = new Date();
    this.traite_par = adminId;
    if (commentaire) this.commentaire_admin = commentaire;
    await this.save();
    return this;
  };

  return Prolongation;
};
