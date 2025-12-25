/**
 * Model ImportSession
 *
 * Stocke les sessions d'import temporaires pour le workflow:
 * upload → preview → resolve conflicts → confirm
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImportSession = sequelize.define('ImportSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('iso', 'csv', 'api'),
      allowNull: false,
      comment: 'Type de fichier importé'
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Source: bdp, bnf, savoie_biblio'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    total_records: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total de notices dans le fichier'
    },
    parsed_records: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Données parsées en attente de confirmation'
    },
    conflicts: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Catégories/auteurs non résolus'
    },
    resolutions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Résolutions appliquées par l\'utilisateur'
    },
    statut: {
      type: DataTypes.ENUM('pending', 'resolved', 'importing', 'imported', 'cancelled', 'error'),
      defaultValue: 'pending'
    },
    imported_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de notices importées avec succès'
    },
    updated_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de notices mises à jour (existantes)'
    },
    error_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'erreurs'
    },
    import_log: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Log détaillé des erreurs'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration automatique de la session (24h par défaut)'
    }
  }, {
    tableName: 'import_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods

  /**
   * Vérifie si la session est expirée
   */
  ImportSession.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  /**
   * Vérifie si la session peut être confirmée
   */
  ImportSession.prototype.canConfirm = function() {
    return ['resolved'].includes(this.statut) && !this.isExpired();
  };

  /**
   * Vérifie si des conflits non résolus existent
   */
  ImportSession.prototype.hasUnresolvedConflicts = function() {
    if (!this.conflicts || !Array.isArray(this.conflicts)) return false;
    return this.conflicts.some(c => !c.resolved);
  };

  /**
   * Retourne les statistiques de la session
   */
  ImportSession.prototype.getStats = function() {
    return {
      total: this.total_records,
      imported: this.imported_count,
      updated: this.updated_count,
      errors: this.error_count,
      conflicts: this.conflicts?.length || 0,
      unresolvedConflicts: this.conflicts?.filter(c => !c.resolved).length || 0
    };
  };

  // Class methods

  /**
   * Nettoie les sessions expirées
   */
  ImportSession.cleanupExpired = async function() {
    const result = await this.destroy({
      where: {
        expires_at: { [sequelize.Sequelize.Op.lt]: new Date() },
        statut: { [sequelize.Sequelize.Op.notIn]: ['imported'] }
      }
    });
    return result;
  };

  /**
   * Trouve les sessions actives pour une structure
   */
  ImportSession.findActiveByStructure = async function(structureId) {
    return this.findAll({
      where: {
        structure_id: structureId,
        statut: { [sequelize.Sequelize.Op.in]: ['pending', 'resolved', 'importing'] },
        expires_at: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });
  };

  return ImportSession;
};
