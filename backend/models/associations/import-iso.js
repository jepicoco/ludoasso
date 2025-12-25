/**
 * Associations pour le module Import ISO (import livres BDP)
 * ImportSession, LotBDP
 */

function setupImportISOAssociations(models) {
  const {
    ImportSession,
    LotBDP,
    ExemplaireLivre,
    Structure,
    Utilisateur
  } = models;

  // ImportSession associations
  if (ImportSession) {
    if (Structure) {
      ImportSession.belongsTo(Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }

    if (Utilisateur) {
      ImportSession.belongsTo(Utilisateur, {
        foreignKey: 'created_by',
        as: 'createur'
      });
    }

    if (LotBDP) {
      ImportSession.hasMany(LotBDP, {
        foreignKey: 'import_session_id',
        as: 'lotsBDP'
      });
    }
  }

  // LotBDP associations
  if (LotBDP) {
    if (Structure) {
      LotBDP.belongsTo(Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }

    if (ImportSession) {
      LotBDP.belongsTo(ImportSession, {
        foreignKey: 'import_session_id',
        as: 'importSession'
      });
    }

    if (ExemplaireLivre) {
      LotBDP.hasMany(ExemplaireLivre, {
        foreignKey: 'lot_bdp_id',
        as: 'exemplaires'
      });

      ExemplaireLivre.belongsTo(LotBDP, {
        foreignKey: 'lot_bdp_id',
        as: 'lotBDP'
      });
    }
  }
}

module.exports = setupImportISOAssociations;
