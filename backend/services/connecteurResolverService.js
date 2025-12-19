/**
 * Connecteur Resolver Service
 *
 * Resout le connecteur email/SMS a utiliser selon la hierarchie:
 * 1. Override par evenement (le plus specifique)
 * 2. Override par categorie
 * 3. Connecteur par defaut de la structure
 * 4. Connecteur par defaut du systeme (le plus general)
 */

const {
  Structure,
  StructureConnecteurCategorie,
  StructureConnecteurEvenement,
  ConfigurationEmail,
  ConfigurationSMS,
  EventTrigger
} = require('../models');

/**
 * Resout le connecteur email a utiliser pour un evenement donne
 * @param {number} structureId - ID de la structure (null = utiliser defaut systeme)
 * @param {string} eventCode - Code de l'evenement (ex: EMPRUNT_RETARD)
 * @returns {Promise<ConfigurationEmail|null>} Configuration email resolue
 */
async function resolveEmailConnector(structureId, eventCode) {
  // 1. Chercher override par evenement
  if (structureId && eventCode) {
    const eventOverride = await StructureConnecteurEvenement.findOne({
      where: { structure_id: structureId, event_trigger_code: eventCode },
      include: [{ model: ConfigurationEmail, as: 'configurationEmail' }]
    });

    if (eventOverride && eventOverride.configurationEmail) {
      return eventOverride.configurationEmail;
    }
  }

  // 2. Chercher override par categorie
  if (structureId && eventCode) {
    const eventTrigger = await EventTrigger.findOne({ where: { code: eventCode } });
    if (eventTrigger && eventTrigger.categorie) {
      const categoryOverride = await StructureConnecteurCategorie.findOne({
        where: { structure_id: structureId, categorie: eventTrigger.categorie },
        include: [{ model: ConfigurationEmail, as: 'configurationEmail' }]
      });

      if (categoryOverride && categoryOverride.configurationEmail) {
        return categoryOverride.configurationEmail;
      }
    }
  }

  // 3. Chercher connecteur par defaut de la structure
  if (structureId) {
    const structure = await Structure.findByPk(structureId, {
      include: [{ model: ConfigurationEmail, as: 'configurationEmailDefaut' }]
    });

    if (structure && structure.configurationEmailDefaut) {
      return structure.configurationEmailDefaut;
    }
  }

  // 4. Retourner connecteur par defaut du systeme
  const defaultConfig = await ConfigurationEmail.findOne({
    where: { par_defaut: true, actif: true }
  });

  return defaultConfig;
}

/**
 * Resout le connecteur SMS a utiliser pour un evenement donne
 * @param {number} structureId - ID de la structure (null = utiliser defaut systeme)
 * @param {string} eventCode - Code de l'evenement (ex: EMPRUNT_RETARD)
 * @returns {Promise<ConfigurationSMS|null>} Configuration SMS resolue
 */
async function resolveSMSConnector(structureId, eventCode) {
  // 1. Chercher override par evenement
  if (structureId && eventCode) {
    const eventOverride = await StructureConnecteurEvenement.findOne({
      where: { structure_id: structureId, event_trigger_code: eventCode },
      include: [{ model: ConfigurationSMS, as: 'configurationSMS' }]
    });

    if (eventOverride && eventOverride.configurationSMS) {
      return eventOverride.configurationSMS;
    }
  }

  // 2. Chercher override par categorie
  if (structureId && eventCode) {
    const eventTrigger = await EventTrigger.findOne({ where: { code: eventCode } });
    if (eventTrigger && eventTrigger.categorie) {
      const categoryOverride = await StructureConnecteurCategorie.findOne({
        where: { structure_id: structureId, categorie: eventTrigger.categorie },
        include: [{ model: ConfigurationSMS, as: 'configurationSMS' }]
      });

      if (categoryOverride && categoryOverride.configurationSMS) {
        return categoryOverride.configurationSMS;
      }
    }
  }

  // 3. Chercher connecteur par defaut de la structure
  if (structureId) {
    const structure = await Structure.findByPk(structureId, {
      include: [{ model: ConfigurationSMS, as: 'configurationSMSDefaut' }]
    });

    if (structure && structure.configurationSMSDefaut) {
      return structure.configurationSMSDefaut;
    }
  }

  // 4. Retourner connecteur par defaut du systeme
  const defaultConfig = await ConfigurationSMS.findOne({
    where: { par_defaut: true, actif: true }
  });

  return defaultConfig;
}

/**
 * Resout les deux connecteurs (email et SMS) en une seule fois
 * @param {number} structureId - ID de la structure
 * @param {string} eventCode - Code de l'evenement
 * @returns {Promise<{email: ConfigurationEmail|null, sms: ConfigurationSMS|null}>}
 */
async function resolveConnectors(structureId, eventCode) {
  const [email, sms] = await Promise.all([
    resolveEmailConnector(structureId, eventCode),
    resolveSMSConnector(structureId, eventCode)
  ]);

  return { email, sms };
}

/**
 * Recupere la configuration complete des connecteurs pour une structure
 * (pour affichage dans l'interface admin)
 * @param {number} structureId - ID de la structure
 * @returns {Promise<Object>} Configuration complete avec tous les niveaux
 */
async function getStructureConnecteursConfig(structureId) {
  // Recuperer la structure avec ses connecteurs par defaut
  const structure = await Structure.findByPk(structureId, {
    include: [
      { model: ConfigurationEmail, as: 'configurationEmailDefaut' },
      { model: ConfigurationSMS, as: 'configurationSMSDefaut' },
      {
        model: StructureConnecteurCategorie,
        as: 'connecteursCategories',
        include: [
          { model: ConfigurationEmail, as: 'configurationEmail' },
          { model: ConfigurationSMS, as: 'configurationSMS' }
        ]
      },
      {
        model: StructureConnecteurEvenement,
        as: 'connecteursEvenements',
        include: [
          { model: ConfigurationEmail, as: 'configurationEmail' },
          { model: ConfigurationSMS, as: 'configurationSMS' }
        ]
      }
    ]
  });

  if (!structure) {
    return null;
  }

  // Recuperer les connecteurs par defaut du systeme
  const [systemEmailDefault, systemSMSDefault] = await Promise.all([
    ConfigurationEmail.findOne({ where: { par_defaut: true, actif: true } }),
    ConfigurationSMS.findOne({ where: { par_defaut: true, actif: true } })
  ]);

  // Recuperer tous les EventTriggers pour reference
  const eventTriggers = await EventTrigger.findAll({
    where: { email_actif: true },
    order: [['categorie', 'ASC'], ['code', 'ASC']]
  });

  // Organiser par categorie
  const categories = {};
  for (const trigger of eventTriggers) {
    if (!categories[trigger.categorie]) {
      categories[trigger.categorie] = {
        code: trigger.categorie,
        label: StructureConnecteurCategorie.CATEGORIE_LABELS[trigger.categorie] || trigger.categorie,
        override: structure.connecteursCategories.find(c => c.categorie === trigger.categorie) || null,
        events: []
      };
    }

    const eventOverride = structure.connecteursEvenements.find(e => e.event_trigger_code === trigger.code);
    categories[trigger.categorie].events.push({
      code: trigger.code,
      libelle: trigger.libelle,
      override: eventOverride || null
    });
  }

  return {
    structure: {
      id: structure.id,
      code: structure.code,
      nom: structure.nom
    },
    defaults: {
      system: {
        email: systemEmailDefault,
        sms: systemSMSDefault
      },
      structure: {
        email: structure.configurationEmailDefaut,
        sms: structure.configurationSMSDefaut
      }
    },
    categories: Object.values(categories)
  };
}

/**
 * Recupere tous les connecteurs email actifs
 * @returns {Promise<Array<ConfigurationEmail>>}
 */
async function getAvailableEmailConnectors() {
  return await ConfigurationEmail.findAll({
    where: { actif: true },
    order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
  });
}

/**
 * Recupere tous les connecteurs SMS actifs
 * @returns {Promise<Array<ConfigurationSMS>>}
 */
async function getAvailableSMSConnectors() {
  return await ConfigurationSMS.findAll({
    where: { actif: true },
    order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
  });
}

module.exports = {
  resolveEmailConnector,
  resolveSMSConnector,
  resolveConnectors,
  getStructureConnecteursConfig,
  getAvailableEmailConnectors,
  getAvailableSMSConnectors
};
