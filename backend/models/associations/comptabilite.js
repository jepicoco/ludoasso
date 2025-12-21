/**
 * Associations Comptabilite
 * TVA, Analytique, FEC, Parametrage avance, Regroupements
 */

function setupComptabiliteAssociations(models) {
  const {
    TarifCotisation,
    TauxTVA,
    SectionAnalytique,
    RepartitionAnalytique,
    EcritureComptable,
    Cotisation,
    CompteComptable,
    ParametrageComptableOperation,
    CompteEncaissementModePaiement,
    ModePaiement,
    RegroupementAnalytique,
    RegroupementAnalytiqueDetail
  } = models;

  // ========================================
  // TVA
  // ========================================

  TarifCotisation.belongsTo(TauxTVA, {
    foreignKey: 'taux_tva_id',
    as: 'tauxTVA'
  });

  TauxTVA.hasMany(TarifCotisation, {
    foreignKey: 'taux_tva_id',
    as: 'tarifsCotisation'
  });

  // ========================================
  // TarifCotisation <-> ParametrageComptableOperation
  // ========================================

  TarifCotisation.belongsTo(ParametrageComptableOperation, {
    foreignKey: 'operation_comptable_id',
    as: 'operationComptable'
  });

  ParametrageComptableOperation.hasMany(TarifCotisation, {
    foreignKey: 'operation_comptable_id',
    as: 'tarifsCotisation'
  });

  // ========================================
  // Sections Analytiques (hierarchie)
  // ========================================

  SectionAnalytique.belongsTo(SectionAnalytique, {
    foreignKey: 'parent_id',
    as: 'parent'
  });

  SectionAnalytique.hasMany(SectionAnalytique, {
    foreignKey: 'parent_id',
    as: 'enfants'
  });

  // ========================================
  // Repartition Analytique
  // ========================================

  RepartitionAnalytique.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'section'
  });

  SectionAnalytique.hasMany(RepartitionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'repartitions'
  });

  // ========================================
  // Ecritures Comptables (FEC)
  // ========================================

  EcritureComptable.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });

  Cotisation.hasMany(EcritureComptable, {
    foreignKey: 'cotisation_id',
    as: 'ecritures'
  });

  // ========================================
  // Comptes Comptables (hierarchie)
  // ========================================

  CompteComptable.belongsTo(CompteComptable, {
    foreignKey: 'parent_id',
    as: 'parent'
  });

  CompteComptable.hasMany(CompteComptable, {
    foreignKey: 'parent_id',
    as: 'enfants'
  });

  // ========================================
  // Parametrage Comptable Operation
  // ========================================

  ParametrageComptableOperation.belongsTo(TauxTVA, {
    foreignKey: 'taux_tva_id',
    as: 'tauxTVA'
  });

  TauxTVA.hasMany(ParametrageComptableOperation, {
    foreignKey: 'taux_tva_id',
    as: 'parametragesOperations'
  });

  ParametrageComptableOperation.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'sectionAnalytique'
  });

  SectionAnalytique.hasMany(ParametrageComptableOperation, {
    foreignKey: 'section_analytique_id',
    as: 'parametragesOperations'
  });

  // ========================================
  // Compte Encaissement Mode Paiement
  // ========================================

  CompteEncaissementModePaiement.belongsTo(ModePaiement, {
    foreignKey: 'mode_paiement_id',
    as: 'modePaiement'
  });

  ModePaiement.hasOne(CompteEncaissementModePaiement, {
    foreignKey: 'mode_paiement_id',
    as: 'compteEncaissement'
  });

  // ========================================
  // Regroupements Analytiques
  // ========================================

  RegroupementAnalytique.hasMany(RegroupementAnalytiqueDetail, {
    foreignKey: 'regroupement_id',
    as: 'details'
  });

  RegroupementAnalytiqueDetail.belongsTo(RegroupementAnalytique, {
    foreignKey: 'regroupement_id',
    as: 'regroupement'
  });

  RegroupementAnalytiqueDetail.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'section'
  });

  SectionAnalytique.hasMany(RegroupementAnalytiqueDetail, {
    foreignKey: 'section_analytique_id',
    as: 'regroupementsDetails'
  });

  ParametrageComptableOperation.belongsTo(RegroupementAnalytique, {
    foreignKey: 'regroupement_analytique_id',
    as: 'regroupementAnalytique'
  });

  RegroupementAnalytique.hasMany(ParametrageComptableOperation, {
    foreignKey: 'regroupement_analytique_id',
    as: 'parametragesOperations'
  });
}

module.exports = setupComptabiliteAssociations;
