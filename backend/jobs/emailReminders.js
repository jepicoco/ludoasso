const { Emprunt, Utilisateur, Jeu } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

/**
 * Job de rappels automatiques par email
 * À exécuter quotidiennement via cron
 */
class EmailRemindersJob {

  /**
   * Envoie les rappels J-3 (3 jours avant l'échéance)
   */
  async sendRappelsAvantEcheance() {
    try {
      console.log('[EmailReminders] Envoi des rappels J-3...');

      // Date dans 3 jours
      const dateDansTroisJours = new Date();
      dateDansTroisJours.setDate(dateDansTroisJours.getDate() + 3);
      dateDansTroisJours.setHours(0, 0, 0, 0);

      const dateDansTroisJoursFin = new Date(dateDansTroisJours);
      dateDansTroisJoursFin.setHours(23, 59, 59, 999);

      // Récupérer les emprunts qui se terminent dans 3 jours
      const emprunts = await Emprunt.findAll({
        where: {
          statut: 'en_cours',
          date_retour_prevue: {
            [Op.between]: [dateDansTroisJours, dateDansTroisJoursFin]
          }
        },
        include: [
          {
            model: Utilisateur,
            as: 'utilisateur',
            where: { statut: 'actif' }
          },
          {
            model: Jeu,
            as: 'jeu'
          }
        ]
      });

      console.log(`[EmailReminders] ${emprunts.length} rappel(s) J-3 à envoyer`);

      let successCount = 0;
      let errorCount = 0;

      for (const emprunt of emprunts) {
        try {
          await emailService.sendRappelAvantEcheance(
            emprunt,
            emprunt.utilisateur,
            emprunt.jeu
          );
          successCount++;
        } catch (error) {
          console.error(`[EmailReminders] Erreur envoi rappel J-3 pour emprunt ${emprunt.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[EmailReminders] Rappels J-3: ${successCount} envoyés, ${errorCount} erreurs`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('[EmailReminders] Erreur rappels J-3:', error);
      throw error;
    }
  }

  /**
   * Envoie les rappels à l'échéance (jour J)
   */
  async sendRappelsEcheance() {
    try {
      console.log('[EmailReminders] Envoi des rappels échéance (jour J)...');

      // Date d'aujourd'hui
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);

      const aujourdhuiFin = new Date(aujourdhui);
      aujourdhuiFin.setHours(23, 59, 59, 999);

      // Récupérer les emprunts qui arrivent à échéance aujourd'hui
      const emprunts = await Emprunt.findAll({
        where: {
          statut: 'en_cours',
          date_retour_prevue: {
            [Op.between]: [aujourdhui, aujourdhuiFin]
          }
        },
        include: [
          {
            model: Utilisateur,
            as: 'utilisateur',
            where: { statut: 'actif' }
          },
          {
            model: Jeu,
            as: 'jeu'
          }
        ]
      });

      console.log(`[EmailReminders] ${emprunts.length} rappel(s) échéance à envoyer`);

      let successCount = 0;
      let errorCount = 0;

      for (const emprunt of emprunts) {
        try {
          await emailService.sendRappelEcheance(
            emprunt,
            emprunt.utilisateur,
            emprunt.jeu
          );
          successCount++;
        } catch (error) {
          console.error(`[EmailReminders] Erreur envoi rappel échéance pour emprunt ${emprunt.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[EmailReminders] Rappels échéance: ${successCount} envoyés, ${errorCount} erreurs`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('[EmailReminders] Erreur rappels échéance:', error);
      throw error;
    }
  }

  /**
   * Envoie les relances pour retards (chaque semaine)
   */
  async sendRelancesRetard() {
    try {
      console.log('[EmailReminders] Envoi des relances pour retard...');

      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);

      // Récupérer tous les emprunts en retard
      const emprunts = await Emprunt.findAll({
        where: {
          statut: {
            [Op.in]: ['en_cours', 'en_retard']
          },
          date_retour_prevue: {
            [Op.lt]: aujourdhui
          }
        },
        include: [
          {
            model: Utilisateur,
            as: 'utilisateur',
            where: { statut: 'actif' }
          },
          {
            model: Jeu,
            as: 'jeu'
          }
        ]
      });

      console.log(`[EmailReminders] ${emprunts.length} emprunt(s) en retard trouvé(s)`);

      let successCount = 0;
      let errorCount = 0;

      for (const emprunt of emprunts) {
        const joursRetard = Math.ceil(
          (aujourdhui - new Date(emprunt.date_retour_prevue)) / (1000 * 60 * 60 * 24)
        );

        // Envoyer relance chaque semaine (7, 14, 21, 28 jours...)
        if (joursRetard > 0 && joursRetard % 7 === 0) {
          try {
            await emailService.sendRelanceRetard(
              emprunt,
              emprunt.utilisateur,
              emprunt.jeu
            );

            // Mettre à jour le statut en retard
            if (emprunt.statut !== 'en_retard') {
              await emprunt.update({ statut: 'en_retard' });
            }

            successCount++;
          } catch (error) {
            console.error(`[EmailReminders] Erreur envoi relance retard pour emprunt ${emprunt.id}:`, error);
            errorCount++;
          }
        }
      }

      console.log(`[EmailReminders] Relances retard: ${successCount} envoyées, ${errorCount} erreurs`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('[EmailReminders] Erreur relances retard:', error);
      throw error;
    }
  }

  /**
   * Envoie les rappels de renouvellement de cotisation (30 jours avant)
   */
  async sendRappelsCotisation() {
    try {
      console.log('[EmailReminders] Envoi des rappels cotisation...');

      // Date dans 30 jours
      const dateDans30Jours = new Date();
      dateDans30Jours.setDate(dateDans30Jours.getDate() + 30);
      dateDans30Jours.setHours(0, 0, 0, 0);

      const dateDans30JoursFin = new Date(dateDans30Jours);
      dateDans30JoursFin.setHours(23, 59, 59, 999);

      // Récupérer les utilisateurs dont la cotisation expire dans 30 jours
      const utilisateurs = await Utilisateur.findAll({
        where: {
          statut: 'actif',
          date_fin_adhesion: {
            [Op.between]: [dateDans30Jours, dateDans30JoursFin]
          }
        }
      });

      console.log(`[EmailReminders] ${utilisateurs.length} rappel(s) cotisation à envoyer`);

      let successCount = 0;
      let errorCount = 0;

      for (const utilisateur of utilisateurs) {
        try {
          await emailService.sendCotisationRappel(
            utilisateur,
            utilisateur.date_fin_adhesion
          );
          successCount++;
        } catch (error) {
          console.error(`[EmailReminders] Erreur envoi rappel cotisation pour utilisateur ${utilisateur.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[EmailReminders] Rappels cotisation: ${successCount} envoyés, ${errorCount} erreurs`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('[EmailReminders] Erreur rappels cotisation:', error);
      throw error;
    }
  }

  /**
   * Exécute tous les rappels
   */
  async runAll() {
    console.log('='.repeat(60));
    console.log('[EmailReminders] Démarrage du job de rappels emails');
    console.log('='.repeat(60));

    const results = {
      rappelsAvantEcheance: null,
      rappelsEcheance: null,
      relancesRetard: null,
      rappelsCotisation: null
    };

    try {
      // Initialiser le service email
      await emailService.initialize();

      // Exécuter tous les types de rappels
      results.rappelsAvantEcheance = await this.sendRappelsAvantEcheance();
      results.rappelsEcheance = await this.sendRappelsEcheance();
      results.relancesRetard = await this.sendRelancesRetard();
      results.rappelsCotisation = await this.sendRappelsCotisation();

      console.log('='.repeat(60));
      console.log('[EmailReminders] Job terminé avec succès');
      console.log('='.repeat(60));

      return results;
    } catch (error) {
      console.error('[EmailReminders] Erreur lors de l\'exécution du job:', error);
      throw error;
    }
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const job = new EmailRemindersJob();
  const { sequelize } = require('../models');

  job.runAll()
    .then(results => {
      console.log('\nRésultats:', JSON.stringify(results, null, 2));
      sequelize.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('Erreur:', error);
      sequelize.close();
      process.exit(1);
    });
}

module.exports = EmailRemindersJob;
