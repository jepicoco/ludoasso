const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CodeBarreUtilisateur = sequelize.define('CodeBarreUtilisateur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    lot_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('reserve', 'utilise', 'annule', 'grille'),
      allowNull: false,
      defaultValue: 'reserve'
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    date_reservation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_utilisation: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_annulation: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'codes_barres_utilisateurs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Verifier si un code-barre est disponible (reserve mais pas encore utilise)
  CodeBarreUtilisateur.isAvailable = async function(codeBarre) {
    const code = await this.findOne({
      where: { code_barre: codeBarre, statut: 'reserve' }
    });
    return !!code;
  };

  // Verifier si un code existe (peu importe le statut)
  CodeBarreUtilisateur.exists = async function(codeBarre) {
    const code = await this.findOne({ where: { code_barre: codeBarre } });
    return !!code;
  };

  // Marquer un code comme utilise et l'associer a un utilisateur
  CodeBarreUtilisateur.markAsUsed = async function(codeBarre, utilisateurId) {
    const code = await this.findOne({
      where: { code_barre: codeBarre, statut: 'reserve' }
    });
    if (!code) {
      throw new Error('Code-barre non trouve ou deja utilise');
    }
    code.statut = 'utilise';
    code.utilisateur_id = utilisateurId;
    code.date_utilisation = new Date();
    await code.save();

    // Incrementer le compteur nb_utilises du lot
    if (code.lot_id) {
      const { LotCodesBarres } = require('./index');
      await LotCodesBarres.increment('nb_utilises', {
        where: { id: code.lot_id }
      });
    }

    return code;
  };

  // Annuler un code (le rendre a nouveau disponible ou le griller)
  CodeBarreUtilisateur.cancel = async function(codeBarreOrId, griller = false) {
    const whereClause = typeof codeBarreOrId === 'number'
      ? { id: codeBarreOrId }
      : { code_barre: codeBarreOrId };

    const code = await this.findOne({ where: whereClause });
    if (!code) {
      throw new Error('Code-barre non trouve');
    }
    if (code.statut === 'utilise') {
      throw new Error('Impossible d\'annuler un code deja utilise');
    }
    if (code.statut === 'grille') {
      throw new Error('Ce code est deja grille');
    }

    code.statut = griller ? 'grille' : 'annule';
    code.date_annulation = new Date();
    await code.save();

    // Incrementer le compteur nb_annules du lot
    if (code.lot_id) {
      const { LotCodesBarres } = require('./index');
      await LotCodesBarres.increment('nb_annules', {
        where: { id: code.lot_id }
      });
    }

    return code;
  };

  // Obtenir le prochain code disponible (reserve)
  CodeBarreUtilisateur.getNextAvailable = async function() {
    return await this.findOne({
      where: { statut: 'reserve' },
      order: [['date_reservation', 'ASC']]
    });
  };

  // Remettre un code annule en disponible
  CodeBarreUtilisateur.restore = async function(codeBarreOrId) {
    const whereClause = typeof codeBarreOrId === 'number'
      ? { id: codeBarreOrId }
      : { code_barre: codeBarreOrId };

    const code = await this.findOne({ where: whereClause });
    if (!code) {
      throw new Error('Code-barre non trouve');
    }
    if (code.statut !== 'annule') {
      throw new Error('Seuls les codes annules peuvent etre restaures');
    }

    code.statut = 'reserve';
    code.date_annulation = null;
    await code.save();

    // Decrementer le compteur nb_annules du lot
    if (code.lot_id) {
      const { LotCodesBarres } = require('./index');
      await LotCodesBarres.decrement('nb_annules', {
        where: { id: code.lot_id }
      });
    }

    return code;
  };

  return CodeBarreUtilisateur;
};
