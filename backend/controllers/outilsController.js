/**
 * Outils d'administration - Reset de base de données
 * ATTENTION: Ces opérations sont irréversibles !
 */

const { sequelize } = require('../models');
const bcrypt = require('bcrypt');

/**
 * Helper pour exécuter une requête SQL en ignorant les erreurs de table inexistante
 */
async function safeQuery(sql, options = {}) {
  try {
    await sequelize.query(sql, options);
    return true;
  } catch (error) {
    // Ignorer les erreurs de table inexistante (code 1146)
    if (error.original && error.original.errno === 1146) {
      console.log(`[RESET] Table ignorée (n'existe pas): ${error.original.sqlMessage}`);
      return false;
    }
    throw error;
  }
}

/**
 * Reset sélectif de la base de données
 * POST /api/parametres/outils/reset
 */
exports.resetDatabase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      resetJeux,
      resetLivres,
      resetFilms,
      resetMusique,
      resetEmprunts,
      resetCotisations,
      resetUtilisateurs,
      resetTarifs,
      resetParametres,
      confirmationCode
    } = req.body;

    // Vérifier le code de confirmation (doit être "CONFIRMER-RESET")
    if (confirmationCode !== 'CONFIRMER-RESET') {
      return res.status(400).json({
        error: 'Code de confirmation invalide',
        message: 'Le code de confirmation doit être "CONFIRMER-RESET"'
      });
    }

    // Vérifier qu'au moins une option est sélectionnée
    if (!resetJeux && !resetLivres && !resetFilms && !resetMusique && !resetEmprunts && !resetCotisations && !resetUtilisateurs && !resetTarifs && !resetParametres) {
      return res.status(400).json({
        error: 'Aucune option sélectionnée',
        message: 'Veuillez sélectionner au moins une catégorie à réinitialiser'
      });
    }

    const results = {
      success: true,
      operations: []
    };

    // Récupérer l'ID de l'admin actuel pour le conserver
    const currentAdminId = req.user.id;

    // Reset des jeux (ludothèque)
    if (resetJeux) {
      // Supprimer les emprunts liés aux jeux
      await safeQuery('DELETE FROM emprunts WHERE jeu_id IS NOT NULL', { transaction });
      // Supprimer les réservations liées aux jeux
      await safeQuery('DELETE FROM reservations WHERE jeu_id IS NOT NULL', { transaction });
      // Supprimer les tables de liaison
      await safeQuery('DELETE FROM jeux_mecaniques', { transaction });
      await safeQuery('DELETE FROM jeux_themes', { transaction });
      await safeQuery('DELETE FROM jeux_categories', { transaction });
      await safeQuery('DELETE FROM jeux_publics', { transaction });
      // Supprimer les jeux
      await safeQuery('DELETE FROM jeux', { transaction });
      results.operations.push({ category: 'Jeux (Ludothèque)', deleted: true });
    }

    // Reset des livres (bibliothèque)
    if (resetLivres) {
      // Supprimer les emprunts liés aux livres
      await safeQuery('DELETE FROM emprunts WHERE livre_id IS NOT NULL', { transaction });
      // Supprimer les réservations liées aux livres
      await safeQuery('DELETE FROM reservations WHERE livre_id IS NOT NULL', { transaction });
      // Supprimer les tables de liaison
      await safeQuery('DELETE FROM livres_auteurs', { transaction });
      await safeQuery('DELETE FROM livres_genres', { transaction });
      // Supprimer les livres
      await safeQuery('DELETE FROM livres', { transaction });
      results.operations.push({ category: 'Livres (Bibliothèque)', deleted: true });
    }

    // Reset des films (filmothèque)
    if (resetFilms) {
      // Supprimer les emprunts liés aux films
      await safeQuery('DELETE FROM emprunts WHERE film_id IS NOT NULL', { transaction });
      // Supprimer les réservations liées aux films
      await safeQuery('DELETE FROM reservations WHERE film_id IS NOT NULL', { transaction });
      // Supprimer les tables de liaison
      await safeQuery('DELETE FROM films_acteurs', { transaction });
      await safeQuery('DELETE FROM films_realisateurs', { transaction });
      await safeQuery('DELETE FROM films_genres', { transaction });
      // Supprimer les films
      await safeQuery('DELETE FROM films', { transaction });
      results.operations.push({ category: 'Films (Filmothèque)', deleted: true });
    }

    // Reset de la musique (discothèque)
    if (resetMusique) {
      // Supprimer les emprunts liés aux disques
      await safeQuery('DELETE FROM emprunts WHERE disque_id IS NOT NULL', { transaction });
      // Supprimer les réservations liées aux disques
      await safeQuery('DELETE FROM reservations WHERE disque_id IS NOT NULL', { transaction });
      // Supprimer les tables de liaison
      await safeQuery('DELETE FROM disques_artistes', { transaction });
      await safeQuery('DELETE FROM disques_genres', { transaction });
      // Supprimer les disques
      await safeQuery('DELETE FROM disques', { transaction });
      results.operations.push({ category: 'Musique (Discothèque)', deleted: true });
    }

    // Reset des emprunts uniquement
    if (resetEmprunts) {
      // Remettre tous les articles en disponible
      await safeQuery("UPDATE jeux SET statut = 'disponible' WHERE statut = 'emprunte'", { transaction });
      await safeQuery("UPDATE livres SET statut = 'disponible' WHERE statut = 'emprunte'", { transaction });
      await safeQuery("UPDATE films SET statut = 'disponible' WHERE statut = 'emprunte'", { transaction });
      await safeQuery("UPDATE disques SET statut = 'disponible' WHERE statut = 'emprunte'", { transaction });
      // Supprimer les prolongations
      await safeQuery('DELETE FROM prolongations', { transaction });
      // Supprimer les réservations
      await safeQuery('DELETE FROM reservations', { transaction });
      // Supprimer tous les emprunts
      await safeQuery('DELETE FROM emprunts', { transaction });
      results.operations.push({ category: 'Emprunts', deleted: true });
    }

    // Reset des cotisations uniquement
    if (resetCotisations) {
      // Supprimer les prolongations (liées aux cotisations)
      await safeQuery('DELETE FROM prolongations', { transaction });
      // Supprimer toutes les cotisations
      await safeQuery('DELETE FROM cotisations', { transaction });
      // Remettre les dates d'adhésion à null pour tous les utilisateurs sauf admin
      await sequelize.query(
        'UPDATE utilisateurs SET date_fin_adhesion = NULL WHERE id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      results.operations.push({ category: 'Cotisations', deleted: true });
    }

    // Reset des tarifs et réductions
    if (resetTarifs) {
      // Supprimer les codes de réduction
      await safeQuery('DELETE FROM codes_reduction', { transaction });
      // Supprimer les tarifs de cotisation
      await safeQuery('DELETE FROM tarifs_cotisation', { transaction });
      // Supprimer les modes de paiement personnalisés (garder les modes par défaut)
      await safeQuery('DELETE FROM modes_paiement', { transaction });
      results.operations.push({ category: 'Tarifs & Réductions', deleted: true });
    }

    // Reset des utilisateurs (garder uniquement l'admin actuel)
    if (resetUtilisateurs) {
      // Supprimer les emprunts des autres utilisateurs
      await safeQuery(
        'DELETE FROM emprunts WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les cotisations des autres utilisateurs
      await safeQuery(
        'DELETE FROM cotisations WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les prolongations des autres utilisateurs
      await safeQuery(
        'DELETE FROM prolongations WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les réservations des autres utilisateurs
      await safeQuery(
        'DELETE FROM reservations WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les logs email/sms des autres utilisateurs
      await safeQuery(
        'DELETE FROM email_logs WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      await safeQuery(
        'DELETE FROM sms_logs WHERE utilisateur_id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les autres utilisateurs
      await safeQuery(
        'DELETE FROM utilisateurs WHERE id != :adminId',
        { replacements: { adminId: currentAdminId }, transaction }
      );
      // Supprimer les archives
      await safeQuery('DELETE FROM utilisateurs_archives', { transaction });
      results.operations.push({ category: 'Utilisateurs (sauf admin)', deleted: true });
    }

    // Reset des paramètres (communications, LLM)
    if (resetParametres) {
      // Reset configurations email (garder la structure mais vider les credentials)
      await safeQuery(
        `UPDATE configurations_email SET
          smtp_host = '',
          smtp_port = 587,
          smtp_user = '',
          smtp_password = '',
          actif = 0`,
        { transaction }
      );

      // Reset configurations SMS
      await safeQuery(
        `UPDATE configurations_sms SET
          api_key = '',
          api_secret = '',
          actif = 0`,
        { transaction }
      );

      // Reset configurations LLM
      await safeQuery(
        `UPDATE configurations_llm SET
          api_key = '',
          actif = 0`,
        { transaction }
      );

      // Supprimer les logs de communication
      await safeQuery('DELETE FROM email_logs', { transaction });
      await safeQuery('DELETE FROM sms_logs', { transaction });

      // Supprimer la queue d'enrichissement
      await safeQuery('DELETE FROM enrichissement_queue', { transaction });

      results.operations.push({ category: 'Paramètres (Communications, LLM)', deleted: true });
    }

    await transaction.commit();

    // Log de l'opération
    console.log(`[RESET DB] Admin ${req.user.email} a effectué un reset:`, results.operations);

    res.json({
      success: true,
      message: 'Réinitialisation effectuée avec succès',
      operations: results.operations
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors du reset de la base de données:', error);
    res.status(500).json({
      error: 'Erreur lors de la réinitialisation',
      message: error.message
    });
  }
};

/**
 * Helper pour compter les enregistrements d'une table (retourne 0 si table n'existe pas)
 */
async function safeCount(tableName, whereClause = '', replacements = {}) {
  try {
    const sql = whereClause
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) as count FROM ${tableName}`;
    const [[result]] = await sequelize.query(sql, { replacements });
    return result.count;
  } catch (error) {
    if (error.original && error.original.errno === 1146) {
      return 0;
    }
    throw error;
  }
}

/**
 * Obtenir les statistiques avant reset (pour afficher ce qui sera supprimé)
 * GET /api/parametres/outils/reset-stats
 */
exports.getResetStats = async (req, res) => {
  try {
    const stats = {};

    // Compter les jeux
    stats.jeux = await safeCount('jeux');

    // Compter les livres
    stats.livres = await safeCount('livres');

    // Compter les films
    stats.films = await safeCount('films');

    // Compter les disques
    stats.disques = await safeCount('disques');

    // Compter les utilisateurs (hors admin actuel)
    stats.utilisateurs = await safeCount('utilisateurs', 'id != :adminId', { adminId: req.user.id });

    // Compter les emprunts
    stats.emprunts = await safeCount('emprunts');

    // Compter les cotisations
    stats.cotisations = await safeCount('cotisations');

    // Compter les tarifs cotisation
    stats.tarifs = await safeCount('tarifs_cotisation');

    // Compter les codes de réduction
    stats.codesReduction = await safeCount('codes_reduction');

    // Compter les logs email
    stats.emailLogs = await safeCount('email_logs');

    // Compter les logs SMS
    stats.smsLogs = await safeCount('sms_logs');

    res.json(stats);

  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};
