/**
 * Service Communes
 * Gestion du referentiel des communes francaises
 * Import depuis data.gouv.fr API ou CSV
 */

const { Commune } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class CommuneService {
  /**
   * Recherche de communes (autocomplete)
   * @param {string} query - Terme de recherche (nom ou code postal)
   * @param {number} limit - Nombre max de resultats
   * @returns {Promise<Array>}
   */
  async search(query, limit = 20) {
    if (!query || query.length < 2) {
      return [];
    }

    const isPostalCode = /^\d+$/.test(query);

    const where = isPostalCode
      ? {
          [Op.or]: [
            { code_postal: { [Op.like]: `${query}%` } },
            { code_insee: { [Op.like]: `${query}%` } }
          ]
        }
      : {
          nom: { [Op.like]: `%${query}%` }
        };

    return Commune.findAll({
      where,
      order: [
        // Priorite aux correspondances exactes au debut
        [Commune.sequelize.literal(`CASE WHEN nom LIKE '${query}%' THEN 0 ELSE 1 END`), 'ASC'],
        ['population', 'DESC'],
        ['nom', 'ASC']
      ],
      limit
    });
  }

  /**
   * Obtenir une commune par ID
   * @param {number} id
   * @returns {Promise<Commune>}
   */
  async getById(id) {
    return Commune.findByPk(id);
  }

  /**
   * Obtenir une commune par code INSEE
   * @param {string} codeInsee
   * @returns {Promise<Commune>}
   */
  async getByCodeInsee(codeInsee) {
    return Commune.findOne({ where: { code_insee: codeInsee } });
  }

  /**
   * Import depuis l'API data.gouv.fr
   * @param {Object} options
   * @param {string[]} options.departements - Liste des departements (ex: ['74', '73'])
   * @returns {Promise<Object>} Stats d'import
   */
  async importFromDataGouv(options = {}) {
    const { departements } = options;
    const results = { created: 0, updated: 0, errors: 0, total: 0 };

    try {
      let communes = [];

      if (departements && departements.length > 0) {
        // Import par departement
        for (const dep of departements) {
          logger.info(`Import communes departement ${dep}...`);
          const url = `https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom,code,codesPostaux,population,departement,region`;

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            communes.push(...data);
            logger.info(`  ${data.length} communes trouvees pour ${dep}`);
          } else {
            logger.warn(`Erreur API pour departement ${dep}: ${response.status}`);
            results.errors++;
          }
        }
      } else {
        // Import de toutes les communes
        logger.info('Import de toutes les communes de France...');
        const url = 'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,population,departement,region';

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erreur API data.gouv.fr: ${response.status}`);
        }
        communes = await response.json();
        logger.info(`${communes.length} communes trouvees`);
      }

      results.total = communes.length;

      // Import en base
      for (const c of communes) {
        try {
          const codePostal = c.codesPostaux && c.codesPostaux.length > 0 ? c.codesPostaux[0] : null;

          const [commune, created] = await Commune.findOrCreate({
            where: { code_insee: c.code },
            defaults: {
              nom: c.nom,
              code_postal: codePostal,
              departement: c.departement?.code || c.codeDepartement || null,
              region: c.region?.nom || null,
              population: c.population || null
            }
          });

          if (created) {
            results.created++;
          } else {
            // Mise a jour
            await commune.update({
              nom: c.nom,
              code_postal: codePostal,
              departement: c.departement?.code || c.codeDepartement || commune.departement,
              region: c.region?.nom || commune.region,
              population: c.population || commune.population
            });
            results.updated++;
          }
        } catch (error) {
          logger.error(`Erreur import commune ${c.nom}:`, error.message);
          results.errors++;
        }
      }

      logger.info(`Import termine: ${results.created} creees, ${results.updated} mises a jour, ${results.errors} erreurs`);
      return results;

    } catch (error) {
      logger.error('Erreur import data.gouv.fr:', error);
      throw error;
    }
  }

  /**
   * Import depuis un fichier CSV
   * Format attendu: code_insee;nom;code_postal;departement;region;population
   * @param {string} csvContent - Contenu CSV
   * @param {string} separator - Separateur (default ';')
   * @returns {Promise<Object>} Stats d'import
   */
  async importFromCSV(csvContent, separator = ';') {
    const results = { created: 0, updated: 0, errors: 0, total: 0 };

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());

      // Ignorer l'en-tete
      const dataLines = lines.slice(1);
      results.total = dataLines.length;

      for (const line of dataLines) {
        try {
          const parts = line.split(separator).map(p => p.trim());

          if (parts.length < 2) continue;

          const [codeInsee, nom, codePostal, departement, region, populationStr] = parts;
          const population = populationStr ? parseInt(populationStr, 10) : null;

          const [commune, created] = await Commune.findOrCreate({
            where: { code_insee: codeInsee },
            defaults: {
              nom,
              code_postal: codePostal || null,
              departement: departement || null,
              region: region || null,
              population: isNaN(population) ? null : population
            }
          });

          if (created) {
            results.created++;
          } else {
            await commune.update({
              nom,
              code_postal: codePostal || commune.code_postal,
              departement: departement || commune.departement,
              region: region || commune.region,
              population: isNaN(population) ? commune.population : population
            });
            results.updated++;
          }
        } catch (error) {
          logger.error(`Erreur import ligne CSV:`, error.message);
          results.errors++;
        }
      }

      logger.info(`Import CSV termine: ${results.created} creees, ${results.updated} mises a jour, ${results.errors} erreurs`);
      return results;

    } catch (error) {
      logger.error('Erreur import CSV:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques du referentiel
   * @returns {Promise<Object>}
   */
  async getStats() {
    const total = await Commune.count();
    const parDepartement = await Commune.findAll({
      attributes: [
        'departement',
        [Commune.sequelize.fn('COUNT', Commune.sequelize.col('id')), 'count']
      ],
      group: ['departement'],
      order: [['departement', 'ASC']]
    });

    return {
      total,
      parDepartement: parDepartement.map(d => ({
        departement: d.departement,
        count: parseInt(d.get('count'), 10)
      }))
    };
  }

  /**
   * Obtenir les communes d'un departement
   * @param {string} departement
   * @returns {Promise<Array>}
   */
  async getByDepartement(departement) {
    return Commune.findAll({
      where: { departement },
      order: [['population', 'DESC'], ['nom', 'ASC']]
    });
  }

  /**
   * Supprimer toutes les communes (reset)
   * @returns {Promise<number>} Nombre supprime
   */
  async deleteAll() {
    const count = await Commune.destroy({ where: {}, truncate: true });
    logger.info(`${count} communes supprimees`);
    return count;
  }
}

module.exports = new CommuneService();
