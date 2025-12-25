/**
 * Service de gestion des relations familiales
 * Supporte les foyers multiples et la garde partagée
 */

const { Utilisateur, Foyer, MembreFoyer, TarifCotisation, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Types de liens familiaux disponibles
 */
const TYPES_LIENS = {
  // Liens adultes (copie adresse/QF)
  adultes: {
    conjoint: { label: 'Conjoint(e)', copieAdresse: true, copieQF: true },
    marie: { label: 'Mari', copieAdresse: true, copieQF: true },
    mariee: { label: 'Femme (épouse)', copieAdresse: true, copieQF: true },
    pere: { label: 'Père', copieAdresse: true, copieQF: true },
    mere: { label: 'Mère', copieAdresse: true, copieQF: true },
    beau_pere: { label: 'Beau-père', copieAdresse: true, copieQF: true },
    belle_mere: { label: 'Belle-mère', copieAdresse: true, copieQF: true },
    grand_pere: { label: 'Grand-père', copieAdresse: false, copieQF: false },
    grand_mere: { label: 'Grand-mère', copieAdresse: false, copieQF: false },
    oncle: { label: 'Oncle', copieAdresse: false, copieQF: false },
    tante: { label: 'Tante', copieAdresse: false, copieQF: false },
    tuteur: { label: 'Tuteur', copieAdresse: true, copieQF: true },
    tutrice: { label: 'Tutrice', copieAdresse: true, copieQF: true }
  },
  // Liens enfants (copie toutes les données + possibilité garde partagée)
  enfants: {
    fils: { label: 'Fils', copieTout: true, gardePartagee: true },
    fille: { label: 'Fille', copieTout: true, gardePartagee: true },
    beau_fils: { label: 'Beau-fils', copieTout: true, gardePartagee: true },
    belle_fille: { label: 'Belle-fille', copieTout: true, gardePartagee: true },
    petit_fils: { label: 'Petit-fils', copieTout: true, gardePartagee: false },
    petite_fille: { label: 'Petite-fille', copieTout: true, gardePartagee: false },
    neveu: { label: 'Neveu', copieTout: false, gardePartagee: false },
    niece: { label: 'Nièce', copieTout: false, gardePartagee: false },
    frere: { label: 'Frère', copieTout: false, gardePartagee: false },
    soeur: { label: 'Sœur', copieTout: false, gardePartagee: false },
    demi_frere: { label: 'Demi-frère', copieTout: false, gardePartagee: false },
    demi_soeur: { label: 'Demi-sœur', copieTout: false, gardePartagee: false },
    cousin: { label: 'Cousin', copieTout: false, gardePartagee: false },
    cousine: { label: 'Cousine', copieTout: false, gardePartagee: false }
  }
};

class FamilleService {

  /**
   * Obtenir les types de liens disponibles
   */
  getTypesLiens() {
    return TYPES_LIENS;
  }

  /**
   * Déterminer si un lien est de type adulte
   */
  estLienAdulte(typeLien) {
    return !!TYPES_LIENS.adultes[typeLien];
  }

  /**
   * Déterminer si un lien est de type enfant
   */
  estLienEnfant(typeLien) {
    return !!TYPES_LIENS.enfants[typeLien];
  }

  /**
   * Obtenir la configuration d'un type de lien
   */
  getConfigLien(typeLien) {
    return TYPES_LIENS.adultes[typeLien] || TYPES_LIENS.enfants[typeLien] || null;
  }

  // =======================
  // Gestion des foyers
  // =======================

  /**
   * Créer un nouveau foyer avec un responsable principal
   */
  async creerFoyer(responsableId, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const responsable = await Utilisateur.findByPk(responsableId, { transaction });

      if (!responsable) {
        throw new Error('Utilisateur responsable non trouvé');
      }

      // Créer le foyer
      const foyer = await Foyer.create({
        nom: options.nom || `Foyer ${responsable.nom}`,
        responsable_principal_id: responsableId,
        adresse: options.adresse || responsable.adresse,
        ville: options.ville || responsable.ville,
        code_postal: options.code_postal || responsable.code_postal,
        telephone: options.telephone || responsable.telephone,
        quotient_familial: options.quotient_familial || responsable.quotient_familial,
        structure_id: options.structure_id,
        notes: options.notes
      }, { transaction });

      // Ajouter le responsable comme membre
      await MembreFoyer.create({
        utilisateur_id: responsableId,
        foyer_id: foyer.id,
        type_lien: 'responsable',
        lien_parente: null,
        est_foyer_principal: true,
        herite_adresse: false,
        herite_qf: false,
        date_debut: new Date()
      }, { transaction });

      // Mettre à jour le foyer principal de l'utilisateur
      await responsable.update({
        foyer_principal_id: foyer.id
      }, { transaction, hooks: false });

      await transaction.commit();

      logger.info(`Foyer créé: ${foyer.nom} (id: ${foyer.id}) pour ${responsable.prenom} ${responsable.nom}`);

      return foyer;

    } catch (error) {
      await transaction.rollback();
      logger.error('Erreur création foyer:', error);
      throw error;
    }
  }

  /**
   * Ajouter un membre à un foyer
   */
  async ajouterMembreFoyer(foyerId, utilisateurId, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const foyer = await Foyer.findByPk(foyerId, { transaction });
      const utilisateur = await Utilisateur.findByPk(utilisateurId, { transaction });

      if (!foyer) {
        throw new Error('Foyer non trouvé');
      }
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier si déjà membre
      const dejaMembreMeme = await MembreFoyer.findOne({
        where: { utilisateur_id: utilisateurId, foyer_id: foyerId },
        transaction
      });

      if (dejaMembreMeme) {
        throw new Error('Cet utilisateur est déjà membre de ce foyer');
      }

      // Déterminer le type de lien
      const lienParente = options.lien_parente || 'autre';
      const estEnfant = this.estLienEnfant(lienParente);
      const estAdulte = this.estLienAdulte(lienParente);
      const configLien = this.getConfigLien(lienParente);

      // Déterminer le type_lien générique
      let typeLien = 'autre_adulte';
      if (estEnfant) {
        typeLien = 'enfant';
      } else if (lienParente === 'conjoint' || lienParente === 'marie' || lienParente === 'mariee') {
        typeLien = 'conjoint';
      } else if (estAdulte && (lienParente.includes('pere') || lienParente.includes('mere'))) {
        typeLien = 'parent';
      } else if (lienParente.includes('beau_')) {
        typeLien = 'beau_parent';
      }

      // Vérifier si garde partagée (enfant avec déjà un foyer)
      const autresFoyers = await MembreFoyer.count({
        where: {
          utilisateur_id: utilisateurId,
          foyer_id: { [Op.ne]: foyerId },
          date_fin: null
        },
        transaction
      });

      const estGardePartagee = estEnfant && autresFoyers > 0;
      const estFoyerPrincipal = options.est_foyer_principal !== undefined
        ? options.est_foyer_principal
        : autresFoyers === 0;

      // Créer l'appartenance au foyer
      const membre = await MembreFoyer.create({
        utilisateur_id: utilisateurId,
        foyer_id: foyerId,
        type_lien: typeLien,
        lien_parente: lienParente,
        est_foyer_principal: estFoyerPrincipal,
        pourcentage_garde: options.pourcentage_garde || null,
        jours_garde: options.jours_garde || null,
        semaines_garde: options.semaines_garde || null,
        herite_adresse: options.herite_adresse !== undefined ? options.herite_adresse : true,
        herite_qf: options.herite_qf !== undefined ? options.herite_qf : true,
        date_debut: options.date_debut || new Date(),
        notes: options.notes
      }, { transaction });

      // Mettre à jour l'utilisateur
      const updateData = {};

      if (estEnfant) {
        updateData.est_compte_enfant = true;
        updateData.garde_partagee = estGardePartagee;
      }

      if (estFoyerPrincipal) {
        updateData.foyer_principal_id = foyerId;
      }

      // Copier les données selon le type de lien
      if (configLien) {
        if (membre.herite_adresse && (configLien.copieAdresse || configLien.copieTout)) {
          updateData.adresse = foyer.adresse;
          updateData.ville = foyer.ville;
          updateData.code_postal = foyer.code_postal;
        }
        if (membre.herite_qf && (configLien.copieQF || configLien.copieTout)) {
          updateData.quotient_familial = foyer.quotient_familial;
          updateData.qf_herite_parent = true;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await utilisateur.update(updateData, { transaction, hooks: false });
      }

      await transaction.commit();

      logger.info(`Membre ajouté au foyer: ${utilisateur.prenom} ${utilisateur.nom} -> ${foyer.nom} (${lienParente})`);

      return membre;

    } catch (error) {
      await transaction.rollback();
      logger.error('Erreur ajout membre foyer:', error);
      throw error;
    }
  }

  /**
   * Retirer un membre d'un foyer
   */
  async retirerMembreFoyer(foyerId, utilisateurId, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const membre = await MembreFoyer.findOne({
        where: {
          foyer_id: foyerId,
          utilisateur_id: utilisateurId,
          date_fin: null
        },
        transaction
      });

      if (!membre) {
        throw new Error('Membre non trouvé dans ce foyer');
      }

      // Marquer la fin de l'appartenance
      await membre.update({
        date_fin: options.date_fin || new Date()
      }, { transaction });

      // Vérifier si l'utilisateur a d'autres foyers
      const autresFoyers = await MembreFoyer.findAll({
        where: {
          utilisateur_id: utilisateurId,
          foyer_id: { [Op.ne]: foyerId },
          date_fin: null
        },
        transaction
      });

      const utilisateur = await Utilisateur.findByPk(utilisateurId, { transaction });

      const updateData = {};

      // Mettre à jour le foyer principal si nécessaire
      if (utilisateur.foyer_principal_id === foyerId) {
        if (autresFoyers.length > 0) {
          // Assigner un autre foyer comme principal
          const nouveauPrincipal = autresFoyers.find(m => m.est_foyer_principal) || autresFoyers[0];
          updateData.foyer_principal_id = nouveauPrincipal.foyer_id;
        } else {
          updateData.foyer_principal_id = null;
        }
      }

      // Si plus aucun foyer, réinitialiser les flags enfant
      if (autresFoyers.length === 0) {
        updateData.est_compte_enfant = false;
        updateData.garde_partagee = false;
        updateData.utilisateur_parent_id = null;
        updateData.type_lien_famille = null;
        updateData.qf_herite_parent = false;
      } else if (autresFoyers.length === 1) {
        updateData.garde_partagee = false;
      }

      if (Object.keys(updateData).length > 0) {
        await utilisateur.update(updateData, { transaction, hooks: false });
      }

      await transaction.commit();

      logger.info(`Membre retiré du foyer: utilisateur ${utilisateurId} du foyer ${foyerId}`);

      return { success: true };

    } catch (error) {
      await transaction.rollback();
      logger.error('Erreur retrait membre foyer:', error);
      throw error;
    }
  }

  /**
   * Obtenir les foyers d'un utilisateur
   */
  async getFoyersUtilisateur(utilisateurId) {
    const memberships = await MembreFoyer.findAll({
      where: {
        utilisateur_id: utilisateurId,
        date_fin: null
      },
      include: [{
        model: Foyer,
        as: 'foyer',
        include: [{
          model: Utilisateur,
          as: 'responsablePrincipal',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone']
        }]
      }],
      order: [['est_foyer_principal', 'DESC'], ['created_at', 'ASC']]
    });

    return memberships.map(m => ({
      foyer: m.foyer,
      typeLien: m.type_lien,
      lienParente: m.lien_parente,
      estFoyerPrincipal: m.est_foyer_principal,
      pourcentageGarde: m.pourcentage_garde,
      joursGarde: m.jours_garde,
      semainesGarde: m.semaines_garde,
      dateDebut: m.date_debut
    }));
  }

  /**
   * Obtenir les membres d'un foyer
   */
  async getMembresFoyer(foyerId) {
    const membres = await MembreFoyer.findAll({
      where: {
        foyer_id: foyerId,
        date_fin: null
      },
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'date_naissance', 'code_barre', 'statut']
      }],
      order: [
        ['type_lien', 'ASC'],
        [{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']
      ]
    });

    return membres.map(m => ({
      utilisateur: m.utilisateur,
      typeLien: m.type_lien,
      lienParente: m.lien_parente,
      lienLabel: m.getLibelleLien(),
      estFoyerPrincipal: m.est_foyer_principal,
      pourcentageGarde: m.pourcentage_garde,
      joursGarde: m.jours_garde,
      semainesGarde: m.semaines_garde,
      heriteAdresse: m.herite_adresse,
      heriteQF: m.herite_qf,
      dateDebut: m.date_debut
    }));
  }

  /**
   * Mettre à jour la configuration de garde partagée
   */
  async updateConfigGarde(membreFoyerId, options = {}) {
    const membre = await MembreFoyer.findByPk(membreFoyerId);

    if (!membre) {
      throw new Error('Appartenance au foyer non trouvée');
    }

    await membre.update({
      pourcentage_garde: options.pourcentage_garde,
      jours_garde: options.jours_garde,
      semaines_garde: options.semaines_garde,
      est_foyer_principal: options.est_foyer_principal,
      notes: options.notes
    });

    // Mettre à jour le foyer principal de l'utilisateur si nécessaire
    if (options.est_foyer_principal) {
      await Utilisateur.update(
        { foyer_principal_id: membre.foyer_id },
        { where: { id: membre.utilisateur_id }, hooks: false }
      );

      // Désélectionner les autres foyers comme principal
      await MembreFoyer.update(
        { est_foyer_principal: false },
        {
          where: {
            utilisateur_id: membre.utilisateur_id,
            id: { [Op.ne]: membreFoyerId }
          }
        }
      );
    }

    return membre;
  }

  // =======================
  // Fonctions de compatibilité (ancien système)
  // =======================

  /**
   * Lier un enfant a un parent/tuteur (compatibilité ancien système)
   */
  async lierEnfant(enfantId, parentId, typeLien = 'parent') {
    const transaction = await sequelize.transaction();

    try {
      const enfant = await Utilisateur.findByPk(enfantId, { transaction });
      const parent = await Utilisateur.findByPk(parentId, { transaction });

      if (!enfant) throw new Error('Utilisateur enfant non trouvé');
      if (!parent) throw new Error('Utilisateur parent non trouvé');

      // Vérifier que le parent n'est pas lui-même un enfant
      if (parent.est_compte_enfant) {
        throw new Error('Un compte enfant ne peut pas être désigné comme parent');
      }

      // Vérifier qu'on ne crée pas une boucle
      if (enfantId === parentId) {
        throw new Error('Un utilisateur ne peut pas être son propre parent');
      }

      // Obtenir ou créer le foyer du parent
      let foyer = await Foyer.findOne({
        where: { responsable_principal_id: parentId },
        transaction
      });

      if (!foyer) {
        foyer = await this.creerFoyer(parentId);
      }

      // Mapper l'ancien type vers le nouveau
      const lienParente = typeLien === 'tuteur' ? 'tuteur' : 'fils';

      // Ajouter l'enfant au foyer
      await this.ajouterMembreFoyer(foyer.id, enfantId, {
        lien_parente: lienParente
      });

      // Mettre à jour le champ legacy
      await enfant.update({
        utilisateur_parent_id: parentId,
        type_lien_famille: typeLien,
        date_lien_famille: new Date()
      }, { transaction, hooks: false });

      await transaction.commit();

      logger.info(`Lien familial créé: ${enfant.prenom} ${enfant.nom} -> ${parent.prenom} ${parent.nom} (${typeLien})`);

      return await Utilisateur.findByPk(enfantId, {
        include: [{ model: Utilisateur, as: 'parent', attributes: ['id', 'nom', 'prenom', 'email'] }]
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Erreur lors de la liaison familiale:', error);
      throw error;
    }
  }

  /**
   * Délier un enfant de son parent (compatibilité ancien système)
   */
  async delierEnfant(enfantId) {
    const enfant = await Utilisateur.findByPk(enfantId);

    if (!enfant) throw new Error('Utilisateur non trouvé');

    // Retirer de tous les foyers
    const appartenances = await MembreFoyer.findAll({
      where: {
        utilisateur_id: enfantId,
        date_fin: null
      }
    });

    for (const appartenance of appartenances) {
      await this.retirerMembreFoyer(appartenance.foyer_id, enfantId);
    }

    // Nettoyer les champs legacy
    await enfant.update({
      utilisateur_parent_id: null,
      type_lien_famille: null,
      date_lien_famille: null,
      est_compte_enfant: false,
      garde_partagee: false
    }, { hooks: false });

    logger.info(`Lien familial supprimé pour ${enfant.prenom} ${enfant.nom}`);

    return enfant;
  }

  /**
   * Récupérer les enfants d'un parent (compatibilité ancien système)
   */
  async getEnfants(parentId) {
    // Chercher via le foyer
    const foyer = await Foyer.findOne({
      where: { responsable_principal_id: parentId }
    });

    if (!foyer) {
      return [];
    }

    const membres = await this.getMembresFoyer(foyer.id);

    return membres
      .filter(m => m.typeLien === 'enfant')
      .map(m => ({
        ...m.utilisateur.toJSON(),
        type_lien_famille: m.lienParente,
        date_lien_famille: m.dateDebut
      }));
  }

  /**
   * Récupérer la famille complète d'un utilisateur
   */
  async getFamille(utilisateurId) {
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      throw new Error('Utilisateur non trouvé');
    }

    // Obtenir tous les foyers de l'utilisateur
    const foyers = await this.getFoyersUtilisateur(utilisateurId);

    // Si pas de foyer, retourner l'ancien format
    if (foyers.length === 0) {
      // Fallback sur l'ancien système via utilisateur_parent_id
      if (utilisateur.utilisateur_parent_id) {
        const parent = await Utilisateur.findByPk(utilisateur.utilisateur_parent_id);
        const enfants = await Utilisateur.findAll({
          where: { utilisateur_parent_id: parent.id }
        });

        return {
          responsable: parent,
          enfants,
          estEnfant: true,
          lienAvecParent: utilisateur.type_lien_famille,
          foyers: []
        };
      }

      const enfants = await Utilisateur.findAll({
        where: { utilisateur_parent_id: utilisateurId }
      });

      return {
        responsable: utilisateur,
        enfants,
        estEnfant: false,
        lienAvecParent: null,
        foyers: []
      };
    }

    // Utiliser le foyer principal
    const foyerPrincipal = foyers.find(f => f.estFoyerPrincipal) || foyers[0];
    const membresPrincipal = await this.getMembresFoyer(foyerPrincipal.foyer.id);

    const responsable = membresPrincipal.find(m => m.typeLien === 'responsable')?.utilisateur;
    const enfants = membresPrincipal.filter(m => m.typeLien === 'enfant').map(m => m.utilisateur);
    const estEnfant = foyerPrincipal.typeLien === 'enfant';

    return {
      responsable: responsable || foyerPrincipal.foyer.responsablePrincipal,
      enfants,
      estEnfant,
      lienAvecParent: estEnfant ? foyerPrincipal.lienParente : null,
      foyers: foyers.map(f => ({
        id: f.foyer.id,
        nom: f.foyer.nom,
        estPrincipal: f.estFoyerPrincipal,
        typeLien: f.typeLien,
        lienParente: f.lienParente,
        pourcentageGarde: f.pourcentageGarde
      })),
      gardePartagee: foyers.length > 1
    };
  }

  /**
   * Vérifier si un utilisateur a une famille
   */
  async aUneFamille(utilisateurId) {
    // Vérifier via les foyers
    const nbFoyers = await MembreFoyer.count({
      where: {
        utilisateur_id: utilisateurId,
        date_fin: null
      }
    });

    if (nbFoyers > 0) return true;

    // Fallback ancien système
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) return false;
    if (utilisateur.utilisateur_parent_id) return true;

    const nbEnfants = await Utilisateur.count({
      where: { utilisateur_parent_id: utilisateurId }
    });

    return nbEnfants > 0;
  }

  /**
   * Compter le nombre de membres dans une famille
   */
  async compterMembresFamille(utilisateurId) {
    const famille = await this.getFamille(utilisateurId);
    return 1 + (famille.enfants?.length || 0);
  }

  /**
   * Récupérer le tarif famille applicable
   */
  async getTarifFamille() {
    return await TarifCotisation.findOne({
      where: {
        actif: true,
        nom: { [Op.like]: '%famille%' }
      }
    });
  }

  /**
   * Calculer le coût pour une famille
   */
  async calculerCoutFamille(parentId) {
    const famille = await this.getFamille(parentId);
    const nombreMembres = 1 + (famille.enfants?.length || 0);

    const tarifFamille = await this.getTarifFamille();

    const tarifIndividuel = await TarifCotisation.findOne({
      where: {
        actif: true,
        nom: { [Op.like]: '%annuel%' },
        nom: { [Op.notLike]: '%famille%' }
      },
      order: [['montant', 'ASC']]
    });

    const coutIndividuel = tarifIndividuel ? parseFloat(tarifIndividuel.montant) * nombreMembres : 0;
    const coutFamille = tarifFamille ? parseFloat(tarifFamille.montant) : coutIndividuel;
    const economie = coutIndividuel - coutFamille;

    return {
      nombreMembres,
      coutIndividuel,
      coutFamille,
      economie: economie > 0 ? economie : 0,
      tarifFamilleDisponible: !!tarifFamille,
      tarifFamille: tarifFamille ? {
        id: tarifFamille.id,
        nom: tarifFamille.nom,
        montant: parseFloat(tarifFamille.montant)
      } : null
    };
  }

  /**
   * Rechercher des utilisateurs disponibles pour liaison
   */
  async rechercherUtilisateursDisponibles(query, excludeId = null, limit = 10) {
    const where = {
      statut: 'actif'
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    if (query && query.length >= 2) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${query}%` } },
        { prenom: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { code_barre: { [Op.like]: `%${query}%` } }
      ];
    }

    return await Utilisateur.findAll({
      where,
      attributes: ['id', 'nom', 'prenom', 'email', 'date_naissance', 'code_barre', 'est_compte_enfant'],
      limit,
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
  }

  /**
   * Transférer la responsabilité d'un enfant à un autre parent
   */
  async transfererResponsabilite(enfantId, nouveauParentId, typeLien = 'parent') {
    await this.delierEnfant(enfantId);
    return await this.lierEnfant(enfantId, nouveauParentId, typeLien);
  }

  /**
   * Copier les données d'un responsable vers un nouveau membre
   */
  async copierDonneesResponsable(responsableId, nouveauMembreId, options = {}) {
    const responsable = await Utilisateur.findByPk(responsableId);
    const membre = await Utilisateur.findByPk(nouveauMembreId);

    if (!responsable || !membre) {
      throw new Error('Utilisateur non trouvé');
    }

    const typeLien = options.typeLien || 'autre';
    const config = this.getConfigLien(typeLien);

    const updateData = {};

    // Copie selon le type de lien
    if (config?.copieAdresse || config?.copieTout) {
      updateData.adresse = responsable.adresse;
      updateData.ville = responsable.ville;
      updateData.code_postal = responsable.code_postal;
      updateData.code_postal_prise_en_charge = responsable.code_postal_prise_en_charge;
      updateData.ville_prise_en_charge = responsable.ville_prise_en_charge;
    }

    if (config?.copieQF || config?.copieTout) {
      updateData.quotient_familial = responsable.quotient_familial;
      updateData.qf_herite_parent = true;
    }

    if (config?.copieTout) {
      updateData.telephone = responsable.telephone;
      updateData.commune_id = responsable.commune_id;
      updateData.commune_prise_en_charge_id = responsable.commune_prise_en_charge_id;
    }

    if (Object.keys(updateData).length > 0) {
      await membre.update(updateData, { hooks: false });
    }

    return membre;
  }
}

module.exports = new FamilleService();
