/**
 * Model Commune
 * Referentiel des communes francaises
 * Importable depuis data.gouv.fr ou CSV
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Commune = sequelize.define('Commune', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_insee: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Code INSEE de la commune'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom de la commune'
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Code postal principal'
    },
    departement: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: 'Numero de departement'
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nom de la region'
    },
    population: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Population de la commune'
    }
  }, {
    tableName: 'communes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { name: 'idx_commune_nom', fields: ['nom'] },
      { name: 'idx_commune_cp', fields: ['code_postal'] },
      { name: 'idx_commune_dept', fields: ['departement'] }
    ]
  });

  // Methode de recherche par nom ou code postal
  Commune.search = async function(query, limit = 20) {
    const { Op } = require('sequelize');
    return this.findAll({
      where: {
        [Op.or]: [
          { nom: { [Op.like]: `%${query}%` } },
          { code_postal: { [Op.like]: `${query}%` } },
          { code_insee: { [Op.like]: `${query}%` } }
        ]
      },
      order: [
        [sequelize.literal(`CASE WHEN nom LIKE '${query}%' THEN 0 ELSE 1 END`), 'ASC'],
        ['population', 'DESC'],
        ['nom', 'ASC']
      ],
      limit
    });
  };

  // Methode pour importer depuis data.gouv.fr
  Commune.importFromDataGouv = async function(departements = null) {
    const fetch = require('node-fetch');
    let url = 'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,population,departement,region';

    if (departements && departements.length > 0) {
      // Importer uniquement certains departements
      const results = [];
      for (const dep of departements) {
        const depUrl = `https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom,code,codesPostaux,population,departement,region`;
        const response = await fetch(depUrl);
        if (response.ok) {
          const data = await response.json();
          results.push(...data);
        }
      }
      return this.bulkImport(results);
    } else {
      // Importer toutes les communes
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur API data.gouv.fr: ${response.status}`);
      }
      const data = await response.json();
      return this.bulkImport(data);
    }
  };

  // Import en masse
  Commune.bulkImport = async function(communes) {
    const { Op } = require('sequelize');
    let created = 0;
    let updated = 0;

    for (const c of communes) {
      const codePostal = c.codesPostaux && c.codesPostaux.length > 0 ? c.codesPostaux[0] : null;

      const [commune, wasCreated] = await this.findOrCreate({
        where: { code_insee: c.code },
        defaults: {
          nom: c.nom,
          code_postal: codePostal,
          departement: c.departement?.code || c.codeDepartement,
          region: c.region?.nom || null,
          population: c.population || null
        }
      });

      if (wasCreated) {
        created++;
      } else {
        // Mettre a jour si existant
        await commune.update({
          nom: c.nom,
          code_postal: codePostal,
          departement: c.departement?.code || c.codeDepartement,
          region: c.region?.nom || null,
          population: c.population || null
        });
        updated++;
      }
    }

    return { created, updated, total: communes.length };
  };

  return Commune;
};
