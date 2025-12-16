/**
 * Job de rappels pour les reservations
 * A executer quotidiennement via cron
 *
 * Execution: npm run job-reservation-rappels
 * ou: node backend/jobs/reservationRappels.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Op } = require('sequelize');
const { Reservation, Utilisateur, Jeu, Livre, Film, Disque, sequelize } = require('../models');
const eventTriggerService = require('../services/eventTriggerService');

// Nombre de jours avant expiration pour envoyer le rappel
const JOURS_AVANT_RAPPEL = 3;

class ReservationRappelsJob {

  /**
   * Envoie les rappels pour les reservations 'prete' qui expirent bientot
   * Par defaut: J-3 avant expiration
   */
  async sendRappelsAvantExpiration() {
    console.log(`[ReservationRappels] Envoi des rappels J-${JOURS_AVANT_RAPPEL}...`);

    const maintenant = new Date();

    // Date dans X jours
    const dateRappel = new Date();
    dateRappel.setDate(dateRappel.getDate() + JOURS_AVANT_RAPPEL);
    dateRappel.setHours(0, 0, 0, 0);

    const dateRappelFin = new Date(dateRappel);
    dateRappelFin.setHours(23, 59, 59, 999);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    try {
      // Trouver les reservations 'prete' qui expirent dans X jours
      const reservations = await Reservation.findAll({
        where: {
          statut: 'prete',
          date_expiration: {
            [Op.between]: [dateRappel, dateRappelFin]
          }
        },
        include: [
          {
            model: Utilisateur,
            as: 'utilisateur',
            where: { statut: 'actif' }
          },
          { model: Jeu, as: 'jeu' },
          { model: Livre, as: 'livre' },
          { model: Film, as: 'film' },
          { model: Disque, as: 'disque' }
        ]
      });

      console.log(`[ReservationRappels] ${reservations.length} rappel(s) J-${JOURS_AVANT_RAPPEL} a envoyer`);

      for (const reservation of reservations) {
        try {
          // Determiner l'article
          const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;

          if (!article) {
            console.warn(`[ReservationRappels] Article non trouve pour reservation ${reservation.id}`);
            skipCount++;
            continue;
          }

          // Calculer les jours restants
          const joursRestants = Math.ceil(
            (new Date(reservation.date_expiration) - maintenant) / (1000 * 60 * 60 * 24)
          );

          // Envoyer le rappel via eventTriggerService
          await eventTriggerService.triggerReservationRappelExpiration(
            reservation,
            reservation.utilisateur,
            article,
            joursRestants
          );

          successCount++;
          console.log(`[ReservationRappels] Rappel envoye pour reservation ${reservation.id} (${article.titre})`);

        } catch (error) {
          console.error(`[ReservationRappels] Erreur envoi rappel pour reservation ${reservation.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[ReservationRappels] Rappels J-${JOURS_AVANT_RAPPEL}: ${successCount} envoyes, ${errorCount} erreurs, ${skipCount} ignores`);
      return { success: successCount, errors: errorCount, skipped: skipCount };

    } catch (error) {
      console.error('[ReservationRappels] Erreur rappels avant expiration:', error);
      throw error;
    }
  }

  /**
   * Envoie les rappels a J-1 (dernier jour)
   */
  async sendRappelsDernierJour() {
    console.log('[ReservationRappels] Envoi des rappels J-1 (dernier jour)...');

    // Date demain
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    demain.setHours(0, 0, 0, 0);

    const demainFin = new Date(demain);
    demainFin.setHours(23, 59, 59, 999);

    let successCount = 0;
    let errorCount = 0;

    try {
      const reservations = await Reservation.findAll({
        where: {
          statut: 'prete',
          date_expiration: {
            [Op.between]: [demain, demainFin]
          }
        },
        include: [
          {
            model: Utilisateur,
            as: 'utilisateur',
            where: { statut: 'actif' }
          },
          { model: Jeu, as: 'jeu' },
          { model: Livre, as: 'livre' },
          { model: Film, as: 'film' },
          { model: Disque, as: 'disque' }
        ]
      });

      console.log(`[ReservationRappels] ${reservations.length} rappel(s) J-1 a envoyer`);

      for (const reservation of reservations) {
        try {
          const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;

          if (!article) continue;

          await eventTriggerService.triggerReservationRappelExpiration(
            reservation,
            reservation.utilisateur,
            article,
            1 // 1 jour restant
          );

          successCount++;
        } catch (error) {
          console.error(`[ReservationRappels] Erreur envoi rappel J-1 pour reservation ${reservation.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[ReservationRappels] Rappels J-1: ${successCount} envoyes, ${errorCount} erreurs`);
      return { success: successCount, errors: errorCount };

    } catch (error) {
      console.error('[ReservationRappels] Erreur rappels J-1:', error);
      throw error;
    }
  }

  /**
   * Genere un rapport des reservations en attente depuis longtemps
   * (plus de 30 jours en attente)
   */
  async reportLongWaitingReservations() {
    console.log('[ReservationRappels] Rapport des reservations en attente longue...');

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 30);

    try {
      const reservations = await Reservation.findAll({
        where: {
          statut: 'en_attente',
          date_creation: {
            [Op.lt]: dateLimite
          }
        },
        include: [
          { model: Utilisateur, as: 'utilisateur' },
          { model: Jeu, as: 'jeu' },
          { model: Livre, as: 'livre' },
          { model: Film, as: 'film' },
          { model: Disque, as: 'disque' }
        ],
        order: [['date_creation', 'ASC']]
      });

      console.log(`[ReservationRappels] ${reservations.length} reservation(s) en attente depuis plus de 30 jours:`);

      for (const r of reservations) {
        const article = r.jeu || r.livre || r.film || r.disque;
        const joursAttente = Math.ceil((new Date() - new Date(r.date_creation)) / (1000 * 60 * 60 * 24));
        console.log(`  - ID ${r.id}: "${article?.titre || '?'}" pour ${r.utilisateur?.prenom || '?'} ${r.utilisateur?.nom || '?'} (${joursAttente} jours)`);
      }

      return { count: reservations.length };
    } catch (error) {
      console.error('[ReservationRappels] Erreur rapport:', error);
      throw error;
    }
  }

  /**
   * Execute toutes les taches du job
   */
  async runAll() {
    console.log('='.repeat(60));
    console.log('[ReservationRappels] Demarrage du job');
    console.log('Date:', new Date().toLocaleString('fr-FR'));
    console.log('='.repeat(60));

    const results = {
      rappelsJ3: null,
      rappelsJ1: null,
      report: null
    };

    try {
      results.rappelsJ3 = await this.sendRappelsAvantExpiration();
      results.rappelsJ1 = await this.sendRappelsDernierJour();
      results.report = await this.reportLongWaitingReservations();

      console.log('='.repeat(60));
      console.log('[ReservationRappels] Job termine avec succes');
      console.log('='.repeat(60));

      return results;
    } catch (error) {
      console.error('[ReservationRappels] Erreur lors de l\'execution du job:', error);
      throw error;
    }
  }
}

// Executer si appele directement
if (require.main === module) {
  const job = new ReservationRappelsJob();

  job.runAll()
    .then(results => {
      console.log('\nResultats:', JSON.stringify(results, null, 2));
      return sequelize.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Erreur:', error);
      sequelize.close().finally(() => process.exit(1));
    });
}

module.exports = ReservationRappelsJob;
