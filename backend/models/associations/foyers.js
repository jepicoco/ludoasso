/**
 * Associations pour les Foyers et relations familiales etendues
 * - Foyer: ménage/foyer familial
 * - MembreFoyer: liaison utilisateur-foyer avec configuration garde partagée
 */

function setupFoyersAssociations(models) {
  const { Utilisateur, Foyer, MembreFoyer, Structure } = models;

  // =======================
  // Foyer associations
  // =======================

  // Foyer -> Responsable principal (Utilisateur)
  Foyer.belongsTo(Utilisateur, {
    foreignKey: 'responsable_principal_id',
    as: 'responsablePrincipal'
  });

  // Utilisateur -> Foyers où il est responsable principal
  Utilisateur.hasMany(Foyer, {
    foreignKey: 'responsable_principal_id',
    as: 'foyersResponsable'
  });

  // Foyer -> Structure (optionnel, multi-structure)
  if (Structure) {
    Foyer.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });

    Structure.hasMany(Foyer, {
      foreignKey: 'structure_id',
      as: 'foyers'
    });
  }

  // =======================
  // MembreFoyer associations (table de liaison)
  // =======================

  // MembreFoyer -> Utilisateur
  MembreFoyer.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // MembreFoyer -> Foyer
  MembreFoyer.belongsTo(Foyer, {
    foreignKey: 'foyer_id',
    as: 'foyer'
  });

  // Utilisateur -> Ses appartenances aux foyers (pour garde partagée)
  Utilisateur.hasMany(MembreFoyer, {
    foreignKey: 'utilisateur_id',
    as: 'membresFoyer'
  });

  // Foyer -> Ses membres
  Foyer.hasMany(MembreFoyer, {
    foreignKey: 'foyer_id',
    as: 'membres'
  });

  // =======================
  // Relations Many-to-Many via MembreFoyer
  // =======================

  // Utilisateur <-> Foyer (many-to-many via MembreFoyer)
  Utilisateur.belongsToMany(Foyer, {
    through: MembreFoyer,
    foreignKey: 'utilisateur_id',
    otherKey: 'foyer_id',
    as: 'foyers'
  });

  Foyer.belongsToMany(Utilisateur, {
    through: MembreFoyer,
    foreignKey: 'foyer_id',
    otherKey: 'utilisateur_id',
    as: 'utilisateurs'
  });

  // =======================
  // Relation foyer principal (lien direct sur Utilisateur)
  // =======================

  // Utilisateur -> Foyer principal (pour affichage par défaut)
  Utilisateur.belongsTo(Foyer, {
    foreignKey: 'foyer_principal_id',
    as: 'foyerPrincipal'
  });

  Foyer.hasMany(Utilisateur, {
    foreignKey: 'foyer_principal_id',
    as: 'membresPrincipaux'
  });
}

module.exports = setupFoyersAssociations;
