const { Adherent, AdherentArchive, ArchiveAccessLog, Emprunt, Cotisation, EmailLog, SmsLog, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper pour logger les accès aux archives
const logAccess = async (req, action, adherentArchiveId = null, details = null) => {
  try {
    await ArchiveAccessLog.create({
      user_id: req.user.id,
      user_nom: req.user.nom,
      user_prenom: req.user.prenom,
      user_role: req.user.role,
      action,
      adherent_archive_id: adherentArchiveId,
      details,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent')?.substring(0, 500)
    });
  } catch (error) {
    console.error('Erreur lors du log d\'accès:', error);
  }
};

// Vérifier les droits d'accès (admin ou comptable)
const checkArchiveAccess = (req, res, next) => {
  if (!['administrateur', 'comptable'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs et comptables'
    });
  }
  next();
};

// Récupérer la liste des adhérents archivés
const getArchives = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, anonymise } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    if (anonymise !== undefined) {
      where.est_anonymise = anonymise === 'true';
    }

    const { count, rows } = await AdherentArchive.findAndCountAll({
      where,
      order: [['date_archivage', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Logger l'accès à la liste
    await logAccess(req, 'consultation_liste', null, `Page ${page}, ${rows.length} résultats`);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur getArchives:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Récupérer le détail d'un adhérent archivé avec son historique
const getArchiveById = async (req, res) => {
  try {
    const { id } = req.params;

    const archive = await AdherentArchive.findByPk(id);
    if (!archive) {
      return res.status(404).json({ success: false, message: 'Archive non trouvée' });
    }

    // Récupérer l'historique lié (emprunts, cotisations, communications)
    const [emprunts, cotisations, emails, sms] = await Promise.all([
      Emprunt.findAll({
        where: { adherent_id: archive.adherent_id },
        include: [{ association: 'jeu', attributes: ['id', 'titre', 'code_barre'] }],
        order: [['date_emprunt', 'DESC']]
      }),
      Cotisation.findAll({
        where: { adherent_id: archive.adherent_id },
        include: [{ association: 'tarif', attributes: ['id', 'libelle'] }],
        order: [['date_cotisation', 'DESC']]
      }),
      EmailLog.findAll({
        where: { adherent_id: archive.adherent_id },
        order: [['date_envoi', 'DESC']],
        limit: 50
      }),
      SmsLog.findAll({
        where: { adherent_id: archive.adherent_id },
        order: [['date_envoi', 'DESC']],
        limit: 50
      })
    ]);

    // Logger l'accès à la fiche
    await logAccess(req, 'consultation_fiche', id);

    res.json({
      success: true,
      data: {
        archive,
        historique: {
          emprunts,
          cotisations,
          emails,
          sms
        }
      }
    });
  } catch (error) {
    console.error('Erreur getArchiveById:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Archiver un adhérent (appelé à la place de la suppression)
const archiverAdherent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { motif } = req.body;

    const adherent = await Adherent.findByPk(id, { transaction });
    if (!adherent) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Adhérent non trouvé' });
    }

    // Vérifier s'il n'y a pas d'emprunts en cours
    const empruntsEnCours = await Emprunt.count({
      where: { adherent_id: id, statut: 'en_cours' },
      transaction
    });

    if (empruntsEnCours > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Impossible d'archiver : ${empruntsEnCours} emprunt(s) en cours`
      });
    }

    // Trouver la dernière activité
    const [dernierEmprunt, derniereCotisation] = await Promise.all([
      Emprunt.findOne({
        where: { adherent_id: id },
        order: [['date_emprunt', 'DESC']],
        transaction
      }),
      Cotisation.findOne({
        where: { adherent_id: id },
        order: [['date_cotisation', 'DESC']],
        transaction
      })
    ]);

    const dateDernierEmprunt = dernierEmprunt?.date_emprunt ? new Date(dernierEmprunt.date_emprunt) : null;
    const dateDerniereCotisation = derniereCotisation?.date_cotisation ? new Date(derniereCotisation.date_cotisation) : null;

    let derniereActivite = null;
    if (dateDernierEmprunt && dateDerniereCotisation) {
      derniereActivite = dateDernierEmprunt > dateDerniereCotisation ? dateDernierEmprunt : dateDerniereCotisation;
    } else {
      derniereActivite = dateDernierEmprunt || dateDerniereCotisation;
    }

    // Créer l'archive
    const archive = await AdherentArchive.create({
      adherent_id: adherent.id,
      code_barre: adherent.code_barre,
      civilite: adherent.civilite || null,
      nom: adherent.nom,
      prenom: adherent.prenom,
      email: adherent.email,
      telephone: adherent.telephone,
      adresse: adherent.adresse,
      ville: adherent.ville,
      code_postal: adherent.code_postal,
      date_naissance: adherent.date_naissance,
      date_adhesion: adherent.date_adhesion,
      date_fin_adhesion: adherent.date_fin_adhesion,
      statut_avant_archivage: adherent.statut,
      photo: adherent.photo,
      notes: adherent.notes,
      adhesion_association: adherent.adhesion_association,
      role: adherent.role,
      archive_par: req.user.id,
      motif_archivage: motif || 'Archivage manuel',
      derniere_activite: derniereActivite
    }, { transaction });

    // Supprimer l'adhérent de la table principale
    await adherent.destroy({ transaction });

    await transaction.commit();

    // Logger l'action
    await logAccess(req, 'archivage', archive.id, `Adhérent ${adherent.prenom} ${adherent.nom} archivé`);

    res.json({
      success: true,
      message: 'Adhérent archivé avec succès',
      data: archive
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur archiverAdherent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Archiver en masse les adhérents inactifs depuis plus de 3 ans
const archiverInactifs = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 3);

    // Trouver les adhérents sans activité depuis 3 ans
    const adherents = await Adherent.findAll({ transaction });
    const aArchiver = [];

    for (const adherent of adherents) {
      // Vérifier les emprunts en cours
      const empruntsEnCours = await Emprunt.count({
        where: { adherent_id: adherent.id, statut: 'en_cours' },
        transaction
      });

      if (empruntsEnCours > 0) continue;

      // Trouver la dernière activité
      const [dernierEmprunt, derniereCotisation] = await Promise.all([
        Emprunt.findOne({
          where: { adherent_id: adherent.id },
          order: [['date_emprunt', 'DESC']],
          transaction
        }),
        Cotisation.findOne({
          where: { adherent_id: adherent.id },
          order: [['date_cotisation', 'DESC']],
          transaction
        })
      ]);

      const dateDernierEmprunt = dernierEmprunt?.date_emprunt ? new Date(dernierEmprunt.date_emprunt) : null;
      const dateDerniereCotisation = derniereCotisation?.date_cotisation ? new Date(derniereCotisation.date_cotisation) : null;

      let derniereActivite = null;
      if (dateDernierEmprunt && dateDerniereCotisation) {
        derniereActivite = dateDernierEmprunt > dateDerniereCotisation ? dateDernierEmprunt : dateDerniereCotisation;
      } else {
        derniereActivite = dateDernierEmprunt || dateDerniereCotisation;
      }

      // Si aucune activité ou activité > 3 ans
      if (!derniereActivite || derniereActivite < dateLimit) {
        aArchiver.push({ adherent, derniereActivite });
      }
    }

    // Archiver chaque adhérent
    const archives = [];
    for (const { adherent, derniereActivite } of aArchiver) {
      const archive = await AdherentArchive.create({
        adherent_id: adherent.id,
        code_barre: adherent.code_barre,
        civilite: adherent.civilite || null,
        nom: adherent.nom,
        prenom: adherent.prenom,
        email: adherent.email,
        telephone: adherent.telephone,
        adresse: adherent.adresse,
        ville: adherent.ville,
        code_postal: adherent.code_postal,
        date_naissance: adherent.date_naissance,
        date_adhesion: adherent.date_adhesion,
        date_fin_adhesion: adherent.date_fin_adhesion,
        statut_avant_archivage: adherent.statut,
        photo: adherent.photo,
        notes: adherent.notes,
        adhesion_association: adherent.adhesion_association,
        role: adherent.role,
        archive_par: req.user.id,
        motif_archivage: 'Inactivité supérieure à 3 ans',
        derniere_activite: derniereActivite
      }, { transaction });

      await adherent.destroy({ transaction });
      archives.push(archive);
    }

    await transaction.commit();

    // Logger l'action
    await logAccess(req, 'archivage_masse', null, `${archives.length} adhérent(s) archivé(s) pour inactivité`);

    res.json({
      success: true,
      message: `${archives.length} adhérent(s) archivé(s) avec succès`,
      data: { count: archives.length }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur archiverInactifs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Prévisualiser les adhérents à archiver (inactifs 3 ans)
const previewInactifs = async (req, res) => {
  try {
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 3);

    const adherents = await Adherent.findAll();
    const aArchiver = [];

    for (const adherent of adherents) {
      // Vérifier les emprunts en cours
      const empruntsEnCours = await Emprunt.count({
        where: { adherent_id: adherent.id, statut: 'en_cours' }
      });

      if (empruntsEnCours > 0) continue;

      // Trouver la dernière activité
      const [dernierEmprunt, derniereCotisation] = await Promise.all([
        Emprunt.findOne({
          where: { adherent_id: adherent.id },
          order: [['date_emprunt', 'DESC']]
        }),
        Cotisation.findOne({
          where: { adherent_id: adherent.id },
          order: [['date_cotisation', 'DESC']]
        })
      ]);

      const dateDernierEmprunt = dernierEmprunt?.date_emprunt ? new Date(dernierEmprunt.date_emprunt) : null;
      const dateDerniereCotisation = derniereCotisation?.date_cotisation ? new Date(derniereCotisation.date_cotisation) : null;

      let derniereActivite = null;
      if (dateDernierEmprunt && dateDerniereCotisation) {
        derniereActivite = dateDernierEmprunt > dateDerniereCotisation ? dateDernierEmprunt : dateDerniereCotisation;
      } else {
        derniereActivite = dateDernierEmprunt || dateDerniereCotisation;
      }

      if (!derniereActivite || derniereActivite < dateLimit) {
        aArchiver.push({
          id: adherent.id,
          nom: adherent.nom,
          prenom: adherent.prenom,
          email: adherent.email,
          date_adhesion: adherent.date_adhesion,
          derniere_activite: derniereActivite
        });
      }
    }

    res.json({
      success: true,
      data: aArchiver,
      count: aArchiver.length
    });
  } catch (error) {
    console.error('Erreur previewInactifs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Anonymiser un adhérent archivé
const anonymiserArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const archive = await AdherentArchive.findByPk(id);
    if (!archive) {
      return res.status(404).json({ success: false, message: 'Archive non trouvée' });
    }

    if (archive.est_anonymise) {
      return res.status(400).json({ success: false, message: 'Cette archive est déjà anonymisée' });
    }

    await archive.anonymiser(req.user.id);

    // Logger l'action
    await logAccess(req, 'anonymisation', id, 'Anonymisation individuelle');

    res.json({
      success: true,
      message: 'Archive anonymisée avec succès',
      data: archive
    });
  } catch (error) {
    console.error('Erreur anonymiserArchive:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Anonymiser en masse les archives inactives depuis plus de 3 ans
const anonymiserArchivesInactives = async (req, res) => {
  try {
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 3);

    // Trouver les archives non anonymisées avec dernière activité > 3 ans
    const archives = await AdherentArchive.findAll({
      where: {
        est_anonymise: false,
        [Op.or]: [
          { derniere_activite: { [Op.lt]: dateLimit } },
          { derniere_activite: null }
        ]
      }
    });

    let count = 0;
    for (const archive of archives) {
      await archive.anonymiser(req.user.id);
      count++;
    }

    // Logger l'action
    await logAccess(req, 'anonymisation_masse', null, `${count} archive(s) anonymisée(s)`);

    res.json({
      success: true,
      message: `${count} archive(s) anonymisée(s) avec succès`,
      data: { count }
    });
  } catch (error) {
    console.error('Erreur anonymiserArchivesInactives:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Prévisualiser les archives à anonymiser
const previewAnonymisation = async (req, res) => {
  try {
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 3);

    const archives = await AdherentArchive.findAll({
      where: {
        est_anonymise: false,
        [Op.or]: [
          { derniere_activite: { [Op.lt]: dateLimit } },
          { derniere_activite: null }
        ]
      },
      attributes: ['id', 'adherent_id', 'nom', 'prenom', 'email', 'date_archivage', 'derniere_activite']
    });

    res.json({
      success: true,
      data: archives,
      count: archives.length
    });
  } catch (error) {
    console.error('Erreur previewAnonymisation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Statistiques des archives
const getArchivesStats = async (req, res) => {
  try {
    const [total, anonymisees, nonAnonymisees] = await Promise.all([
      AdherentArchive.count(),
      AdherentArchive.count({ where: { est_anonymise: true } }),
      AdherentArchive.count({ where: { est_anonymise: false } })
    ]);

    // Adhérents actifs éligibles à l'archivage
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 3);

    // Compter de façon simplifiée
    const adherentsActifs = await Adherent.count();

    res.json({
      success: true,
      data: {
        total,
        anonymisees,
        nonAnonymisees,
        adherentsActifs
      }
    });
  } catch (error) {
    console.error('Erreur getArchivesStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Récupérer l'historique des accès aux archives
const getAccessLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await ArchiveAccessLog.findAndCountAll({
      order: [['date_acces', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur getAccessLogs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  checkArchiveAccess,
  getArchives,
  getArchiveById,
  archiverAdherent,
  archiverInactifs,
  previewInactifs,
  anonymiserArchive,
  anonymiserArchivesInactives,
  previewAnonymisation,
  getArchivesStats,
  getAccessLogs
};
