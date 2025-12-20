/**
 * Middleware pour filtrer les donnees personnelles (PII) des reponses API
 * Applique le controle d'acces configure selon le role de l'utilisateur
 */

const accesControleService = require('../services/accesControleService');

/**
 * Middleware de filtrage PII
 * Intercepte les reponses JSON et filtre les donnees utilisateur
 * selon la configuration d'acces du role
 */
const filterPIIResponse = () => {
  return async (req, res, next) => {
    // Stocker la methode json originale
    const originalJson = res.json.bind(res);

    // Remplacer res.json pour intercepter les reponses
    res.json = async function(data) {
      const role = req.user?.role || 'usager';

      // Admin voit tout - pas de filtrage
      if (role === 'administrateur') {
        return originalJson(data);
      }

      try {
        // Cloner les donnees pour ne pas modifier l'original
        let filteredData = JSON.parse(JSON.stringify(data));

        // Filtrer un utilisateur unique
        if (filteredData.utilisateur) {
          filteredData.utilisateur = await accesControleService.filterUtilisateurData(
            filteredData.utilisateur,
            role
          );
        }
        if (filteredData.adherent) {
          filteredData.adherent = await accesControleService.filterUtilisateurData(
            filteredData.adherent,
            role
          );
        }
        if (filteredData.data?.utilisateur) {
          filteredData.data.utilisateur = await accesControleService.filterUtilisateurData(
            filteredData.data.utilisateur,
            role
          );
        }

        // Filtrer un tableau d'utilisateurs
        if (filteredData.utilisateurs && Array.isArray(filteredData.utilisateurs)) {
          filteredData.utilisateurs = await accesControleService.filterUtilisateursArray(
            filteredData.utilisateurs,
            role
          );
        }
        if (filteredData.adherents && Array.isArray(filteredData.adherents)) {
          filteredData.adherents = await accesControleService.filterUtilisateursArray(
            filteredData.adherents,
            role
          );
        }
        if (filteredData.data?.utilisateurs && Array.isArray(filteredData.data.utilisateurs)) {
          filteredData.data.utilisateurs = await accesControleService.filterUtilisateursArray(
            filteredData.data.utilisateurs,
            role
          );
        }
        if (filteredData.rows && Array.isArray(filteredData.rows)) {
          // Pagination Sequelize
          filteredData.rows = await accesControleService.filterUtilisateursArray(
            filteredData.rows,
            role
          );
        }

        // Filtrer les emprunts si presents au niveau racine
        if (filteredData.emprunts) {
          const peutVoirEmprunts = await accesControleService.peutVoirHistoriqueEmprunts(role);
          if (!peutVoirEmprunts) {
            delete filteredData.emprunts;
          }
        }

        // Filtrer les cotisations si presentes au niveau racine
        if (filteredData.cotisations) {
          const peutVoirCotisations = await accesControleService.peutVoirCotisations(role);
          if (!peutVoirCotisations) {
            delete filteredData.cotisations;
          }
        }

        return originalJson(filteredData);
      } catch (err) {
        console.error('Erreur filtrage PII:', err);
        // En cas d'erreur, retourner les donnees sans filtrage
        // pour ne pas bloquer l'API
        return originalJson(data);
      }
    };

    next();
  };
};

/**
 * Middleware simplifie pour verifier l'acces aux emprunts
 * Retourne 403 si le role n'a pas acces
 */
const checkEmpruntsAccess = () => {
  return async (req, res, next) => {
    const role = req.user?.role || 'usager';

    if (role === 'administrateur') {
      return next();
    }

    const peutVoir = await accesControleService.peutVoirHistoriqueEmprunts(role);
    if (!peutVoir) {
      return res.status(403).json({
        success: false,
        error: 'Acces refuse',
        message: 'Vous n\'avez pas acces a l\'historique des emprunts'
      });
    }

    next();
  };
};

/**
 * Middleware simplifie pour verifier l'acces aux cotisations
 * Retourne 403 si le role n'a pas acces
 */
const checkCotisationsAccess = () => {
  return async (req, res, next) => {
    const role = req.user?.role || 'usager';

    if (role === 'administrateur') {
      return next();
    }

    const peutVoir = await accesControleService.peutVoirCotisations(role);
    if (!peutVoir) {
      return res.status(403).json({
        success: false,
        error: 'Acces refuse',
        message: 'Vous n\'avez pas acces aux cotisations'
      });
    }

    next();
  };
};

module.exports = {
  filterPIIResponse,
  checkEmpruntsAccess,
  checkCotisationsAccess
};
