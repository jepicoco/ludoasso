/**
 * Controller pour la gestion des Organisations
 *
 * Gestion CRUD de l'entite racine representant une organisation
 * (association, collectivite, entreprise)
 */

const { Organisation, Structure, ConfigurationEmail, ConfigurationSMS } = require('../models');
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
