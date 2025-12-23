/**
 * Controller pour la gestion des Organisations
 *
 * Gestion CRUD de l'entite racine representant une organisation
 * (association, collectivite, entreprise)
 */

const { Organisation, Structure, ConfigurationEmail, ConfigurationSMS, OrganisationBarcodeGroup, OrganisationBarcodeConfig } = require('../models');
const logger = require('../utils/logger');

/**
 * Liste toutes les organisations
 */
exports.getAll = async (req, res) => {
  try {
    const { actif } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const organisations = await Organisation.findAll({
      where,
      include: [
        {
          model: Structure,
          as: 'structures',
          attributes: ['id', 'code', 'nom', 'actif'],
          required: false
        },
        {
          model: ConfigurationEmail,
          as: 'configurationEmail',
          attributes: ['id', 'libelle', 'actif'],
          required: false
        },
        {
          model: ConfigurationSMS,
          as: 'configurationSms',
          attributes: ['id', 'libelle', 'actif'],
          required: false
        }
      ],
      order: [['nom', 'ASC']]
    });

    res.json(organisations);
  } catch (error) {
    logger.error('Erreur liste organisations:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des organisations' });
  }
};

/**
 * Recupere une organisation par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await Organisation.findByPk(id, {
      include: [
        {
          model: Structure,
          as: 'structures',
          attributes: ['id', 'code', 'nom', 'actif', 'couleur', 'icone'],
          required: false
        },
        {
          model: ConfigurationEmail,
          as: 'configurationEmail',
          required: false
        },
        {
          model: ConfigurationSMS,
          as: 'configurationSms',
          required: false
        }
      ]
    });

    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvee' });
    }

    res.json(organisation);
  } catch (error) {
    logger.error('Erreur get organisation:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de l\'organisation' });
  }
};

/**
 * Cree une nouvelle organisation
 */
exports.create = async (req, res) => {
  try {
    const {
      nom,
      nom_court,
      type_organisation,
      siret,
      rna,
      code_ape,
      numero_tva,
      numero_agrement,
      prefecture_declaration,
      date_publication_jo,
      date_creation,
      code_insee,
      adresse,
      code_postal,
      ville,
      pays,
      email,
      telephone,
      site_web,
      representant_nom,
      representant_fonction,
      representant_email,
      regime_tva,
      debut_exercice_jour,
      debut_exercice_mois,
      code_comptable,
      logo_url,
      couleur_primaire,
      configuration_email_id,
      configuration_sms_id,
      gestion_codes_barres,
      actif
    } = req.body;

    // Validation basique
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom est obligatoire' });
    }

    // Verifier unicite SIRET si fourni
    if (siret) {
      const existing = await Organisation.findOne({ where: { siret } });
      if (existing) {
        return res.status(400).json({ error: 'Ce SIRET est deja utilise' });
      }
    }

    const organisation = await Organisation.create({
      nom: nom.trim(),
      nom_court: nom_court?.trim() || null,
      type_organisation: type_organisation || 'association',
      siret: siret?.replace(/\s/g, '') || null,
      rna: rna?.trim() || null,
      code_ape: code_ape?.trim() || null,
      numero_tva: numero_tva?.trim() || null,
      numero_agrement: numero_agrement?.trim() || null,
      prefecture_declaration: prefecture_declaration?.trim() || null,
      date_publication_jo: date_publication_jo || null,
      date_creation: date_creation || null,
      code_insee: code_insee?.trim() || null,
      adresse: adresse?.trim() || null,
      code_postal: code_postal?.trim() || null,
      ville: ville?.trim() || null,
      pays: pays || 'FR',
      email: email?.trim() || null,
      telephone: telephone?.trim() || null,
      site_web: site_web?.trim() || null,
      representant_nom: representant_nom?.trim() || null,
      representant_fonction: representant_fonction?.trim() || null,
      representant_email: representant_email?.trim() || null,
      regime_tva: regime_tva || 'non_assujetti',
      debut_exercice_jour: debut_exercice_jour || 1,
      debut_exercice_mois: debut_exercice_mois || 1,
      code_comptable: code_comptable?.trim() || null,
      logo_url: logo_url?.trim() || null,
      couleur_primaire: couleur_primaire || '#007bff',
      configuration_email_id: configuration_email_id || null,
      configuration_sms_id: configuration_sms_id || null,
      gestion_codes_barres: gestion_codes_barres || {
        utilisateur: 'organisation',
        jeu: 'organisation',
        livre: 'organisation',
        film: 'organisation',
        disque: 'organisation'
      },
      actif: actif !== false
    });

    logger.info(`Organisation creee: ${organisation.nom} (ID: ${organisation.id})`);

    res.status(201).json(organisation);
  } catch (error) {
    logger.error('Erreur creation organisation:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Donnees invalides',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Erreur lors de la creation de l\'organisation' });
  }
};

/**
 * Met a jour une organisation
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await Organisation.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvee' });
    }

    const {
      nom,
      nom_court,
      type_organisation,
      siret,
      rna,
      code_ape,
      numero_tva,
      numero_agrement,
      prefecture_declaration,
      date_publication_jo,
      date_creation,
      code_insee,
      adresse,
      code_postal,
      ville,
      pays,
      email,
      telephone,
      site_web,
      representant_nom,
      representant_fonction,
      representant_email,
      regime_tva,
      debut_exercice_jour,
      debut_exercice_mois,
      code_comptable,
      logo_url,
      couleur_primaire,
      configuration_email_id,
      configuration_sms_id,
      gestion_codes_barres,
      actif
    } = req.body;

    // Verifier unicite SIRET si modifie
    if (siret && siret !== organisation.siret) {
      const existing = await Organisation.findOne({
        where: { siret, id: { [require('sequelize').Op.ne]: id } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Ce SIRET est deja utilise' });
      }
    }

    // Mise a jour
    await organisation.update({
      nom: nom?.trim() || organisation.nom,
      nom_court: nom_court !== undefined ? (nom_court?.trim() || null) : organisation.nom_court,
      type_organisation: type_organisation || organisation.type_organisation,
      siret: siret !== undefined ? (siret?.replace(/\s/g, '') || null) : organisation.siret,
      rna: rna !== undefined ? (rna?.trim() || null) : organisation.rna,
      code_ape: code_ape !== undefined ? (code_ape?.trim() || null) : organisation.code_ape,
      numero_tva: numero_tva !== undefined ? (numero_tva?.trim() || null) : organisation.numero_tva,
      numero_agrement: numero_agrement !== undefined ? (numero_agrement?.trim() || null) : organisation.numero_agrement,
      prefecture_declaration: prefecture_declaration !== undefined ? (prefecture_declaration?.trim() || null) : organisation.prefecture_declaration,
      date_publication_jo: date_publication_jo !== undefined ? (date_publication_jo || null) : organisation.date_publication_jo,
      date_creation: date_creation !== undefined ? (date_creation || null) : organisation.date_creation,
      code_insee: code_insee !== undefined ? (code_insee?.trim() || null) : organisation.code_insee,
      adresse: adresse !== undefined ? (adresse?.trim() || null) : organisation.adresse,
      code_postal: code_postal !== undefined ? (code_postal?.trim() || null) : organisation.code_postal,
      ville: ville !== undefined ? (ville?.trim() || null) : organisation.ville,
      pays: pays || organisation.pays,
      email: email !== undefined ? (email?.trim() || null) : organisation.email,
      telephone: telephone !== undefined ? (telephone?.trim() || null) : organisation.telephone,
      site_web: site_web !== undefined ? (site_web?.trim() || null) : organisation.site_web,
      representant_nom: representant_nom !== undefined ? (representant_nom?.trim() || null) : organisation.representant_nom,
      representant_fonction: representant_fonction !== undefined ? (representant_fonction?.trim() || null) : organisation.representant_fonction,
      representant_email: representant_email !== undefined ? (representant_email?.trim() || null) : organisation.representant_email,
      regime_tva: regime_tva || organisation.regime_tva,
      debut_exercice_jour: debut_exercice_jour !== undefined ? debut_exercice_jour : organisation.debut_exercice_jour,
      debut_exercice_mois: debut_exercice_mois !== undefined ? debut_exercice_mois : organisation.debut_exercice_mois,
      code_comptable: code_comptable !== undefined ? (code_comptable?.trim() || null) : organisation.code_comptable,
      logo_url: logo_url !== undefined ? (logo_url?.trim() || null) : organisation.logo_url,
      couleur_primaire: couleur_primaire || organisation.couleur_primaire,
      configuration_email_id: configuration_email_id !== undefined ? (configuration_email_id || null) : organisation.configuration_email_id,
      configuration_sms_id: configuration_sms_id !== undefined ? (configuration_sms_id || null) : organisation.configuration_sms_id,
      gestion_codes_barres: gestion_codes_barres || organisation.gestion_codes_barres,
      actif: actif !== undefined ? actif : organisation.actif
    });

    logger.info(`Organisation mise a jour: ${organisation.nom} (ID: ${organisation.id})`);

    // Recharger avec associations
    const updated = await Organisation.findByPk(id, {
      include: [
        { model: Structure, as: 'structures', attributes: ['id', 'code', 'nom', 'actif'] },
        { model: ConfigurationEmail, as: 'configurationEmail', attributes: ['id', 'libelle'] },
        { model: ConfigurationSMS, as: 'configurationSms', attributes: ['id', 'libelle'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    logger.error('Erreur update organisation:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Donnees invalides',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Erreur lors de la mise a jour de l\'organisation' });
  }
};

/**
 * Supprime (desactive) une organisation
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await Organisation.findByPk(id, {
      include: [{ model: Structure, as: 'structures' }]
    });

    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvee' });
    }

    // Verifier qu'il n'y a pas de structures actives
    const structuresActives = organisation.structures?.filter(s => s.actif) || [];
    if (structuresActives.length > 0) {
      return res.status(400).json({
        error: 'Impossible de desactiver une organisation avec des structures actives',
        structures: structuresActives.map(s => s.nom)
      });
    }

    // Desactiver plutot que supprimer
    await organisation.update({ actif: false });

    logger.info(`Organisation desactivee: ${organisation.nom} (ID: ${organisation.id})`);

    res.json({ message: 'Organisation desactivee', id: organisation.id });
  } catch (error) {
    logger.error('Erreur suppression organisation:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisation' });
  }
};

/**
 * Liste les connecteurs disponibles (email et SMS)
 */
exports.getConnecteurs = async (req, res) => {
  try {
    const [emailConfigs, smsConfigs] = await Promise.all([
      ConfigurationEmail.findAll({
        where: { actif: true },
        attributes: ['id', 'libelle', 'email_expediteur', 'par_defaut'],
        order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
      }),
      ConfigurationSMS.findAll({
        where: { actif: true },
        attributes: ['id', 'libelle', 'provider', 'par_defaut'],
        order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
      })
    ]);

    res.json({
      email: emailConfigs,
      sms: smsConfigs
    });
  } catch (error) {
    logger.error('Erreur get connecteurs:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des connecteurs' });
  }
};

// ========================================
// Barcode Groups (globaux - partages entre toutes les organisations)
// ========================================

/**
 * Liste tous les groupes de codes-barres (globaux)
 * Route: GET /api/organisations/barcode-groups
 * Route legacy: GET /api/organisations/:id/barcode-groups (retourne aussi tous les groupes)
 */
exports.getBarcodeGroups = async (req, res) => {
  try {
    const groups = await OrganisationBarcodeGroup.findAll({
      order: [['code', 'ASC']]
    });

    res.json(groups);
  } catch (error) {
    logger.error('Erreur get barcode groups:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des groupes' });
  }
};

/**
 * Cree un nouveau groupe de codes-barres (global)
 * Route: POST /api/organisations/barcode-groups
 * Route legacy: POST /api/organisations/:id/barcode-groups
 */
exports.createBarcodeGroup = async (req, res) => {
  try {
    const { code } = req.body;

    // Validation
    if (!code || code.trim() === '') {
      return res.status(400).json({ error: 'Le code est obligatoire' });
    }

    const codeClean = code.trim().toUpperCase();

    // Verifier unicite globale
    const existing = await OrganisationBarcodeGroup.findOne({
      where: { code: codeClean }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ce code de groupe existe deja' });
    }

    const group = await OrganisationBarcodeGroup.create({
      organisation_id: null, // Global
      code: codeClean
    });

    logger.info(`Barcode group cree (global): ${codeClean}`);

    res.status(201).json(group);
  } catch (error) {
    logger.error('Erreur creation barcode group:', error);
    res.status(500).json({ error: 'Erreur lors de la creation du groupe' });
  }
};

/**
 * Supprime un groupe de codes-barres
 * Route: DELETE /api/organisations/barcode-groups/:groupId
 * Route legacy: DELETE /api/organisations/:orgId/barcode-groups/:groupId
 */
exports.deleteBarcodeGroup = async (req, res) => {
  try {
    const { groupId, orgId } = req.params;
    const id = groupId || orgId; // Support both route formats

    const group = await OrganisationBarcodeGroup.findByPk(id);

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouve' });
    }

    // Verifier qu'aucune config n'utilise ce groupe
    const configsUsingGroup = await OrganisationBarcodeConfig.count({
      where: { groupe_id: id }
    });

    if (configsUsingGroup > 0) {
      return res.status(400).json({
        error: 'Ce groupe est utilise par une ou plusieurs configurations. Modifiez les configurations avant de supprimer le groupe.'
      });
    }

    await group.destroy();

    logger.info(`Barcode group supprime: ${group.code}`);

    res.json({ message: 'Groupe supprime', id });
  } catch (error) {
    logger.error('Erreur suppression barcode group:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du groupe' });
  }
};

// ========================================
// Barcode Config
// ========================================

const MODULES = ['utilisateur', 'jeu', 'livre', 'film', 'disque'];

/**
 * Recupere la configuration des codes-barres par module
 */
exports.getBarcodeConfig = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifier que l'organisation existe
    const organisation = await Organisation.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvee' });
    }

    // Recuperer les configs existantes
    const configs = await OrganisationBarcodeConfig.findAll({
      where: { organisation_id: id },
      include: [{
        model: OrganisationBarcodeGroup,
        as: 'groupe',
        attributes: ['id', 'code']
      }]
    });

    // Creer un objet avec tous les modules (par defaut 'organisation')
    const result = {};
    MODULES.forEach(module => {
      const config = configs.find(c => c.module === module);
      result[module] = config ? {
        type_gestion: config.type_gestion,
        groupe_id: config.groupe_id,
        groupe_code: config.groupe?.code || null
      } : {
        type_gestion: 'organisation',
        groupe_id: null,
        groupe_code: null
      };
    });

    res.json(result);
  } catch (error) {
    logger.error('Erreur get barcode config:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation de la configuration' });
  }
};

/**
 * Met a jour la configuration des codes-barres
 * Body: { module: { type_gestion, groupe_id }, ... }
 */
exports.updateBarcodeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const configData = req.body;

    // Verifier que l'organisation existe
    const organisation = await Organisation.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvee' });
    }

    // Traiter chaque module
    for (const module of MODULES) {
      if (configData[module]) {
        const { type_gestion, groupe_id } = configData[module];

        // Validation
        if (!['organisation', 'structure', 'groupe'].includes(type_gestion)) {
          return res.status(400).json({
            error: `Type de gestion invalide pour ${module}: ${type_gestion}`
          });
        }

        // Si type groupe, verifier que le groupe existe (les groupes sont globaux)
        if (type_gestion === 'groupe' && groupe_id) {
          const groupExists = await OrganisationBarcodeGroup.findByPk(groupe_id);
          if (!groupExists) {
            return res.status(400).json({
              error: `Groupe ${groupe_id} non trouve pour ${module}`
            });
          }
        }

        // Upsert la config
        await OrganisationBarcodeConfig.upsert({
          organisation_id: parseInt(id),
          module,
          type_gestion,
          groupe_id: type_gestion === 'groupe' ? groupe_id : null
        });
      }
    }

    logger.info(`Barcode config mise a jour pour org ${id}`);

    // Retourner la config mise a jour
    const configs = await OrganisationBarcodeConfig.findAll({
      where: { organisation_id: id },
      include: [{
        model: OrganisationBarcodeGroup,
        as: 'groupe',
        attributes: ['id', 'code']
      }]
    });

    const result = {};
    MODULES.forEach(module => {
      const config = configs.find(c => c.module === module);
      result[module] = config ? {
        type_gestion: config.type_gestion,
        groupe_id: config.groupe_id,
        groupe_code: config.groupe?.code || null
      } : {
        type_gestion: 'organisation',
        groupe_id: null,
        groupe_code: null
      };
    });

    res.json(result);
  } catch (error) {
    logger.error('Erreur update barcode config:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la configuration' });
  }
};
