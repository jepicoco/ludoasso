/**
 * Modèle ProvenanceOperationComptable
 *
 * Mapping entre provenance et paramétrage comptable par structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProvenanceOperationComptable = sequelize.define('ProvenanceOperationComptable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provenance_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'provenances',
        key: 'id'
      },
      comment: 'Référence vers la provenance'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'structures',
        key: 'id'
      },
      comment: 'NULL = configuration globale/défaut'
    },
    // Paramétrage comptable
    journal_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Code du journal (ex: ACH, OD)'
    },
    compte_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte de charge ou produit'
    },
    compte_libelle: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Libellé du compte'
    },
    compte_contrepartie: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte de contrepartie (trésorerie, fournisseur)'
    },
    compte_contrepartie_libelle: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      comment: 'Section analytique pour ventilation'
    },
    // Options
    generer_ecritures: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Générer automatiquement les écritures comptables'
    },
    prefixe_piece: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'ENT',
      comment: 'Préfixe pour numéros de pièce'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'provenance_operation_comptable',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['provenance_id', 'structure_id'],
        name: 'idx_provenance_structure_unique'
      }
    ]
  });

  /**
   * Récupère le paramétrage comptable pour une provenance et structure
   * Fallback sur la configuration globale si pas de config structure
   */
  ProvenanceOperationComptable.getParametrage = async function(provenanceId, structureId = null) {
    // Chercher d'abord pour la structure spécifique
    if (structureId) {
      const configStructure = await this.findOne({
        where: { provenance_id: provenanceId, structure_id: structureId, actif: true },
        include: [
          { model: sequelize.models.Provenance, as: 'provenance' },
          { model: sequelize.models.SectionAnalytique, as: 'sectionAnalytique' }
        ]
      });
      if (configStructure) return configStructure;
    }

    // Fallback sur la configuration globale
    return await this.findOne({
      where: { provenance_id: provenanceId, structure_id: null, actif: true },
      include: [
        { model: sequelize.models.Provenance, as: 'provenance' },
        { model: sequelize.models.SectionAnalytique, as: 'sectionAnalytique' }
      ]
    });
  };

  /**
   * Récupère tous les paramétrages pour une structure (avec fallback global)
   */
  ProvenanceOperationComptable.getParStructure = async function(structureId = null) {
    const { Provenance, SectionAnalytique } = sequelize.models;

    // Récupérer toutes les provenances actives
    const provenances = await Provenance.findAll({
      where: { actif: true },
      order: [['ordre', 'ASC']]
    });

    const result = [];

    for (const prov of provenances) {
      // Chercher config structure spécifique
      let config = null;
      if (structureId) {
        config = await this.findOne({
          where: { provenance_id: prov.id, structure_id: structureId },
          include: [{ model: SectionAnalytique, as: 'sectionAnalytique' }]
        });
      }

      // Fallback sur config globale
      if (!config) {
        config = await this.findOne({
          where: { provenance_id: prov.id, structure_id: null },
          include: [{ model: SectionAnalytique, as: 'sectionAnalytique' }]
        });
      }

      result.push({
        provenance: prov,
        config: config || null,
        source: config ? (config.structure_id ? 'structure' : 'global') : 'aucun'
      });
    }

    return result;
  };

  /**
   * Crée ou met à jour le paramétrage pour une provenance/structure
   */
  ProvenanceOperationComptable.upsertParametrage = async function(provenanceId, structureId, data) {
    const [config, created] = await this.findOrCreate({
      where: { provenance_id: provenanceId, structure_id: structureId },
      defaults: {
        ...data,
        provenance_id: provenanceId,
        structure_id: structureId
      }
    });

    if (!created) {
      await config.update(data);
    }

    return config;
  };

  return ProvenanceOperationComptable;
};
