/**
 * Controller Parametres Front
 * Gestion des parametres du site public (SEO, modules, CGV/CGU...)
 */

const crypto = require('crypto');
const { ParametresFront, ParametresFrontStructure } = require('../models');

/**
 * Genere une cle aleatoire pour le bypass de maintenance
 */
const generateMaintenanceKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Helper: Get or create ParametresFrontStructure for a given structure_id
 */
async function getOrCreateStructureParams(structureId) {
  if (!structureId) {
    return null;
  }

  let params = await ParametresFrontStructure.findOne({
    where: { structure_id: structureId }
  });

  if (!params) {
    params = await ParametresFrontStructure.create({
      structure_id: structureId
    });
  }

  return params;
}

/**
 * Recuperer tous les parametres front
 * Si X-Structure-Id est fourni, fusionne les parametres globaux avec ceux de la structure
 */
exports.getParametres = async (req, res) => {
  try {
    const structureId = req.headers['x-structure-id'];
    const parametresGlobaux = await ParametresFront.getParametres();

    // Si pas de structure specifiee, retourner les parametres globaux
    if (!structureId) {
      return res.json(parametresGlobaux);
    }

    // Recuperer les parametres de la structure
    const paramsStructure = await getOrCreateStructureParams(parseInt(structureId));

    // Fusionner: parametres globaux + surcharges de la structure
    // Les parametres de prolongation par module viennent de la structure
    const merged = { ...parametresGlobaux.toJSON() };

    // Surcharger avec les parametres de prolongation de la structure
    const prolongationFields = [
      'prolongation_active_ludotheque', 'prolongation_jours_ludotheque', 'prolongation_auto_max_ludotheque',
      'prolongation_manuelle_ludotheque', 'prolongation_msg_reservation_ludotheque',
      'prolongation_active_bibliotheque', 'prolongation_jours_bibliotheque', 'prolongation_auto_max_bibliotheque',
      'prolongation_manuelle_bibliotheque', 'prolongation_msg_reservation_bibliotheque',
      'prolongation_active_filmotheque', 'prolongation_jours_filmotheque', 'prolongation_auto_max_filmotheque',
      'prolongation_manuelle_filmotheque', 'prolongation_msg_reservation_filmotheque',
      'prolongation_active_discotheque', 'prolongation_jours_discotheque', 'prolongation_auto_max_discotheque',
      'prolongation_manuelle_discotheque', 'prolongation_msg_reservation_discotheque'
    ];

    for (const field of prolongationFields) {
      if (paramsStructure[field] !== undefined && paramsStructure[field] !== null) {
        merged[field] = paramsStructure[field];
      }
    }

    merged.structure_id = parseInt(structureId);
    res.json(merged);
  } catch (error) {
    console.error('Erreur getParametres front:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des parametres' });
  }
};

/**
 * Recuperer les parametres publics (sans donnees sensibles)
 */
exports.getParametresPublics = async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    res.json(parametres.toPublicJSON());
  } catch (error) {
    console.error('Erreur getParametresPublics front:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des parametres publics' });
  }
};

/**
 * Mettre a jour les parametres front
 * Si X-Structure-Id est fourni, les parametres de prolongation sont sauvegardes dans ParametresFrontStructure
 */
exports.updateParametres = async (req, res) => {
  try {
    const structureId = req.headers['x-structure-id'];
    const {
      // Identite
      nom_site, logo_url, favicon_url,
      // SEO
      meta_description, meta_keywords, meta_author,
      og_image_url, google_analytics_id, google_site_verification, robots_txt,
      // Mode
      mode_fonctionnement,
      // Modules
      module_ludotheque, module_bibliotheque, module_filmotheque, module_discotheque,
      module_inscriptions, module_reservations, module_paiement_en_ligne,
      module_recherche_ia, module_plan_interactif,
      // Legal
      cgv, cgu, politique_confidentialite, mentions_legales,
      // Contact
      email_contact, telephone_contact, adresse_contact,
      // Reseaux sociaux
      facebook_url, instagram_url, twitter_url, youtube_url,
      // Personnalisation
      couleur_primaire, couleur_secondaire, css_personnalise,
      // Maintenance
      mode_maintenance, message_maintenance,
      // Prolongations - Ludotheque
      prolongation_jours_ludotheque, prolongation_auto_max_ludotheque,
      prolongation_manuelle_ludotheque, prolongation_msg_reservation_ludotheque,
      prolongation_active_ludotheque,
      // Prolongations - Bibliotheque
      prolongation_jours_bibliotheque, prolongation_auto_max_bibliotheque,
      prolongation_manuelle_bibliotheque, prolongation_msg_reservation_bibliotheque,
      prolongation_active_bibliotheque,
      // Prolongations - Filmotheque
      prolongation_jours_filmotheque, prolongation_auto_max_filmotheque,
      prolongation_manuelle_filmotheque, prolongation_msg_reservation_filmotheque,
      prolongation_active_filmotheque,
      // Prolongations - Discotheque
      prolongation_jours_discotheque, prolongation_auto_max_discotheque,
      prolongation_manuelle_discotheque, prolongation_msg_reservation_discotheque,
      prolongation_active_discotheque,
      // Charte usager
      module_charte, charte_active, charte_grace_jours,
      charte_otp_email, charte_otp_email_config_id,
      charte_otp_sms, charte_otp_sms_config_id,
      charte_otp_preference
    } = req.body;

    // Si structure specifiee, sauvegarder les parametres de prolongation dans ParametresFrontStructure
    if (structureId) {
      const paramsStructure = await getOrCreateStructureParams(parseInt(structureId));
      const structureUpdates = {};

      // Prolongations - Ludotheque
      if (prolongation_jours_ludotheque !== undefined) structureUpdates.prolongation_jours_ludotheque = prolongation_jours_ludotheque;
      if (prolongation_auto_max_ludotheque !== undefined) structureUpdates.prolongation_auto_max_ludotheque = prolongation_auto_max_ludotheque;
      if (prolongation_manuelle_ludotheque !== undefined) structureUpdates.prolongation_manuelle_ludotheque = prolongation_manuelle_ludotheque;
      if (prolongation_msg_reservation_ludotheque !== undefined) structureUpdates.prolongation_msg_reservation_ludotheque = prolongation_msg_reservation_ludotheque;
      if (prolongation_active_ludotheque !== undefined) structureUpdates.prolongation_active_ludotheque = prolongation_active_ludotheque;

      // Prolongations - Bibliotheque
      if (prolongation_jours_bibliotheque !== undefined) structureUpdates.prolongation_jours_bibliotheque = prolongation_jours_bibliotheque;
      if (prolongation_auto_max_bibliotheque !== undefined) structureUpdates.prolongation_auto_max_bibliotheque = prolongation_auto_max_bibliotheque;
      if (prolongation_manuelle_bibliotheque !== undefined) structureUpdates.prolongation_manuelle_bibliotheque = prolongation_manuelle_bibliotheque;
      if (prolongation_msg_reservation_bibliotheque !== undefined) structureUpdates.prolongation_msg_reservation_bibliotheque = prolongation_msg_reservation_bibliotheque;
      if (prolongation_active_bibliotheque !== undefined) structureUpdates.prolongation_active_bibliotheque = prolongation_active_bibliotheque;

      // Prolongations - Filmotheque
      if (prolongation_jours_filmotheque !== undefined) structureUpdates.prolongation_jours_filmotheque = prolongation_jours_filmotheque;
      if (prolongation_auto_max_filmotheque !== undefined) structureUpdates.prolongation_auto_max_filmotheque = prolongation_auto_max_filmotheque;
      if (prolongation_manuelle_filmotheque !== undefined) structureUpdates.prolongation_manuelle_filmotheque = prolongation_manuelle_filmotheque;
      if (prolongation_msg_reservation_filmotheque !== undefined) structureUpdates.prolongation_msg_reservation_filmotheque = prolongation_msg_reservation_filmotheque;
      if (prolongation_active_filmotheque !== undefined) structureUpdates.prolongation_active_filmotheque = prolongation_active_filmotheque;

      // Prolongations - Discotheque
      if (prolongation_jours_discotheque !== undefined) structureUpdates.prolongation_jours_discotheque = prolongation_jours_discotheque;
      if (prolongation_auto_max_discotheque !== undefined) structureUpdates.prolongation_auto_max_discotheque = prolongation_auto_max_discotheque;
      if (prolongation_manuelle_discotheque !== undefined) structureUpdates.prolongation_manuelle_discotheque = prolongation_manuelle_discotheque;
      if (prolongation_msg_reservation_discotheque !== undefined) structureUpdates.prolongation_msg_reservation_discotheque = prolongation_msg_reservation_discotheque;
      if (prolongation_active_discotheque !== undefined) structureUpdates.prolongation_active_discotheque = prolongation_active_discotheque;

      if (Object.keys(structureUpdates).length > 0) {
        await paramsStructure.update(structureUpdates);
      }

      // Retourner les parametres fusionnes
      const parametresGlobaux = await ParametresFront.getParametres();
      const merged = { ...parametresGlobaux.toJSON(), ...paramsStructure.toJSON() };
      merged.structure_id = parseInt(structureId);
      return res.json(merged);
    }

    // Sinon, comportement normal: mise a jour des parametres globaux
    let parametres = await ParametresFront.findOne();

    if (!parametres) {
      // Creer les parametres s'ils n'existent pas
      const createData = {
        nom_site: nom_site || 'Ludotheque',
        logo_url, favicon_url,
        meta_description, meta_keywords, meta_author,
        og_image_url, google_analytics_id, google_site_verification, robots_txt,
        mode_fonctionnement: mode_fonctionnement || 'complet',
        module_ludotheque: module_ludotheque !== false,
        module_bibliotheque: module_bibliotheque || false,
        module_filmotheque: module_filmotheque || false,
        module_discotheque: module_discotheque || false,
        module_inscriptions: module_inscriptions !== false,
        module_reservations: module_reservations || false,
        module_paiement_en_ligne: module_paiement_en_ligne || false,
        module_recherche_ia: module_recherche_ia || false,
        module_plan_interactif: module_plan_interactif || false,
        cgv, cgu, politique_confidentialite, mentions_legales,
        email_contact, telephone_contact, adresse_contact,
        facebook_url, instagram_url, twitter_url, youtube_url,
        couleur_primaire, couleur_secondaire, css_personnalise,
        mode_maintenance: mode_maintenance || false,
        message_maintenance
      };

      // Generer une cle de maintenance si le mode est active
      if (createData.mode_maintenance) {
        createData.maintenance_key = generateMaintenanceKey();
      }

      parametres = await ParametresFront.create(createData);
    } else {
      // Mettre a jour les parametres existants
      const updates = {};

      // Identite
      if (nom_site !== undefined) updates.nom_site = nom_site;
      if (logo_url !== undefined) updates.logo_url = logo_url;
      if (favicon_url !== undefined) updates.favicon_url = favicon_url;

      // SEO
      if (meta_description !== undefined) updates.meta_description = meta_description;
      if (meta_keywords !== undefined) updates.meta_keywords = meta_keywords;
      if (meta_author !== undefined) updates.meta_author = meta_author;
      if (og_image_url !== undefined) updates.og_image_url = og_image_url;
      if (google_analytics_id !== undefined) updates.google_analytics_id = google_analytics_id;
      if (google_site_verification !== undefined) updates.google_site_verification = google_site_verification;
      if (robots_txt !== undefined) updates.robots_txt = robots_txt;

      // Mode
      if (mode_fonctionnement !== undefined) updates.mode_fonctionnement = mode_fonctionnement;

      // Modules
      if (module_ludotheque !== undefined) updates.module_ludotheque = module_ludotheque;
      if (module_bibliotheque !== undefined) updates.module_bibliotheque = module_bibliotheque;
      if (module_filmotheque !== undefined) updates.module_filmotheque = module_filmotheque;
      if (module_discotheque !== undefined) updates.module_discotheque = module_discotheque;
      if (module_inscriptions !== undefined) updates.module_inscriptions = module_inscriptions;
      if (module_reservations !== undefined) updates.module_reservations = module_reservations;
      if (module_paiement_en_ligne !== undefined) updates.module_paiement_en_ligne = module_paiement_en_ligne;
      if (module_recherche_ia !== undefined) updates.module_recherche_ia = module_recherche_ia;
      if (module_plan_interactif !== undefined) updates.module_plan_interactif = module_plan_interactif;

      // Legal
      if (cgv !== undefined) updates.cgv = cgv;
      if (cgu !== undefined) updates.cgu = cgu;
      if (politique_confidentialite !== undefined) updates.politique_confidentialite = politique_confidentialite;
      if (mentions_legales !== undefined) updates.mentions_legales = mentions_legales;

      // Contact
      if (email_contact !== undefined) updates.email_contact = email_contact;
      if (telephone_contact !== undefined) updates.telephone_contact = telephone_contact;
      if (adresse_contact !== undefined) updates.adresse_contact = adresse_contact;

      // Reseaux sociaux
      if (facebook_url !== undefined) updates.facebook_url = facebook_url;
      if (instagram_url !== undefined) updates.instagram_url = instagram_url;
      if (twitter_url !== undefined) updates.twitter_url = twitter_url;
      if (youtube_url !== undefined) updates.youtube_url = youtube_url;

      // Personnalisation
      if (couleur_primaire !== undefined) updates.couleur_primaire = couleur_primaire;
      if (couleur_secondaire !== undefined) updates.couleur_secondaire = couleur_secondaire;
      if (css_personnalise !== undefined) updates.css_personnalise = css_personnalise;

      // Maintenance
      if (mode_maintenance !== undefined) {
        updates.mode_maintenance = mode_maintenance;
        // Generer une nouvelle cle si on active la maintenance
        if (mode_maintenance === true) {
          updates.maintenance_key = generateMaintenanceKey();
        }
      }
      if (message_maintenance !== undefined) updates.message_maintenance = message_maintenance;

      // Prolongations - Ludotheque
      if (prolongation_jours_ludotheque !== undefined) updates.prolongation_jours_ludotheque = prolongation_jours_ludotheque;
      if (prolongation_auto_max_ludotheque !== undefined) updates.prolongation_auto_max_ludotheque = prolongation_auto_max_ludotheque;
      if (prolongation_manuelle_ludotheque !== undefined) updates.prolongation_manuelle_ludotheque = prolongation_manuelle_ludotheque;
      if (prolongation_msg_reservation_ludotheque !== undefined) updates.prolongation_msg_reservation_ludotheque = prolongation_msg_reservation_ludotheque;
      if (prolongation_active_ludotheque !== undefined) updates.prolongation_active_ludotheque = prolongation_active_ludotheque;

      // Prolongations - Bibliotheque
      if (prolongation_jours_bibliotheque !== undefined) updates.prolongation_jours_bibliotheque = prolongation_jours_bibliotheque;
      if (prolongation_auto_max_bibliotheque !== undefined) updates.prolongation_auto_max_bibliotheque = prolongation_auto_max_bibliotheque;
      if (prolongation_manuelle_bibliotheque !== undefined) updates.prolongation_manuelle_bibliotheque = prolongation_manuelle_bibliotheque;
      if (prolongation_msg_reservation_bibliotheque !== undefined) updates.prolongation_msg_reservation_bibliotheque = prolongation_msg_reservation_bibliotheque;
      if (prolongation_active_bibliotheque !== undefined) updates.prolongation_active_bibliotheque = prolongation_active_bibliotheque;

      // Prolongations - Filmotheque
      if (prolongation_jours_filmotheque !== undefined) updates.prolongation_jours_filmotheque = prolongation_jours_filmotheque;
      if (prolongation_auto_max_filmotheque !== undefined) updates.prolongation_auto_max_filmotheque = prolongation_auto_max_filmotheque;
      if (prolongation_manuelle_filmotheque !== undefined) updates.prolongation_manuelle_filmotheque = prolongation_manuelle_filmotheque;
      if (prolongation_msg_reservation_filmotheque !== undefined) updates.prolongation_msg_reservation_filmotheque = prolongation_msg_reservation_filmotheque;
      if (prolongation_active_filmotheque !== undefined) updates.prolongation_active_filmotheque = prolongation_active_filmotheque;

      // Prolongations - Discotheque
      if (prolongation_jours_discotheque !== undefined) updates.prolongation_jours_discotheque = prolongation_jours_discotheque;
      if (prolongation_auto_max_discotheque !== undefined) updates.prolongation_auto_max_discotheque = prolongation_auto_max_discotheque;
      if (prolongation_manuelle_discotheque !== undefined) updates.prolongation_manuelle_discotheque = prolongation_manuelle_discotheque;
      if (prolongation_msg_reservation_discotheque !== undefined) updates.prolongation_msg_reservation_discotheque = prolongation_msg_reservation_discotheque;
      if (prolongation_active_discotheque !== undefined) updates.prolongation_active_discotheque = prolongation_active_discotheque;

      // Charte usager
      if (module_charte !== undefined) updates.module_charte = module_charte;
      if (charte_active !== undefined) updates.charte_active = charte_active;
      if (charte_grace_jours !== undefined) updates.charte_grace_jours = charte_grace_jours;
      if (charte_otp_email !== undefined) updates.charte_otp_email = charte_otp_email;
      if (charte_otp_email_config_id !== undefined) updates.charte_otp_email_config_id = charte_otp_email_config_id;
      if (charte_otp_sms !== undefined) updates.charte_otp_sms = charte_otp_sms;
      if (charte_otp_sms_config_id !== undefined) updates.charte_otp_sms_config_id = charte_otp_sms_config_id;
      if (charte_otp_preference !== undefined) updates.charte_otp_preference = charte_otp_preference;

      await parametres.update(updates);
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur updateParametres front:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres' });
  }
};

/**
 * Mettre a jour une section specifique des parametres
 */
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    const updates = req.body;

    let parametres = await ParametresFront.getParametres();

    // Valider la section
    const sectionsValides = ['identite', 'seo', 'modules', 'legal', 'contact', 'reseaux', 'personnalisation', 'maintenance'];
    if (!sectionsValides.includes(section)) {
      return res.status(400).json({ error: 'Section invalide' });
    }

    // Mapper les champs autorises par section
    const champsParSection = {
      identite: ['nom_site', 'logo_url', 'favicon_url'],
      seo: ['meta_description', 'meta_keywords', 'meta_author', 'og_image_url', 'google_analytics_id', 'google_site_verification', 'robots_txt'],
      modules: ['mode_fonctionnement', 'module_ludotheque', 'module_bibliotheque', 'module_filmotheque', 'module_discotheque', 'module_inscriptions', 'module_reservations', 'module_paiement_en_ligne', 'module_recherche_ia', 'module_plan_interactif'],
      legal: ['cgv', 'cgu', 'politique_confidentialite', 'mentions_legales'],
      contact: ['email_contact', 'telephone_contact', 'adresse_contact'],
      reseaux: ['facebook_url', 'instagram_url', 'twitter_url', 'youtube_url'],
      personnalisation: ['couleur_primaire', 'couleur_secondaire', 'css_personnalise'],
      maintenance: ['mode_maintenance', 'message_maintenance']
    };

    // Filtrer les updates pour n'inclure que les champs de la section
    const champsAutorises = champsParSection[section];
    const updatesFiltered = {};
    for (const key of champsAutorises) {
      if (updates[key] !== undefined) {
        updatesFiltered[key] = updates[key];
      }
    }

    // Si on active la maintenance, generer une nouvelle cle
    if (section === 'maintenance' && updatesFiltered.mode_maintenance === true) {
      updatesFiltered.maintenance_key = generateMaintenanceKey();
    }

    await parametres.update(updatesFiltered);

    res.json({
      message: `Section ${section} mise a jour avec succes`,
      parametres
    });
  } catch (error) {
    console.error('Erreur updateSection front:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la section' });
  }
};

/**
 * Upload du logo
 */
exports.uploadLogo = async (req, res) => {
  try {
    // TODO: Implementer l'upload de fichier avec multer
    // Pour l'instant, on accepte juste une URL
    const { logo_url, favicon_url } = req.body;

    let parametres = await ParametresFront.getParametres();

    const updates = {};
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (favicon_url !== undefined) updates.favicon_url = favicon_url;

    await parametres.update(updates);

    res.json({
      message: 'Logo mis a jour avec succes',
      logo_url: parametres.logo_url,
      favicon_url: parametres.favicon_url
    });
  } catch (error) {
    console.error('Erreur uploadLogo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du logo' });
  }
};
