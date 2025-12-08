const { CompteurPiece, EcritureComptable, Cotisation, Utilisateur } = require('../models');
const { sequelize } = require('../models');

/**
 * Service de gestion comptable
 * Gère la génération des écritures comptables et la numérotation des pièces
 */
class ComptabiliteService {
  /**
   * Obtient le libellé d'un journal comptable à partir de son code
   * @param {string} code - Code du journal
   * @returns {string} Libellé du journal
   */
  static getJournalLibelle(code) {
    const journaux = {
      'VT': 'Journal des ventes',
      'AC': 'Journal des achats',
      'BQ': 'Journal de banque',
      'CA': 'Journal de caisse',
      'OD': 'Journal des opérations diverses',
      'AN': 'Journal des à-nouveaux'
    };

    return journaux[code] || `Journal ${code}`;
  }

  /**
   * Obtient le libellé d'un compte comptable à partir de son numéro
   * @param {string} numero - Numéro du compte
   * @returns {string} Libellé du compte
   */
  static getCompteLibelle(numero) {
    // Plan comptable simplifié pour les opérations courantes
    const comptes = {
      // Comptes de trésorerie
      '512': 'Banque',
      '5121': 'Compte courant',
      '5122': 'Livret A',
      '530': 'Caisse',
      '5300': 'Caisse principale',

      // Comptes de tiers
      '411': 'Clients',
      '4110': 'Clients divers',
      '467': 'Autres comptes débiteurs ou créditeurs',

      // Comptes de produits
      '706': 'Prestations de services',
      '7061': 'Cotisations',
      '7062': 'Locations',
      '758': 'Produits divers de gestion courante',

      // Comptes de charges
      '606': 'Achats non stockés de matières et fournitures',
      '613': 'Locations',
      '625': 'Déplacements, missions et réceptions',
      '627': 'Services bancaires et assimilés',

      // TVA
      '4457': 'TVA collectée',
      '4456': 'TVA déductible'
    };

    // Si le compte exact existe, le retourner
    if (comptes[numero]) {
      return comptes[numero];
    }

    // Sinon, essayer de trouver le compte parent
    for (let i = numero.length - 1; i > 0; i--) {
      const parent = numero.substring(0, i);
      if (comptes[parent]) {
        return comptes[parent];
      }
    }

    return `Compte ${numero}`;
  }

  /**
   * Génère les écritures comptables pour une cotisation
   * Crée 2 écritures: débit (encaissement) et crédit (produit)
   *
   * @param {Object} cotisation - Instance de la cotisation
   * @param {Object} options - Options de génération
   * @param {string} options.journalCode - Code du journal (par défaut: 'VT')
   * @param {string} options.compteEncaissement - Compte d'encaissement (par défaut: selon mode paiement)
   * @param {string} options.compteProduit - Compte de produit (par défaut: '7061')
   * @returns {Promise<Array>} Tableau des écritures créées
   */
  static async genererEcrituresCotisation(cotisation, options = {}) {
    const {
      journalCode = 'VT',
      compteEncaissement = null,
      compteProduit = '7061'
    } = options;

    // Déterminer le compte d'encaissement selon le mode de paiement
    let compteEncaissementFinal = compteEncaissement;
    if (!compteEncaissementFinal) {
      const comptesEncaissement = {
        'especes': '5300',
        'cheque': '5121',
        'carte_bancaire': '5121',
        'virement': '5121',
        'prelevement': '5121',
        'autre': '5121'
      };
      compteEncaissementFinal = comptesEncaissement[cotisation.mode_paiement] || '5121';
    }

    // Déterminer l'exercice comptable (année de la date de paiement)
    const datePaiement = new Date(cotisation.date_paiement);
    const exercice = datePaiement.getFullYear();

    // Charger l'utilisateur pour le compte auxiliaire
    const utilisateur = await Utilisateur.findByPk(cotisation.utilisateur_id);
    const compteAuxiliaire = utilisateur ? `CLI${String(utilisateur.id).padStart(6, '0')}` : null;
    const utilisateurNom = utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Utilisateur inconnu';

    const ecritures = [];

    // Utiliser une transaction pour garantir l'atomicité
    const result = await sequelize.transaction(async (transaction) => {
      // Générer le numéro de pièce si absent
      let numeroPiece = cotisation.numero_piece_comptable;
      if (!numeroPiece) {
        numeroPiece = await CompteurPiece.genererNumero('COT', exercice, transaction);

        // Mettre à jour la cotisation avec le numéro de pièce
        cotisation.numero_piece_comptable = numeroPiece;
        cotisation.date_comptabilisation = datePaiement;
        await cotisation.save({ transaction });
      }

      // Générer un numéro d'écriture unique
      const numeroEcriture = `${journalCode}${exercice}-${numeroPiece}`;

      // Libellé de l'opération
      const libelle = `Cotisation ${utilisateurNom} - ${cotisation.periode_debut} à ${cotisation.periode_fin}`;

      // 1. Écriture de débit (Encaissement)
      const ecritureDebit = await EcritureComptable.create({
        journal_code: journalCode,
        journal_libelle: this.getJournalLibelle(journalCode),
        exercice: exercice,
        numero_ecriture: numeroEcriture,
        date_ecriture: datePaiement,
        compte_numero: compteEncaissementFinal,
        compte_libelle: this.getCompteLibelle(compteEncaissementFinal),
        compte_auxiliaire: compteAuxiliaire,
        piece_reference: numeroPiece,
        piece_date: datePaiement,
        libelle: libelle,
        debit: parseFloat(cotisation.montant_paye),
        credit: 0,
        date_validation: datePaiement,
        cotisation_id: cotisation.id
      }, { transaction });

      ecritures.push(ecritureDebit);

      // 2. Écriture de crédit (Produit - Cotisation)
      const ecritureCredit = await EcritureComptable.create({
        journal_code: journalCode,
        journal_libelle: this.getJournalLibelle(journalCode),
        exercice: exercice,
        numero_ecriture: numeroEcriture,
        date_ecriture: datePaiement,
        compte_numero: compteProduit,
        compte_libelle: this.getCompteLibelle(compteProduit),
        compte_auxiliaire: compteAuxiliaire,
        piece_reference: numeroPiece,
        piece_date: datePaiement,
        libelle: libelle,
        debit: 0,
        credit: parseFloat(cotisation.montant_paye),
        date_validation: datePaiement,
        cotisation_id: cotisation.id
      }, { transaction });

      ecritures.push(ecritureCredit);

      return ecritures;
    });

    return result;
  }

  /**
   * Vérifie si une cotisation a déjà des écritures comptables
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<boolean>}
   */
  static async cotisationAEcritures(cotisationId) {
    const count = await EcritureComptable.count({
      where: { cotisation_id: cotisationId }
    });
    return count > 0;
  }

  /**
   * Supprime les écritures comptables d'une cotisation
   * Utile en cas d'annulation de cotisation
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<number>} Nombre d'écritures supprimées
   */
  static async supprimerEcrituresCotisation(cotisationId) {
    return await sequelize.transaction(async (transaction) => {
      const ecritures = await EcritureComptable.findAll({
        where: { cotisation_id: cotisationId },
        transaction
      });

      // Vérifier qu'aucune écriture n'est lettrée
      const ecrituresLettrees = ecritures.filter(e => e.lettrage);
      if (ecrituresLettrees.length > 0) {
        throw new Error('Impossible de supprimer des écritures lettrées. Délettrez d\'abord.');
      }

      const count = await EcritureComptable.destroy({
        where: { cotisation_id: cotisationId },
        transaction
      });

      // Réinitialiser la cotisation
      const cotisation = await Cotisation.findByPk(cotisationId, { transaction });
      if (cotisation) {
        cotisation.numero_piece_comptable = null;
        cotisation.date_comptabilisation = null;
        await cotisation.save({ transaction });
      }

      return count;
    });
  }

  /**
   * Récupère les écritures comptables d'une cotisation
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<Array>}
   */
  static async getEcrituresCotisation(cotisationId) {
    return await EcritureComptable.findAll({
      where: { cotisation_id: cotisationId },
      order: [['id', 'ASC']]
    });
  }

  /**
   * Génère les écritures pour plusieurs cotisations
   * @param {Array<number>} cotisationIds - IDs des cotisations
   * @returns {Promise<Object>} Résultats de la génération
   */
  static async genererEcrituresMultiples(cotisationIds) {
    const resultats = {
      succes: [],
      erreurs: []
    };

    for (const id of cotisationIds) {
      try {
        const cotisation = await Cotisation.findByPk(id);
        if (!cotisation) {
          resultats.erreurs.push({
            cotisationId: id,
            erreur: 'Cotisation non trouvée'
          });
          continue;
        }

        // Vérifier si la cotisation a déjà des écritures
        const aEcritures = await this.cotisationAEcritures(id);
        if (aEcritures) {
          resultats.erreurs.push({
            cotisationId: id,
            erreur: 'Cette cotisation a déjà des écritures comptables'
          });
          continue;
        }

        const ecritures = await this.genererEcrituresCotisation(cotisation);
        resultats.succes.push({
          cotisationId: id,
          numeroPiece: cotisation.numero_piece_comptable,
          nbEcritures: ecritures.length
        });
      } catch (error) {
        resultats.erreurs.push({
          cotisationId: id,
          erreur: error.message
        });
      }
    }

    return resultats;
  }
}

module.exports = ComptabiliteService;
