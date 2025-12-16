/**
 * Job de gestion des expirations de reservations
 * A executer quotidiennement via cron
 *
 * Execution: npm run job-reservation-expirations
 * ou: node backend/jobs/reservationExpirations.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Op } = require('sequelize');
const { Reservation, Utilisateur, Jeu, Livre, Film, Disque, ParametresFront, sequelize } = require('../models');
const eventTriggerService = require('../services/eventTriggerService');

class ReservationExpirationsJob {

  /**
   * Traite les reservations 'prete' qui ont expire
   * - Met a jour le statut en 'expiree'
   * - Remet l'article en disponible ou notifie le suivant
   * - Envoie notification d'annulation a l'usager
   */
  async processExpiredReservations() {
    console.log('[ReservationExpirations] Traitement des reservations expirees...');

    const maintenant = new Date();
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Trouver toutes les reservations 'prete' dont la date d'expiration est passee
      const reservationsExpirees = await Reservation.findAll({
        where: {
          statut: 'prete',
          date_expiration: {
            [Op.lt]: maintenant
          }
        },
        include: [
          { model: Utilisateur, as: 'utilisateur' },
          { model: Jeu, as: 'jeu' },
          { model: Livre, as: 'livre' },
          { model: Film, as: 'film' },
          { model: Disque, as: 'disque' }
        ]
      });

      console.log(`[ReservationExpirations] ${reservationsExpirees.length} reservation(s) expiree(s) trouvee(s)`);

      for (const reservation of reservationsExpirees) {
        const transaction = await sequelize.transaction();

        try {
          // Determiner le type d'article et recuperer l'article
          const articleType = reservation.jeu_id ? 'jeu' :
                              reservation.livre_id ? 'livre' :
                              reservation.film_id ? 'film' : 'disque';
          const article = reservation[articleType];
          const itemIdField = `${articleType}_id`;
          const itemId = reservation[itemIdField];

          // Marquer la reservation comme expiree
          await reservation.update({
            statut: 'expiree',
            commentaire: (reservation.commentaire || '') + `\n[Auto] Expiration le ${maintenant.toLocaleDateString('fr-FR')}`
          }, { transaction });

          // Chercher la prochaine reservation en attente pour cet article
          const prochaineReservation = await Reservation.findOne({
            where: {
              [itemIdField]: itemId,
              statut: 'en_attente'
            },
            order: [['position_queue', 'ASC']],
            include: [{ model: Utilisateur, as: 'utilisateur' }],
            transaction
          });

          // Recuperer l'article avec lock
          const ArticleModel = { jeu: Jeu, livre: Livre, film: Film, disque: Disque }[articleType];
          const lockedArticle = await ArticleModel.findByPk(itemId, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (prochaineReservation) {
            // Il y a un suivant dans la file - calculer la nouvelle date d'expiration
            const parametres = await ParametresFront.findOne({ where: { id: 1 }, transaction });
            const moduleKey = { jeu: 'ludotheque', livre: 'bibliotheque', film: 'filmotheque', disque: 'discotheque' }[articleType];
            const joursExpiration = parametres?.[`reservation_expiration_jours_${moduleKey}`] || 15;

            const nouvelleExpiration = new Date();
            nouvelleExpiration.setDate(nouvelleExpiration.getDate() + joursExpiration);

            await prochaineReservation.update({
              statut: 'prete',
              date_notification: maintenant,
              date_expiration: nouvelleExpiration,
              notifie: true
            }, { transaction });

            // Recalculer les positions dans la file
            await this.recalculerPositions(itemIdField, itemId, transaction);

            // Mettre l'article en statut 'reserve'
            if (lockedArticle) {
              await lockedArticle.update({ statut: 'reserve' }, { transaction });
            }

            // Notifier le nouveau reservataire
            if (prochaineReservation.utilisateur) {
              const articlePourNotif = await ArticleModel.findByPk(itemId, { transaction });
              await eventTriggerService.triggerReservationPrete(
                prochaineReservation,
                prochaineReservation.utilisateur,
                articlePourNotif
              );
            }

            console.log(`[ReservationExpirations] Reservation ${reservation.id} expiree, prochaine: ${prochaineReservation.id}`);
          } else {
            // Pas de suivant - remettre l'article en disponible
            if (lockedArticle) {
              await lockedArticle.update({ statut: 'disponible' }, { transaction });
            }
            console.log(`[ReservationExpirations] Reservation ${reservation.id} expiree, article remis en disponible`);
          }

          // Notifier l'usager de l'expiration
          if (reservation.utilisateur && article) {
            await eventTriggerService.triggerReservationAnnulee(
              reservation,
              reservation.utilisateur,
              article,
              'expiration'
            );
          }

          await transaction.commit();
          processedCount++;

        } catch (error) {
          await transaction.rollback();
          console.error(`[ReservationExpirations] Erreur traitement reservation ${reservation.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[ReservationExpirations] Termine: ${processedCount} traitees, ${errorCount} erreurs`);
      return { processed: processedCount, errors: errorCount };

    } catch (error) {
      console.error('[ReservationExpirations] Erreur globale:', error);
      throw error;
    }
  }

  /**
   * Recalcule les positions dans la file d'attente apres une modification
   */
  async recalculerPositions(itemIdField, itemId, transaction) {
    const reservationsEnAttente = await Reservation.findAll({
      where: {
        [itemIdField]: itemId,
        statut: 'en_attente'
      },
      order: [['date_creation', 'ASC']],
      transaction
    });

    let position = 1;
    for (const r of reservationsEnAttente) {
      if (r.position_queue !== position) {
        await r.update({ position_queue: position }, { transaction });
      }
      position++;
    }
  }

  /**
   * Nettoie les anciennes reservations (plus de 90 jours)
   * Ne supprime pas, mais archive en mettant un flag ou en deplacant
   */
  async cleanupOldReservations() {
    console.log('[ReservationExpirations] Nettoyage des anciennes reservations...');

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 90);

    try {
      // Compter les reservations anciennes terminees
      const count = await Reservation.count({
        where: {
          statut: {
            [Op.in]: ['expiree', 'annulee', 'empruntee']
          },
          updated_at: {
            [Op.lt]: dateLimite
          }
        }
      });

      console.log(`[ReservationExpirations] ${count} reservation(s) de plus de 90 jours (non supprimees)`);

      // Pour l'instant on ne supprime pas, on log juste
      // Plus tard on pourrait implementer un archivage

      return { count };
    } catch (error) {
      console.error('[ReservationExpirations] Erreur nettoyage:', error);
      throw error;
    }
  }

  /**
   * Execute toutes les taches du job
   */
  async runAll() {
    console.log('='.repeat(60));
    console.log('[ReservationExpirations] Demarrage du job');
    console.log('Date:', new Date().toLocaleString('fr-FR'));
    console.log('='.repeat(60));

    const results = {
      expirations: null,
      cleanup: null
    };

    try {
      results.expirations = await this.processExpiredReservations();
      results.cleanup = await this.cleanupOldReservations();

      console.log('='.repeat(60));
      console.log('[ReservationExpirations] Job termine avec succes');
      console.log('='.repeat(60));

      return results;
    } catch (error) {
      console.error('[ReservationExpirations] Erreur lors de l\'execution du job:', error);
      throw error;
    }
  }
}

// Executer si appele directement
if (require.main === module) {
  const job = new ReservationExpirationsJob();

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

module.exports = ReservationExpirationsJob;
