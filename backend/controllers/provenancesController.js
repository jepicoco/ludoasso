/**
 * Controller Provenances
 *
 * Gestion des types de provenance d'articles et du mapping comptable
 */

const { Provenance, ProvenanceOperationComptable, SectionAnalytique, Structure, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * GET /api/provenances
 * Liste toutes les provenances
 */
exports.getAll = async (req, res) => {
  try {
    const { actif } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const provenances = await Provenance.findAll({
      where,
      order: [['ordre', 'ASC'], ['libelle', 'ASC']]
    });

    res.json(provenances);
  } catch (error) {
    logger.error('Erreur getAll provenances:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des provenances' });
  }
};

/**
 * GET /api/provenances/:id
 * Détail d'une provenance
 */
exports.getById = async (req, res) => {
  try {
    const provenance = await Provenance.findByPk(req.params.id, {
      include: [
        {
          model: ProvenanceOperationComptable,
          as: 'configurationsComptables',
          include: [
            { model: SectionAnalytique, as: 'sectionAnalytique' },
            { model: Structure, as: 'structure' }
          ]
        }
      ]
    });

    if (!provenance) {
      return res.status(404).json({ error: 'Provenance non trouvee' });
    }

    res.json(provenance);
  } catch (error) {
    logger.error('Erreur getById provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la provenance' });
  }
};

/**
 * POST /api/provenances
 * Créer une nouvelle provenance
 */
exports.create = async (req, res) => {
  try {
    const {
      code,
      libelle,
      description,
      icone,
      couleur,
      est_acquisition,
      retour_prevu,
      ordre
    } = req.body;

    // Vérifier que le code est unique
    const existing = await Provenance.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Une provenance avec ce code existe deja' });
    }

    const provenance = await Provenance.create({
      code,
      libelle,
      description,
      icone: icone || 'bi-box',
      couleur: couleur || '#6c757d',
      est_acquisition: est_acquisition !== false,
      retour_prevu: retour_prevu === true,
      ordre: ordre || 0,
      actif: true
    });

    logger.info(`Provenance creee: ${provenance.code}`);
    res.status(201).json(provenance);
  } catch (error) {
    logger.error('Erreur creation provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de la provenance' });
  }
};

/**
 * PUT /api/provenances/:id
 * Modifier une provenance
 */
exports.update = async (req, res) => {
  try {
    const provenance = await Provenance.findByPk(req.params.id);
    if (!provenance) {
      return res.status(404).json({ error: 'Provenance non trouvee' });
    }

    const {
      code,
      libelle,
      description,
      icone,
      couleur,
      est_acquisition,
      retour_prevu,
      ordre,
      actif
    } = req.body;

    // Vérifier unicité du code si modifié
    if (code && code !== provenance.code) {
      const existing = await Provenance.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: 'Une provenance avec ce code existe deja' });
      }
    }

    await provenance.update({
      code: code || provenance.code,
      libelle: libelle || provenance.libelle,
      description: description !== undefined ? description : provenance.description,
      icone: icone || provenance.icone,
      couleur: couleur || provenance.couleur,
      est_acquisition: est_acquisition !== undefined ? est_acquisition : provenance.est_acquisition,
      retour_prevu: retour_prevu !== undefined ? retour_prevu : provenance.retour_prevu,
      ordre: ordre !== undefined ? ordre : provenance.ordre,
      actif: actif !== undefined ? actif : provenance.actif
    });

    logger.info(`Provenance modifiee: ${provenance.code}`);
    res.json(provenance);
  } catch (error) {
    logger.error('Erreur update provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de la provenance' });
  }
};

/**
 * DELETE /api/provenances/:id
 * Supprimer une provenance
 */
exports.delete = async (req, res) => {
  try {
    const provenance = await Provenance.findByPk(req.params.id);
    if (!provenance) {
      return res.status(404).json({ error: 'Provenance non trouvee' });
    }

    // Vérifier si la provenance est utilisée
    const { ExemplaireJeu, ExemplaireLivre, ExemplaireFilm, ExemplaireDisque } = require('../models');

    const usedCount = await Promise.all([
      ExemplaireJeu.count({ where: { provenance_id: provenance.id } }),
      ExemplaireLivre.count({ where: { provenance_id: provenance.id } }),
      ExemplaireFilm.count({ where: { provenance_id: provenance.id } }),
      ExemplaireDisque.count({ where: { provenance_id: provenance.id } })
    ]);

    const totalUsed = usedCount.reduce((a, b) => a + b, 0);
    if (totalUsed > 0) {
      return res.status(400).json({
        error: `Cette provenance est utilisee par ${totalUsed} exemplaire(s). Desactivez-la plutot que de la supprimer.`
      });
    }

    await provenance.destroy();
    logger.info(`Provenance supprimee: ${provenance.code}`);
    res.json({ success: true, message: 'Provenance supprimee' });
  } catch (error) {
    logger.error('Erreur delete provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la provenance' });
  }
};

// ======================================================
// Configuration comptable par structure
// ======================================================

/**
 * GET /api/provenances/configuration/:structureId?
 * Récupère toutes les configurations comptables pour une structure
 */
exports.getConfiguration = async (req, res) => {
  try {
    const structureId = req.params.structureId ? parseInt(req.params.structureId) : null;

    const result = await ProvenanceOperationComptable.getParStructure(structureId);
    res.json(result);
  } catch (error) {
    logger.error('Erreur getConfiguration provenances:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la configuration' });
  }
};

/**
 * GET /api/provenances/:id/configuration/:structureId?
 * Récupère la configuration comptable d'une provenance pour une structure
 */
exports.getConfigurationByProvenance = async (req, res) => {
  try {
    const provenanceId = parseInt(req.params.id);
    const structureId = req.params.structureId ? parseInt(req.params.structureId) : null;

    const config = await ProvenanceOperationComptable.getParametrage(provenanceId, structureId);

    res.json(config || { provenance_id: provenanceId, structure_id: structureId, configured: false });
  } catch (error) {
    logger.error('Erreur getConfigurationByProvenance:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la configuration' });
  }
};

/**
 * PUT /api/provenances/:id/configuration/:structureId?
 * Met à jour la configuration comptable d'une provenance pour une structure
 */
exports.updateConfiguration = async (req, res) => {
  try {
    const provenanceId = parseInt(req.params.id);
    const structureId = req.params.structureId ? parseInt(req.params.structureId) : null;

    // Vérifier que la provenance existe
    const provenance = await Provenance.findByPk(provenanceId);
    if (!provenance) {
      return res.status(404).json({ error: 'Provenance non trouvee' });
    }

    const {
      journal_code,
      compte_comptable,
      compte_libelle,
      compte_contrepartie,
      compte_contrepartie_libelle,
      section_analytique_id,
      generer_ecritures,
      prefixe_piece,
      actif
    } = req.body;

    const config = await ProvenanceOperationComptable.upsertParametrage(provenanceId, structureId, {
      journal_code,
      compte_comptable,
      compte_libelle,
      compte_contrepartie,
      compte_contrepartie_libelle,
      section_analytique_id: section_analytique_id || null,
      generer_ecritures: generer_ecritures === true,
      prefixe_piece: prefixe_piece || 'ENT',
      actif: actif !== false
    });

    logger.info(`Configuration provenance mise a jour: ${provenance.code} pour structure ${structureId || 'globale'}`);

    // Recharger avec les associations
    const configWithRelations = await ProvenanceOperationComptable.findByPk(config.id, {
      include: [
        { model: Provenance, as: 'provenance' },
        { model: SectionAnalytique, as: 'sectionAnalytique' },
        { model: Structure, as: 'structure' }
      ]
    });

    res.json(configWithRelations);
  } catch (error) {
    logger.error('Erreur updateConfiguration provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la configuration' });
  }
};

/**
 * DELETE /api/provenances/:id/configuration/:structureId
 * Supprime la configuration comptable spécifique à une structure (revient au global)
 */
exports.deleteConfiguration = async (req, res) => {
  try {
    const provenanceId = parseInt(req.params.id);
    const structureId = parseInt(req.params.structureId);

    if (!structureId) {
      return res.status(400).json({ error: 'Impossible de supprimer la configuration globale' });
    }

    const deleted = await ProvenanceOperationComptable.destroy({
      where: { provenance_id: provenanceId, structure_id: structureId }
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Configuration non trouvee' });
    }

    logger.info(`Configuration provenance supprimee: provenance ${provenanceId} structure ${structureId}`);
    res.json({ success: true, message: 'Configuration supprimee (retour a la configuration globale)' });
  } catch (error) {
    logger.error('Erreur deleteConfiguration provenance:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la configuration' });
  }
};

/**
 * PUT /api/provenances/ordre
 * Met à jour l'ordre des provenances (drag & drop)
 */
exports.updateOrdre = async (req, res) => {
  try {
    const { ordre } = req.body; // Array de { id, ordre }

    if (!Array.isArray(ordre)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    await sequelize.transaction(async (t) => {
      for (const item of ordre) {
        await Provenance.update(
          { ordre: item.ordre },
          { where: { id: item.id }, transaction: t }
        );
      }
    });

    logger.info('Ordre des provenances mis a jour');
    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur updateOrdre provenances:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de l\'ordre' });
  }
};

/**
 * GET /api/provenances/stats
 * Statistiques d'utilisation des provenances
 */
exports.getStats = async (req, res) => {
  try {
    const { ExemplaireJeu, ExemplaireLivre, ExemplaireFilm, ExemplaireDisque } = require('../models');

    const provenances = await Provenance.findAll({
      where: { actif: true },
      order: [['ordre', 'ASC']]
    });

    const stats = await Promise.all(provenances.map(async (prov) => {
      const [jeux, livres, films, disques] = await Promise.all([
        ExemplaireJeu.count({ where: { provenance_id: prov.id } }),
        ExemplaireLivre.count({ where: { provenance_id: prov.id } }),
        ExemplaireFilm.count({ where: { provenance_id: prov.id } }),
        ExemplaireDisque.count({ where: { provenance_id: prov.id } })
      ]);

      return {
        provenance: prov,
        total: jeux + livres + films + disques,
        jeux,
        livres,
        films,
        disques
      };
    }));

    res.json(stats);
  } catch (error) {
    logger.error('Erreur getStats provenances:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des statistiques' });
  }
};
