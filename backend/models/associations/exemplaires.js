/**
 * Associations Exemplaires
 * Exemplaires multiples par article (jeux, livres, films, disques)
 */

function setupExemplairesAssociations(models) {
  const {
    Jeu,
    JeuEan,
    ExemplaireJeu,
    EmplacementJeu,
    Livre,
    ExemplaireLivre,
    EmplacementLivre,
    Film,
    ExemplaireFilm,
    EmplacementFilm,
    Disque,
    ExemplaireDisque,
    EmplacementDisque,
    Emprunt,
    Provenance
  } = models;

  // ========================================
  // ExemplaireJeu
  // ========================================

  Jeu.hasMany(ExemplaireJeu, {
    foreignKey: 'jeu_id',
    as: 'exemplaires'
  });

  ExemplaireJeu.belongsTo(Jeu, {
    foreignKey: 'jeu_id',
    as: 'jeu'
  });

  ExemplaireJeu.belongsTo(Provenance, {
    foreignKey: 'provenance_id',
    as: 'provenance'
  });

  // Jeu <-> JeuEan (EAN multiples par jeu)
  Jeu.hasMany(JeuEan, {
    foreignKey: 'jeu_id',
    as: 'eans'
  });

  JeuEan.belongsTo(Jeu, {
    foreignKey: 'jeu_id',
    as: 'jeu'
  });

  EmplacementJeu.hasMany(ExemplaireJeu, {
    foreignKey: 'emplacement_id',
    as: 'exemplaires'
  });

  ExemplaireJeu.belongsTo(EmplacementJeu, {
    foreignKey: 'emplacement_id',
    as: 'emplacement'
  });

  ExemplaireJeu.hasMany(Emprunt, {
    foreignKey: 'exemplaire_jeu_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(ExemplaireJeu, {
    foreignKey: 'exemplaire_jeu_id',
    as: 'exemplaireJeu'
  });

  // ========================================
  // ExemplaireLivre
  // ========================================

  Livre.hasMany(ExemplaireLivre, {
    foreignKey: 'livre_id',
    as: 'exemplaires'
  });

  ExemplaireLivre.belongsTo(Livre, {
    foreignKey: 'livre_id',
    as: 'livre'
  });

  ExemplaireLivre.belongsTo(Provenance, {
    foreignKey: 'provenance_id',
    as: 'provenance'
  });

  EmplacementLivre.hasMany(ExemplaireLivre, {
    foreignKey: 'emplacement_id',
    as: 'exemplaires'
  });

  ExemplaireLivre.belongsTo(EmplacementLivre, {
    foreignKey: 'emplacement_id',
    as: 'emplacement'
  });

  ExemplaireLivre.hasMany(Emprunt, {
    foreignKey: 'exemplaire_livre_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(ExemplaireLivre, {
    foreignKey: 'exemplaire_livre_id',
    as: 'exemplaireLivre'
  });

  // ========================================
  // ExemplaireFilm
  // ========================================

  Film.hasMany(ExemplaireFilm, {
    foreignKey: 'film_id',
    as: 'exemplaires'
  });

  ExemplaireFilm.belongsTo(Film, {
    foreignKey: 'film_id',
    as: 'film'
  });

  ExemplaireFilm.belongsTo(Provenance, {
    foreignKey: 'provenance_id',
    as: 'provenance'
  });

  EmplacementFilm.hasMany(ExemplaireFilm, {
    foreignKey: 'emplacement_id',
    as: 'exemplaires'
  });

  ExemplaireFilm.belongsTo(EmplacementFilm, {
    foreignKey: 'emplacement_id',
    as: 'emplacement'
  });

  ExemplaireFilm.hasMany(Emprunt, {
    foreignKey: 'exemplaire_film_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(ExemplaireFilm, {
    foreignKey: 'exemplaire_film_id',
    as: 'exemplaireFilm'
  });

  // ========================================
  // ExemplaireDisque
  // ========================================

  Disque.hasMany(ExemplaireDisque, {
    foreignKey: 'disque_id',
    as: 'exemplaires'
  });

  ExemplaireDisque.belongsTo(Disque, {
    foreignKey: 'disque_id',
    as: 'disque'
  });

  ExemplaireDisque.belongsTo(Provenance, {
    foreignKey: 'provenance_id',
    as: 'provenance'
  });

  EmplacementDisque.hasMany(ExemplaireDisque, {
    foreignKey: 'emplacement_id',
    as: 'exemplaires'
  });

  ExemplaireDisque.belongsTo(EmplacementDisque, {
    foreignKey: 'emplacement_id',
    as: 'emplacement'
  });

  ExemplaireDisque.hasMany(Emprunt, {
    foreignKey: 'exemplaire_disque_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(ExemplaireDisque, {
    foreignKey: 'exemplaire_disque_id',
    as: 'exemplaireDisque'
  });
}

module.exports = setupExemplairesAssociations;
