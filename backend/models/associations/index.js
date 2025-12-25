/**
 * Orchestrateur des associations Sequelize
 * Charge et applique toutes les associations par domaine
 */

const setupCoreAssociations = require('./core');
const setupExemplairesAssociations = require('./exemplaires');
const setupJeuxAssociations = require('./jeux');
const setupLivresAssociations = require('./livres');
const setupFilmsAssociations = require('./films');
const setupDisquesAssociations = require('./disques');
const setupProlongationsReservationsAssociations = require('./prolongations-reservations');
const setupComptabiliteAssociations = require('./comptabilite');
const setupThematiquesAssociations = require('./thematiques');
const setupCodesBarresAssociations = require('./codes-barres');
const setupCaisseFacturesAssociations = require('./caisse-factures');
const setupPlansAssociations = require('./plans');
const setupFrequentationAssociations = require('./frequentation');
const setupCharteAssociations = require('./charte');
const setupStructuresAssociations = require('./structures');
const setupTarificationAssociations = require('./tarification');
const setupTagsUtilisateurAssociations = require('./tags-utilisateur');
const setupProvenancesAssociations = require('./provenances');
const setupDesherbageAssociations = require('./desherbage');
const setupImportISOAssociations = require('./import-iso');

/**
 * Configure toutes les associations entre modeles
 * @param {Object} models - Objet contenant tous les modeles initialises
 */
function setupAllAssociations(models) {
  // Core: Utilisateur, Emprunt, Cotisation, EmailLog, SmsLog, Site, Horaires
  setupCoreAssociations(models);

  // Exemplaires multiples par article
  setupExemplairesAssociations(models);

  // Collections normalisees
  setupJeuxAssociations(models);
  setupLivresAssociations(models);
  setupFilmsAssociations(models);
  setupDisquesAssociations(models);

  // Prolongations et Reservations
  setupProlongationsReservationsAssociations(models);

  // Comptabilite (TVA, Analytique, FEC, Parametrage)
  setupComptabiliteAssociations(models);

  // Thematiques IA
  setupThematiquesAssociations(models);

  // Codes-barres en lot
  setupCodesBarresAssociations(models);

  // Caisse et Factures
  setupCaisseFacturesAssociations(models);

  // Plans interactifs
  setupPlansAssociations(models);

  // Frequentation visiteurs
  setupFrequentationAssociations(models);

  // Charte usager
  setupCharteAssociations(models);

  // Multi-structures V0.9
  setupStructuresAssociations(models);

  // Tarification avancee (TypeTarif, QF, Reductions)
  setupTarificationAssociations(models);

  // Tags Utilisateur (many-to-many)
  setupTagsUtilisateurAssociations(models);

  // Provenances articles (achat, don, echange, etc.)
  setupProvenancesAssociations(models);

  // Desherbage (lots de sortie)
  setupDesherbageAssociations(models);

  // Import ISO (import livres BDP)
  setupImportISOAssociations(models);
}

module.exports = setupAllAssociations;
