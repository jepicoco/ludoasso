/**
 * Structure Controller
 * Gestion des structures (Bibliotheque, Ludotheque, etc.)
 */

const {
  Structure,
  Organisation,
  UtilisateurStructure,
  ParametresFrontStructure,
  Site,
  Utilisateur,
  Jeu,
  Livre,
  Film,
  Disque,
  Emprunt,
  Cotisation,
  ConfigurationEmail,
  ConfigurationSMS,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * Liste toutes les structures
 * Admin: toutes les structures
 * Autres: seulement celles auxquelles l'utilisateur a acces
 */
exports.getAll = async (req, res) => {
  try {
    const { actif } = req.query;
    const where = {};

    if (actif !== undefined) {
      where.actif = actif === 'true' || actif === '1';
    }

    let structures;

    // Includes communs
    const commonIncludes = [
      { model: Organisation, as: 'organisation', attributes: ['id', 'nom', 'nom_court', 'type_organisation'] },
      { model: ParametresFrontStructure, as: 'parametresFront' },
      { model: Site, as: 'sites', attributes: ['id', 'nom', 'code'] },
      { model: ConfigurationEmail, as: 'configurationEmailDefaut', attributes: ['id', 'libelle', 'email_expediteur'] },
      { model: ConfigurationSMS, as: 'configurationSMSDefaut', attributes: ['id', 'libelle', 'provider'] }
    ];

    // Admin voit tout
    if (req.user.role === 'administrateur') {
      structures = await Structure.findAll({
        where,
        include: commonIncludes,
        order: [['nom', 'ASC']]
      });
    } else {
      // Autres utilisateurs: seulement leurs structures
      const userStructures = await UtilisateurStructure.findAll({
        where: { utilisateur_id: req.user.id, actif: true },
        attributes: ['structure_id']
      });
      const structureIds = userStructures.map(us => us.structure_id);

      structures = await Structure.findAll({
        where: { ...where, id: { [Op.in]: structureIds } },
        include: commonIncludes,
        order: [['nom', 'ASC']]
      });
    }

    // Ajouter stats pour chaque structure
    const structuresWithStats = await Promise.all(structures.map(async (structure) => {
      // Note: Les collections utilisent 'statut' pas 'actif'
      // On compte tous les articles non supprimes (statut != 'supprime')
      const [jeuxCount, livresCount, filmsCount, disquesCount, empruntsActifs] = await Promise.all([
        Jeu.count({ where: { structure_id: structure.id, statut: { [Op.ne]: 'supprime' } } }),
        Livre.count({ where: { structure_id: structure.id, statut: { [Op.ne]: 'supprime' } } }),
        Film.count({ where: { structure_id: structure.id, statut: { [Op.ne]: 'supprime' } } }),
        Disque.count({ where: { structure_id: structure.id, statut: { [Op.ne]: 'supprime' } } }),
        Emprunt.count({ where: { structure_id: structure.id, statut: 'en_cours' } })
      ]);

      return {
        ...structure.toJSON(),
        stats: {
          jeux: jeuxCount,
          livres: livresCount,
          films: filmsCount,
          disques: disquesCount,
          emprunts_actifs: empruntsActifs,
          sites: structure.sites?.length || 0
        }
      };
    }));

    res.json(structuresWithStats);
  } catch (error) {
    console.error('Erreur getAll structures:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Recupere une structure par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await Structure.findByPk(id, {
      include: [
        { model: ParametresFrontStructure, as: 'parametresFront' },
        { model: Site, as: 'sites' },
        { model: ConfigurationEmail, as: 'configurationEmailDefaut', attributes: ['id', 'libelle', 'email_expediteur'] },
        { model: ConfigurationSMS, as: 'configurationSMSDefaut', attributes: ['id', 'libelle', 'provider'] },
        {
          model: UtilisateurStructure,
          as: 'accesUtilisateurs',
          include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom', 'email', 'role'] }]
        }
      ]
    });

    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier acces si pas admin
    if (req.user.role !== 'administrateur') {
      const hasAccess = await UtilisateurStructure.findOne({
        where: { utilisateur_id: req.user.id, structure_id: id, actif: true }
      });
      if (!hasAccess) {
        return res.status(403).json({ error: 'Acces refuse a cette structure' });
      }
    }

    // Stats
    const [jeuxCount, livresCount, filmsCount, disquesCount, empruntsActifs, cotisationsActives] = await Promise.all([
      Jeu.count({ where: { structure_id: id, actif: true } }),
      Livre.count({ where: { structure_id: id, actif: true } }),
      Film.count({ where: { structure_id: id, actif: true } }),
      Disque.count({ where: { structure_id: id, actif: true } }),
      Emprunt.count({ where: { structure_id: id, statut: 'en_cours' } }),
      Cotisation.count({ where: { structure_id: id, statut: 'active' } })
    ]);

    res.json({
      ...structure.toJSON(),
      stats: {
        jeux: jeuxCount,
        livres: livresCount,
        films: filmsCount,
        disques: disquesCount,
        emprunts_actifs: empruntsActifs,
        cotisations_actives: cotisationsActives
      }
    });
  } catch (error) {
    console.error('Erreur getById structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Cree une nouvelle structure
 */
exports.create = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      code,
      nom,
      description,
      organisation_id,
      organisation_nom,
      type_structure,
      type_structure_label,
      siret,
      adresse,
      telephone,
      email,
      modules_actifs,
      couleur,
      icone,
      code_comptable,
      section_analytique_id,
      configuration_email_id,
      configuration_sms_id,
      parametres_front
    } = req.body;

    // Validation
    if (!code || !nom) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Code et nom obligatoires' });
    }

    // Verifier unicite code
    const existing = await Structure.findOne({ where: { code } });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Ce code de structure existe deja' });
    }

    // Creer structure
    const structure = await Structure.create({
      code,
      nom,
      description,
      organisation_id: organisation_id || null,
      organisation_nom,
      type_structure: type_structure || 'ludotheque',
      type_structure_label,
      siret,
      adresse,
      telephone,
      email,
      modules_actifs: modules_actifs || ['jeux', 'livres', 'films', 'disques'],
      couleur: couleur || '#007bff',
      icone: icone || 'building',
      code_comptable,
      section_analytique_id,
      configuration_email_id: configuration_email_id || null,
      configuration_sms_id: configuration_sms_id || null,
      actif: true
    }, { transaction });

    // Creer parametres front par defaut
    await ParametresFrontStructure.create({
      structure_id: structure.id,
      theme_code: parametres_front?.theme_code || 'default',
      modules_visibles: parametres_front?.modules_visibles || ['catalogue', 'reservations', 'emprunts', 'prolongations'],
      permettre_reservations: parametres_front?.permettre_reservations ?? true,
      permettre_prolongations: parametres_front?.permettre_prolongations ?? true,
      max_prolongations: parametres_front?.max_prolongations || 1,
      delai_prolongation_jours: parametres_front?.delai_prolongation_jours || 14,
      limite_emprunts_defaut: parametres_front?.limite_emprunts_defaut || 5
    }, { transaction });

    // Donner acces au createur
    await UtilisateurStructure.create({
      utilisateur_id: req.user.id,
      structure_id: structure.id,
      role_structure: 'administrateur',
      actif: true
    }, { transaction });

    await transaction.commit();

    // Recharger avec associations
    const createdStructure = await Structure.findByPk(structure.id, {
      include: [
        { model: ParametresFrontStructure, as: 'parametresFront' },
        { model: ConfigurationEmail, as: 'configurationEmailDefaut', attributes: ['id', 'libelle', 'email_expediteur'] },
        { model: ConfigurationSMS, as: 'configurationSMSDefaut', attributes: ['id', 'libelle', 'provider'] }
      ]
    });

    res.status(201).json(createdStructure);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur create structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour une structure
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const structure = await Structure.findByPk(id);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier unicite code si modifie
    if (updates.code && updates.code !== structure.code) {
      const existing = await Structure.findOne({ where: { code: updates.code } });
      if (existing) {
        return res.status(409).json({ error: 'Ce code de structure existe deja' });
      }
    }

    // Preparer les champs a mettre a jour
    const fieldsToUpdate = {
      code: updates.code,
      nom: updates.nom,
      description: updates.description,
      organisation_nom: updates.organisation_nom,
      type_structure: updates.type_structure,
      type_structure_label: updates.type_structure_label,
      siret: updates.siret,
      adresse: updates.adresse,
      telephone: updates.telephone,
      email: updates.email,
      modules_actifs: updates.modules_actifs,
      couleur: updates.couleur,
      icone: updates.icone,
      code_comptable: updates.code_comptable,
      section_analytique_id: updates.section_analytique_id,
      actif: updates.actif
    };

    // Ajouter organisation_id si present dans la requete
    if ('organisation_id' in updates) {
      fieldsToUpdate.organisation_id = updates.organisation_id || null;
    }

    // Ajouter les connecteurs si presents dans la requete
    if ('configuration_email_id' in updates) {
      fieldsToUpdate.configuration_email_id = updates.configuration_email_id || null;
    }
    if ('configuration_sms_id' in updates) {
      fieldsToUpdate.configuration_sms_id = updates.configuration_sms_id || null;
    }

    await structure.update(fieldsToUpdate);

    const updatedStructure = await Structure.findByPk(id, {
      include: [
        { model: ParametresFrontStructure, as: 'parametresFront' },
        { model: ConfigurationEmail, as: 'configurationEmailDefaut', attributes: ['id', 'libelle', 'email_expediteur'] },
        { model: ConfigurationSMS, as: 'configurationSMSDefaut', attributes: ['id', 'libelle', 'provider'] }
      ]
    });

    res.json(updatedStructure);
  } catch (error) {
    console.error('Erreur update structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprime une structure
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await Structure.findByPk(id);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier qu'il n'y a pas de donnees liees
    const [jeuxCount, empruntsCount, cotisationsCount] = await Promise.all([
      Jeu.count({ where: { structure_id: id } }),
      Emprunt.count({ where: { structure_id: id } }),
      Cotisation.count({ where: { structure_id: id } })
    ]);

    if (jeuxCount > 0 || empruntsCount > 0 || cotisationsCount > 0) {
      return res.status(409).json({
        error: 'Structure non vide',
        message: 'Cette structure contient des donnees. Desactivez-la plutot que de la supprimer.',
        stats: { jeux: jeuxCount, emprunts: empruntsCount, cotisations: cotisationsCount }
      });
    }

    await structure.destroy();
    res.json({ message: 'Structure supprimee' });
  } catch (error) {
    console.error('Erreur delete structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Active/Desactive une structure
 */
exports.toggle = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await Structure.findByPk(id);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    await structure.update({ actif: !structure.actif });
    res.json({ actif: structure.actif, message: structure.actif ? 'Structure activee' : 'Structure desactivee' });
  } catch (error) {
    console.error('Erreur toggle structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

// ============================================
// Gestion des parametres frontend
// ============================================

/**
 * Recupere les parametres frontend d'une structure
 */
exports.getParametresFront = async (req, res) => {
  try {
    const { id } = req.params;

    const params = await ParametresFrontStructure.findOne({
      where: { structure_id: id },
      include: [{ model: Structure, as: 'structure', attributes: ['id', 'nom', 'code'] }]
    });

    if (!params) {
      return res.status(404).json({ error: 'Parametres introuvables' });
    }

    res.json(params);
  } catch (error) {
    console.error('Erreur getParametresFront:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour les parametres frontend d'une structure
 */
exports.updateParametresFront = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let params = await ParametresFrontStructure.findOne({ where: { structure_id: id } });

    if (!params) {
      // Creer si n'existe pas
      params = await ParametresFrontStructure.create({
        structure_id: id,
        ...updates
      });
    } else {
      await params.update(updates);
    }

    res.json(params);
  } catch (error) {
    console.error('Erreur updateParametresFront:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

// ============================================
// Gestion des acces utilisateurs
// ============================================

/**
 * Liste les utilisateurs ayant acces a une structure
 */
exports.getUtilisateurs = async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.query;

    const where = { structure_id: id };
    if (actif !== undefined) {
      where.actif = actif === 'true' || actif === '1';
    }

    const acces = await UtilisateurStructure.findAll({
      where,
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'role', 'actif']
      }],
      order: [[{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']]
    });

    res.json(acces);
  } catch (error) {
    console.error('Erreur getUtilisateurs structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Ajoute un utilisateur a une structure
 */
exports.addUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const { utilisateur_id, role_structure, date_debut, date_fin } = req.body;

    if (!utilisateur_id) {
      return res.status(400).json({ error: 'utilisateur_id obligatoire' });
    }

    // Verifier que l'utilisateur existe
    const user = await Utilisateur.findByPk(utilisateur_id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Verifier que la structure existe
    const structure = await Structure.findByPk(id);
    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable' });
    }

    // Verifier si acces existe deja
    const existing = await UtilisateurStructure.findOne({
      where: { utilisateur_id, structure_id: id }
    });

    if (existing) {
      // Mettre a jour
      await existing.update({ role_structure, date_debut, date_fin, actif: true });
      res.json(existing);
    } else {
      // Creer
      const acces = await UtilisateurStructure.create({
        utilisateur_id,
        structure_id: id,
        role_structure,
        date_debut,
        date_fin,
        actif: true
      });
      res.status(201).json(acces);
    }
  } catch (error) {
    console.error('Erreur addUtilisateur structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Retire un utilisateur d'une structure
 */
exports.removeUtilisateur = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const acces = await UtilisateurStructure.findOne({
      where: { structure_id: id, utilisateur_id: userId }
    });

    if (!acces) {
      return res.status(404).json({ error: 'Acces introuvable' });
    }

    // Desactiver plutot que supprimer (historique)
    await acces.update({ actif: false, date_fin: new Date() });
    res.json({ message: 'Acces retire' });
  } catch (error) {
    console.error('Erreur removeUtilisateur structure:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour l'acces d'un utilisateur a une structure
 */
exports.updateUtilisateurAcces = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role_structure, date_debut, date_fin, actif } = req.body;

    const acces = await UtilisateurStructure.findOne({
      where: { structure_id: id, utilisateur_id: userId }
    });

    if (!acces) {
      return res.status(404).json({ error: 'Acces introuvable' });
    }

    await acces.update({ role_structure, date_debut, date_fin, actif });
    res.json(acces);
  } catch (error) {
    console.error('Erreur updateUtilisateurAcces:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};
