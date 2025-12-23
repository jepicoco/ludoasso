/**
 * Associations Provenances
 * Provenance des articles et mapping comptable par structure
 */

function setupProvenancesAssociations(models) {
  const {
    Provenance,
    ProvenanceOperationComptable,
    Structure,
    SectionAnalytique,
    ExemplaireJeu,
    ExemplaireLivre,
    ExemplaireFilm,
    ExemplaireDisque
  } = models;

  // ========================================
  // Provenance -> ProvenanceOperationComptable
  // ========================================

  Provenance.hasMany(ProvenanceOperationComptable, {
    foreignKey: 'provenance_id',
    as: 'configurationsComptables'
  });

  ProvenanceOperationComptable.belongsTo(Provenance, {
    foreignKey: 'provenance_id',
    as: 'provenance'
  });

  // ========================================
  // ProvenanceOperationComptable -> Structure
  // ========================================

  if (Structure) {
    Structure.hasMany(ProvenanceOperationComptable, {
      foreignKey: 'structure_id',
      as: 'configurationsProvenance'
    });

    ProvenanceOperationComptable.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });
  }

  // ========================================
  // ProvenanceOperationComptable -> SectionAnalytique
  // ========================================

  if (SectionAnalytique) {
    SectionAnalytique.hasMany(ProvenanceOperationComptable, {
      foreignKey: 'section_analytique_id',
      as: 'configurationsProvenance'
    });

    ProvenanceOperationComptable.belongsTo(SectionAnalytique, {
      foreignKey: 'section_analytique_id',
      as: 'sectionAnalytique'
    });
  }

  // ========================================
  // Provenance -> Exemplaires (hasMany)
  // ========================================

  Provenance.hasMany(ExemplaireJeu, {
    foreignKey: 'provenance_id',
    as: 'exemplairesJeux'
  });

  Provenance.hasMany(ExemplaireLivre, {
    foreignKey: 'provenance_id',
    as: 'exemplairesLivres'
  });

  Provenance.hasMany(ExemplaireFilm, {
    foreignKey: 'provenance_id',
    as: 'exemplairesFilms'
  });

  Provenance.hasMany(ExemplaireDisque, {
    foreignKey: 'provenance_id',
    as: 'exemplairesDisques'
  });
}

module.exports = setupProvenancesAssociations;
