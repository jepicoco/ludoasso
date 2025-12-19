/**
 * Structure Connecteurs Controller
 * Gestion des connecteurs email/SMS par structure, categorie et evenement
 */

const {
  Structure,
  StructureConnecteurCategorie,
  StructureConnecteurEvenement,
  ConfigurationEmail,
  ConfigurationSMS,
  EventTrigger,
  sequelize
} = require('../models');

const connecteurResolverService = require('../services/connecteurResolverService');

/**
 * Recupere la configuration complete des connecteurs pour une structure
 */
exports.getConfig = async (req, res) => {
  try {
    const { structureId } = req.params;

    const config = await connecteurResolverService.getStructureConnecteursConfig(structureId);

    if (!config) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Ajouter la liste des connecteurs disponibles
    const [emailConnectors, smsConnectors] = await Promise.all([
      connecteurResolverService.getAvailableEmailConnectors(),
      connecteurResolverService.getAvailableSMSConnectors()
    ]);

    res.json({
      ...config,
      availableConnectors: {
        email: emailConnectors,
        sms: smsConnectors
      }
    });
  } catch (error) {
    console.error('Erreur getConfig connecteurs:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour les connecteurs par defaut de la structure
 */
exports.updateDefaults = async (req, res) => {
  try {
    const { structureId } = req.params;
    const { configuration_email_id, configuration_sms_id } = req.body;

    const structure = await Structure.findByPk(structureId);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    await structure.update({
      configuration_email_id: configuration_email_id || null,
      configuration_sms_id: configuration_sms_id || null
    });

    res.json({
      message: 'Connecteurs par defaut mis a jour',
      configuration_email_id: structure.configuration_email_id,
      configuration_sms_id: structure.configuration_sms_id
    });
  } catch (error) {
    console.error('Erreur updateDefaults connecteurs:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour ou cree un override pour une categorie
 */
exports.upsertCategoryOverride = async (req, res) => {
  try {
    const { structureId, categorie } = req.params;
    const { configuration_email_id, configuration_sms_id } = req.body;

    // Verifier que la structure existe
    const structure = await Structure.findByPk(structureId);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier que la categorie est valide
    if (!StructureConnecteurCategorie.CATEGORIES.includes(categorie)) {
      return res.status(400).json({
        error: 'Categorie invalide',
        validCategories: StructureConnecteurCategorie.CATEGORIES
      });
    }

    // Si les deux sont null, supprimer l'override
    if (!configuration_email_id && !configuration_sms_id) {
      await StructureConnecteurCategorie.destroy({
        where: { structure_id: structureId, categorie }
      });
      return res.json({ message: 'Override categorie supprime', categorie });
    }

    // Upsert
    const [override, created] = await StructureConnecteurCategorie.upsert({
      structure_id: structureId,
      categorie,
      configuration_email_id: configuration_email_id || null,
      configuration_sms_id: configuration_sms_id || null
    });

    res.json({
      message: created ? 'Override categorie cree' : 'Override categorie mis a jour',
      override
    });
  } catch (error) {
    console.error('Erreur upsertCategoryOverride:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprime un override de categorie
 */
exports.deleteCategoryOverride = async (req, res) => {
  try {
    const { structureId, categorie } = req.params;

    const deleted = await StructureConnecteurCategorie.destroy({
      where: { structure_id: structureId, categorie }
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Override non trouve' });
    }

    res.json({ message: 'Override categorie supprime' });
  } catch (error) {
    console.error('Erreur deleteCategoryOverride:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour ou cree un override pour un evenement
 */
exports.upsertEventOverride = async (req, res) => {
  try {
    const { structureId, eventCode } = req.params;
    const { configuration_email_id, configuration_sms_id } = req.body;

    // Verifier que la structure existe
    const structure = await Structure.findByPk(structureId);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier que l'evenement existe
    const eventTrigger = await EventTrigger.findOne({ where: { code: eventCode } });
    if (!eventTrigger) {
      return res.status(400).json({ error: 'Code evenement invalide' });
    }

    // Si les deux sont null, supprimer l'override
    if (!configuration_email_id && !configuration_sms_id) {
      await StructureConnecteurEvenement.destroy({
        where: { structure_id: structureId, event_trigger_code: eventCode }
      });
      return res.json({ message: 'Override evenement supprime', eventCode });
    }

    // Upsert
    const [override, created] = await StructureConnecteurEvenement.upsert({
      structure_id: structureId,
      event_trigger_code: eventCode,
      configuration_email_id: configuration_email_id || null,
      configuration_sms_id: configuration_sms_id || null
    });

    res.json({
      message: created ? 'Override evenement cree' : 'Override evenement mis a jour',
      override
    });
  } catch (error) {
    console.error('Erreur upsertEventOverride:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprime un override d'evenement
 */
exports.deleteEventOverride = async (req, res) => {
  try {
    const { structureId, eventCode } = req.params;

    const deleted = await StructureConnecteurEvenement.destroy({
      where: { structure_id: structureId, event_trigger_code: eventCode }
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Override non trouve' });
    }

    res.json({ message: 'Override evenement supprime' });
  } catch (error) {
    console.error('Erreur deleteEventOverride:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour plusieurs overrides en une seule fois (batch)
 */
exports.batchUpdate = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { structureId } = req.params;
    const { defaults, categories, events } = req.body;

    // Verifier que la structure existe
    const structure = await Structure.findByPk(structureId);
    if (!structure) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // 1. Mettre a jour les defauts
    if (defaults) {
      await structure.update({
        configuration_email_id: defaults.configuration_email_id || null,
        configuration_sms_id: defaults.configuration_sms_id || null
      }, { transaction });
    }

    // 2. Mettre a jour les overrides par categorie
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.categorie) continue;

        if (!cat.configuration_email_id && !cat.configuration_sms_id) {
          // Supprimer si les deux sont null
          await StructureConnecteurCategorie.destroy({
            where: { structure_id: structureId, categorie: cat.categorie },
            transaction
          });
        } else {
          await StructureConnecteurCategorie.upsert({
            structure_id: structureId,
            categorie: cat.categorie,
            configuration_email_id: cat.configuration_email_id || null,
            configuration_sms_id: cat.configuration_sms_id || null
          }, { transaction });
        }
      }
    }

    // 3. Mettre a jour les overrides par evenement
    if (events && Array.isArray(events)) {
      for (const evt of events) {
        if (!evt.event_trigger_code) continue;

        if (!evt.configuration_email_id && !evt.configuration_sms_id) {
          // Supprimer si les deux sont null
          await StructureConnecteurEvenement.destroy({
            where: { structure_id: structureId, event_trigger_code: evt.event_trigger_code },
            transaction
          });
        } else {
          await StructureConnecteurEvenement.upsert({
            structure_id: structureId,
            event_trigger_code: evt.event_trigger_code,
            configuration_email_id: evt.configuration_email_id || null,
            configuration_sms_id: evt.configuration_sms_id || null
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    // Retourner la config mise a jour
    const updatedConfig = await connecteurResolverService.getStructureConnecteursConfig(structureId);

    res.json({
      message: 'Configuration mise a jour',
      config: updatedConfig
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur batchUpdate connecteurs:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Teste la resolution d'un connecteur pour un evenement donne
 * (utile pour debug/verification)
 */
exports.testResolve = async (req, res) => {
  try {
    const { structureId, eventCode } = req.params;

    const { email, sms } = await connecteurResolverService.resolveConnectors(
      parseInt(structureId),
      eventCode
    );

    res.json({
      structureId: parseInt(structureId),
      eventCode,
      resolved: {
        email: email ? { id: email.id, libelle: email.libelle, email: email.email_expediteur } : null,
        sms: sms ? { id: sms.id, libelle: sms.libelle, provider: sms.provider } : null
      }
    });
  } catch (error) {
    console.error('Erreur testResolve:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};
