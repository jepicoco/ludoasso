const { EcritureComptable, ParametresStructure } = require('../models');

/**
 * Controller pour les exports comptables
 */
class ExportComptableController {
  /**
   * Formate une date au format FEC (YYYYMMDD)
   * @param {Date|string} date - Date à formater
   * @returns {string} Date au format YYYYMMDD
   */
  static formatDateFEC(date) {
    if (!date) return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * Formate un montant au format FEC (virgule décimale, 2 décimales)
   * @param {number|string} montant - Montant à formater
   * @returns {string} Montant formaté avec virgule
   */
  static formatMontantFEC(montant) {
    if (!montant) return '0,00';

    const m = parseFloat(montant);
    if (isNaN(m)) return '0,00';

    // Formater avec 2 décimales et remplacer le point par une virgule
    return m.toFixed(2).replace('.', ',');
  }

  /**
   * Nettoie une chaîne pour le format FEC (enlève les pipes et caractères interdits)
   * @param {string} texte - Texte à nettoyer
   * @returns {string} Texte nettoyé
   */
  static nettoyerTexteFEC(texte) {
    if (!texte) return '';

    return String(texte)
      .replace(/\|/g, ' ')  // Remplacer les pipes par des espaces
      .replace(/[\r\n\t]/g, ' ')  // Remplacer les retours à la ligne et tabulations
      .replace(/\s+/g, ' ')  // Réduire les espaces multiples
      .trim();
  }

  /**
   * Exporte les écritures comptables au format FEC (Fichier des Écritures Comptables)
   * Format officiel requis par l'administration fiscale française
   *
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async exportFEC(req, res) {
    try {
      const { exercice } = req.query;

      // Validation de l'exercice
      if (!exercice) {
        return res.status(400).json({
          error: 'Le paramètre exercice est requis'
        });
      }

      const exerciceNum = parseInt(exercice);
      if (isNaN(exerciceNum) || exerciceNum < 2000 || exerciceNum > 2100) {
        return res.status(400).json({
          error: 'Exercice invalide. Doit être une année entre 2000 et 2100'
        });
      }

      // Récupérer les écritures de l'exercice
      const ecritures = await EcritureComptable.getEcrituresPourFEC(exerciceNum);

      if (ecritures.length === 0) {
        return res.status(404).json({
          error: `Aucune écriture comptable trouvée pour l'exercice ${exerciceNum}`
        });
      }

      // Récupérer les informations de la structure pour le SIREN
      const parametres = await ParametresStructure.findOne();
      const siren = parametres?.siren || '000000000';

      // Construire le contenu du fichier FEC
      // Format: 18 colonnes séparées par des pipes (|)
      const lignes = [];

      // En-tête du fichier FEC
      const entete = [
        'JournalCode',
        'JournalLib',
        'EcritureNum',
        'EcritureDate',
        'CompteNum',
        'CompteLib',
        'CompAuxNum',
        'CompAuxLib',
        'PieceRef',
        'PieceDate',
        'EcritureLib',
        'Debit',
        'Credit',
        'EcritureLet',
        'DateLet',
        'ValidDate',
        'Montantdevise',
        'Idevise'
      ].join('|');

      lignes.push(entete);

      // Contenu des écritures
      for (const ecriture of ecritures) {
        const ligne = [
          this.nettoyerTexteFEC(ecriture.journal_code),                           // 1. JournalCode
          this.nettoyerTexteFEC(ecriture.journal_libelle),                        // 2. JournalLib
          this.nettoyerTexteFEC(ecriture.numero_ecriture),                        // 3. EcritureNum
          this.formatDateFEC(ecriture.date_ecriture),                             // 4. EcritureDate
          this.nettoyerTexteFEC(ecriture.compte_numero),                          // 5. CompteNum
          this.nettoyerTexteFEC(ecriture.compte_libelle),                         // 6. CompteLib
          this.nettoyerTexteFEC(ecriture.compte_auxiliaire || ''),                // 7. CompAuxNum
          '',                                                                      // 8. CompAuxLib (vide pour le moment)
          this.nettoyerTexteFEC(ecriture.piece_reference),                        // 9. PieceRef
          this.formatDateFEC(ecriture.piece_date),                                // 10. PieceDate
          this.nettoyerTexteFEC(ecriture.libelle),                                // 11. EcritureLib
          this.formatMontantFEC(ecriture.debit),                                  // 12. Debit
          this.formatMontantFEC(ecriture.credit),                                 // 13. Credit
          this.nettoyerTexteFEC(ecriture.lettrage || ''),                         // 14. EcritureLet
          '',                                                                      // 15. DateLet (vide si pas de lettrage)
          this.formatDateFEC(ecriture.date_validation || ecriture.date_ecriture), // 16. ValidDate
          '',                                                                      // 17. Montantdevise (vide, pas de devises)
          ''                                                                       // 18. Idevise (vide, pas de devises)
        ].join('|');

        lignes.push(ligne);
      }

      const contenuFEC = lignes.join('\r\n');

      // Nom du fichier selon la norme FEC
      // Format: SIRENFECAAAAMMJJhhmmss.txt
      const maintenant = new Date();
      const timestamp = [
        maintenant.getFullYear(),
        String(maintenant.getMonth() + 1).padStart(2, '0'),
        String(maintenant.getDate()).padStart(2, '0'),
        String(maintenant.getHours()).padStart(2, '0'),
        String(maintenant.getMinutes()).padStart(2, '0'),
        String(maintenant.getSeconds()).padStart(2, '0')
      ].join('');

      const nomFichier = `${siren}FEC${timestamp}.txt`;

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', Buffer.byteLength(contenuFEC, 'utf8'));

      // Envoyer le fichier
      res.send(contenuFEC);
    } catch (error) {
      console.error('Erreur lors de l\'export FEC:', error);
      res.status(500).json({
        error: 'Erreur lors de la génération du fichier FEC',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtient les statistiques des écritures pour un exercice
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async getStatistiquesExercice(req, res) {
    try {
      const { exercice } = req.params;

      const exerciceNum = parseInt(exercice);
      if (isNaN(exerciceNum)) {
        return res.status(400).json({
          error: 'Exercice invalide'
        });
      }

      const ecritures = await EcritureComptable.findAll({
        where: { exercice: exerciceNum },
        attributes: [
          'journal_code',
          [EcritureComptable.sequelize.fn('COUNT', EcritureComptable.sequelize.col('id')), 'nb_ecritures'],
          [EcritureComptable.sequelize.fn('SUM', EcritureComptable.sequelize.col('debit')), 'total_debit'],
          [EcritureComptable.sequelize.fn('SUM', EcritureComptable.sequelize.col('credit')), 'total_credit']
        ],
        group: ['journal_code', 'journal_libelle'],
        raw: true
      });

      // Calculer les totaux
      const totalEcritures = await EcritureComptable.count({
        where: { exercice: exerciceNum }
      });

      const totaux = await EcritureComptable.findOne({
        where: { exercice: exerciceNum },
        attributes: [
          [EcritureComptable.sequelize.fn('SUM', EcritureComptable.sequelize.col('debit')), 'total_debit'],
          [EcritureComptable.sequelize.fn('SUM', EcritureComptable.sequelize.col('credit')), 'total_credit']
        ],
        raw: true
      });

      const totalDebit = parseFloat(totaux?.total_debit || 0);
      const totalCredit = parseFloat(totaux?.total_credit || 0);
      const equilibre = Math.abs(totalDebit - totalCredit) < 0.01;

      res.json({
        exercice: exerciceNum,
        statistiques: {
          nb_ecritures_total: totalEcritures,
          total_debit: totalDebit,
          total_credit: totalCredit,
          equilibre: equilibre,
          difference: Math.round((totalDebit - totalCredit) * 100) / 100
        },
        par_journal: ecritures.map(e => ({
          journal_code: e.journal_code,
          nb_ecritures: parseInt(e.nb_ecritures),
          total_debit: parseFloat(e.total_debit || 0),
          total_credit: parseFloat(e.total_credit || 0)
        }))
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Liste les exercices disponibles
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async listeExercices(req, res) {
    try {
      const exercices = await EcritureComptable.findAll({
        attributes: [
          'exercice',
          [EcritureComptable.sequelize.fn('COUNT', EcritureComptable.sequelize.col('id')), 'nb_ecritures'],
          [EcritureComptable.sequelize.fn('MIN', EcritureComptable.sequelize.col('date_ecriture')), 'date_premiere_ecriture'],
          [EcritureComptable.sequelize.fn('MAX', EcritureComptable.sequelize.col('date_ecriture')), 'date_derniere_ecriture']
        ],
        group: ['exercice'],
        order: [['exercice', 'DESC']],
        raw: true
      });

      res.json({
        exercices: exercices.map(e => ({
          exercice: e.exercice,
          nb_ecritures: parseInt(e.nb_ecritures),
          date_premiere_ecriture: e.date_premiere_ecriture,
          date_derniere_ecriture: e.date_derniere_ecriture
        }))
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des exercices:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des exercices',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ExportComptableController;
