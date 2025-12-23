/**
 * Service de gestion des codes-barres reserves
 *
 * Gere la generation, reservation et attribution des codes-barres
 * pour tous les modules (utilisateur, jeu, livre, film, disque)
 */

const {
  ParametresCodesBarres,
  LotCodesBarres,
  CodeBarreUtilisateur,
  CodeBarreJeu,
  CodeBarreLivre,
  CodeBarreFilm,
  CodeBarreDisque,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// Map des models de codes-barres par module
const CODE_MODELS = {
  utilisateur: CodeBarreUtilisateur,
  jeu: CodeBarreJeu,
  livre: CodeBarreLivre,
  film: CodeBarreFilm,
  disque: CodeBarreDisque
};

// Champs d'ID entity par module
const ENTITY_ID_FIELDS = {
  utilisateur: 'utilisateur_id',
  jeu: 'jeu_id',
  livre: 'livre_id',
  film: 'film_id',
  disque: 'disque_id'
};

class CodeBarreService {
  /**
   * Obtenir les parametres de format pour un module
   * @param {string} module - Le module (utilisateur, jeu, livre, film, disque)
   * @param {Object} context - Le contexte { organisation_id, structure_id, groupe_id }
   */
  async getParametres(module, context = {}) {
    return await ParametresCodesBarres.getOrCreateForModule(module, context);
  }

  /**
   * Mettre a jour les parametres de format
   * @param {string} module - Le module
   * @param {Object} data - Les donnees a mettre a jour
   * @param {Object} context - Le contexte { organisation_id, structure_id, groupe_id }
   */
  async updateParametres(module, data, context = {}) {
    const params = await this.getParametres(module, context);

    // Verifier si le format est verrouille
    if (params.format_locked) {
      // On peut modifier griller_annules mais pas le format
      if (data.format_pattern !== undefined || data.prefix !== undefined || data.sequence_reset !== undefined) {
        throw new Error('Le format est verrouille et ne peut plus etre modifie');
      }
    }

    // Mettre a jour les champs autorises
    if (data.format_pattern !== undefined && !params.format_locked) {
      params.format_pattern = data.format_pattern;
    }
    if (data.prefix !== undefined && !params.format_locked) {
      params.prefix = data.prefix;
    }
    if (data.sequence_reset !== undefined && !params.format_locked) {
      params.sequence_reset = data.sequence_reset;
    }
    if (data.griller_annules !== undefined) {
      params.griller_annules = data.griller_annules;
    }

    await params.save();
    return params;
  }

  /**
   * Generer un apercu du format
   * @param {string} module - Le module
   * @param {Object} context - Le contexte { organisation_id, structure_id, groupe_id }
   */
  async generatePreview(module, context = {}) {
    const params = await this.getParametres(module, context);
    return params.getPreview();
  }

  /**
   * Obtenir la periode courante pour un module
   */
  getCurrentPeriod(sequenceReset) {
    const now = new Date();
    switch (sequenceReset) {
      case 'yearly':
        return now.getFullYear().toString();
      case 'monthly':
        return now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
      case 'daily':
        return now.getFullYear().toString() +
               String(now.getMonth() + 1).padStart(2, '0') +
               String(now.getDate()).padStart(2, '0');
      default:
        return null;
    }
  }

  /**
   * Verifier et appliquer le reset de sequence si necessaire
   */
  async checkAndResetSequence(params) {
    if (params.sequence_reset === 'never') return params;

    const currentPeriod = this.getCurrentPeriod(params.sequence_reset);
    if (params.current_period !== currentPeriod) {
      params.current_sequence = 0;
      params.current_period = currentPeriod;
      await params.save();
    }
    return params;
  }

  /**
   * Generer le prochain code-barre (sans le reserver)
   */
  async generateNextCode(module, sequence = null, date = new Date()) {
    let params = await this.getParametres(module);
    params = await this.checkAndResetSequence(params);

    const seqNumber = sequence !== null ? sequence : params.current_sequence + 1;
    return params.generateCode(seqNumber, date);
  }

  /**
   * Obtenir la sequence suivante disponible (en sautant les codes reserves)
   */
  async getNextAvailableSequence(module) {
    let params = await this.getParametres(module);
    params = await this.checkAndResetSequence(params);

    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    // Trouver le max des sequences utilisees
    let nextSequence = params.current_sequence + 1;

    // Verifier si cette sequence n'est pas deja prise
    let codeTaken = true;
    while (codeTaken) {
      const potentialCode = params.generateCode(nextSequence);
      const existing = await CodeModel.findOne({
        where: {
          code_barre: potentialCode,
          statut: { [Op.ne]: 'annule' } // Les codes annules peuvent etre reutilises si griller_annules est false
        }
      });

      if (!existing) {
        codeTaken = false;
      } else {
        nextSequence++;
      }
    }

    return nextSequence;
  }

  /**
   * Reserver un ensemble de codes-barres (creer un lot)
   */
  async reserveCodes(module, quantity, creatorId) {
    if (quantity < 1 || quantity > 1000) {
      throw new Error('La quantite doit etre entre 1 et 1000');
    }

    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    let params = await this.getParametres(module);
    params = await this.checkAndResetSequence(params);

    // Transaction pour garantir l'atomicite
    const transaction = await sequelize.transaction();

    try {
      const codes = [];
      let startSequence = params.current_sequence + 1;
      let currentSequence = startSequence;
      const now = new Date();

      // Generer les codes
      for (let i = 0; i < quantity; i++) {
        // Verifier si le code existe deja
        let codeTaken = true;
        while (codeTaken) {
          const potentialCode = params.generateCode(currentSequence, now);
          const existing = await CodeModel.findOne({
            where: { code_barre: potentialCode },
            transaction
          });

          if (!existing) {
            codes.push({
              code_barre: potentialCode,
              sequence: currentSequence
            });
            codeTaken = false;
          }
          currentSequence++;
        }
      }

      // Creer le lot
      const lot = await LotCodesBarres.create({
        module,
        quantite: quantity,
        code_debut: codes[0].code_barre,
        code_fin: codes[codes.length - 1].code_barre,
        cree_par: creatorId,
        date_creation: now
      }, { transaction });

      // Creer les codes reserves
      const codeRecords = codes.map(c => ({
        code_barre: c.code_barre,
        lot_id: lot.id,
        statut: 'reserve',
        date_reservation: now
      }));

      await CodeModel.bulkCreate(codeRecords, { transaction });

      // Mettre a jour la sequence courante
      params.current_sequence = currentSequence - 1;

      // Verrouiller le format apres la premiere utilisation
      if (!params.format_locked) {
        params.format_locked = true;
      }

      await params.save({ transaction });

      await transaction.commit();

      return {
        lot,
        codes: codes.map(c => c.code_barre),
        premiere_sequence: startSequence,
        derniere_sequence: currentSequence - 1
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtenir les lots d'un module
   */
  async getLots(module, options = {}) {
    const { page = 1, limit = 20, statut = null } = options;

    const where = { module };
    if (statut) {
      where.statut = statut;
    }

    const { rows, count } = await LotCodesBarres.findAndCountAll({
      where,
      order: [['date_creation', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [{
        association: 'createur',
        attributes: ['id', 'prenom', 'nom', 'email']
      }]
    });

    return {
      lots: rows.map(lot => lot.getStats()),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtenir le detail d'un lot avec ses codes
   */
  async getLotDetails(lotId) {
    const lot = await LotCodesBarres.findByPk(lotId, {
      include: [{
        association: 'createur',
        attributes: ['id', 'prenom', 'nom', 'email']
      }]
    });

    if (!lot) {
      throw new Error('Lot non trouve');
    }

    const CodeModel = CODE_MODELS[lot.module];
    const codes = await CodeModel.findAll({
      where: { lot_id: lotId },
      order: [['code_barre', 'ASC']]
    });

    return {
      ...lot.getStats(),
      createur: lot.createur,
      codes: codes.map(c => ({
        id: c.id,
        code_barre: c.code_barre,
        statut: c.statut,
        date_reservation: c.date_reservation,
        date_utilisation: c.date_utilisation,
        date_annulation: c.date_annulation
      }))
    };
  }

  /**
   * Annuler un lot (tous les codes non utilises)
   */
  async cancelLot(lotId) {
    const lot = await LotCodesBarres.findByPk(lotId);
    if (!lot) {
      throw new Error('Lot non trouve');
    }

    if (!lot.canCancel()) {
      throw new Error('Ce lot ne peut plus etre annule');
    }

    const CodeModel = CODE_MODELS[lot.module];
    const params = await this.getParametres(lot.module);

    const transaction = await sequelize.transaction();

    try {
      // Annuler tous les codes reserves
      const newStatus = params.griller_annules ? 'grille' : 'annule';

      const [nbAnnules] = await CodeModel.update(
        {
          statut: newStatus,
          date_annulation: new Date()
        },
        {
          where: {
            lot_id: lotId,
            statut: 'reserve'
          },
          transaction
        }
      );

      // Mettre a jour le lot
      lot.nb_annules = nbAnnules;
      lot.statut = 'annule';
      await lot.save({ transaction });

      await transaction.commit();

      return {
        lot: lot.getStats(),
        nb_codes_annules: nbAnnules
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Annuler un code individuel
   */
  async cancelCode(module, codeId) {
    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    const params = await this.getParametres(module);
    const griller = params.griller_annules;

    return await CodeModel.cancel(codeId, griller);
  }

  /**
   * Restaurer un code annule (non grille)
   */
  async restoreCode(module, codeId) {
    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    return await CodeModel.restore(codeId);
  }

  /**
   * Obtenir les codes disponibles (reserves) d'un module
   */
  async getAvailableCodes(module, options = {}) {
    const { page = 1, limit = 50 } = options;

    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    const { rows, count } = await CodeModel.findAndCountAll({
      where: { statut: 'reserve' },
      order: [['date_reservation', 'ASC']],
      limit,
      offset: (page - 1) * limit,
      include: [{
        association: 'lot',
        attributes: ['id', 'date_creation']
      }]
    });

    return {
      codes: rows.map(c => ({
        id: c.id,
        code_barre: c.code_barre,
        lot_id: c.lot_id,
        date_reservation: c.date_reservation
      })),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Valider un code scanne (verifier s'il est reserve et disponible)
   */
  async validateScannedCode(codeBarre) {
    // Detecter le module a partir du prefix
    const module = this.detectModuleFromCode(codeBarre);

    if (!module) {
      return {
        valid: false,
        reserved: false,
        module: null,
        message: 'Code-barre non reconnu (prefix inconnu)'
      };
    }

    const CodeModel = CODE_MODELS[module];
    const code = await CodeModel.findOne({
      where: { code_barre: codeBarre }
    });

    if (!code) {
      // Code non pre-imprime
      return {
        valid: true,
        reserved: false,
        module,
        message: 'Ce code n\'a pas ete pre-imprime. Voulez-vous l\'utiliser quand meme?',
        warning: true
      };
    }

    if (code.statut === 'utilise') {
      return {
        valid: false,
        reserved: true,
        module,
        message: 'Ce code est deja utilise',
        entityId: code[ENTITY_ID_FIELDS[module]]
      };
    }

    if (code.statut === 'grille') {
      return {
        valid: false,
        reserved: true,
        module,
        message: 'Ce code a ete grille et ne peut plus etre utilise'
      };
    }

    if (code.statut === 'annule') {
      // Peut etre reutilise
      return {
        valid: true,
        reserved: true,
        module,
        codeId: code.id,
        message: 'Ce code etait annule et sera reactive'
      };
    }

    // Statut reserve - OK
    return {
      valid: true,
      reserved: true,
      module,
      codeId: code.id,
      message: 'Code-barre pre-imprime disponible'
    };
  }

  /**
   * Detecter le module a partir du code-barre
   */
  detectModuleFromCode(codeBarre) {
    const prefixMap = {
      'USA': 'utilisateur',
      'JEU': 'jeu',
      'LIV': 'livre',
      'FLM': 'film',
      'DSQ': 'disque',
      'MUS': 'disque' // Ancien format
    };

    // Essayer de detecter par le prefix (3 premiers caracteres)
    const prefix = codeBarre.substring(0, 3).toUpperCase();
    if (prefixMap[prefix]) {
      return prefixMap[prefix];
    }

    // Essayer avec des prefixes personnalises depuis la BDD
    // (asynchrone, a gerer differemment si necessaire)
    return null;
  }

  /**
   * Assigner un code a une entite
   */
  async assignCode(module, codeBarre, entityId) {
    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    const entityIdField = ENTITY_ID_FIELDS[module];

    // Chercher le code
    const code = await CodeModel.findOne({
      where: { code_barre: codeBarre }
    });

    if (code) {
      if (code.statut === 'utilise') {
        throw new Error('Ce code est deja utilise');
      }
      if (code.statut === 'grille') {
        throw new Error('Ce code a ete grille');
      }

      // Marquer comme utilise
      code.statut = 'utilise';
      code[entityIdField] = entityId;
      code.date_utilisation = new Date();
      await code.save();

      // Mettre a jour les stats du lot
      if (code.lot_id) {
        await LotCodesBarres.increment('nb_utilises', {
          where: { id: code.lot_id }
        });

        // Verifier si le lot est complet
        const lot = await LotCodesBarres.findByPk(code.lot_id);
        if (lot) {
          await lot.checkCompletion();
        }
      }

      return code;
    }

    // Code non pre-imprime - creer l'enregistrement pour tracabilite
    return await CodeModel.create({
      code_barre: codeBarre,
      statut: 'utilise',
      [entityIdField]: entityId,
      date_reservation: new Date(),
      date_utilisation: new Date()
    });
  }

  /**
   * Verifier si un code existe deja ou est reserve
   */
  async isCodeReservedOrUsed(module, codeBarre) {
    const CodeModel = CODE_MODELS[module];
    if (!CodeModel) {
      throw new Error(`Module inconnu: ${module}`);
    }

    const code = await CodeModel.findOne({
      where: {
        code_barre: codeBarre,
        statut: { [Op.in]: ['reserve', 'utilise'] }
      }
    });

    return !!code;
  }

  /**
   * Marquer un lot comme imprime et incrementer le compteur de reimpressions
   */
  async markLotPrinted(lotId, isReprint = false) {
    const lot = await LotCodesBarres.findByPk(lotId);
    if (!lot) {
      throw new Error('Lot non trouve');
    }

    if (isReprint) {
      lot.nb_reimpressions += 1;
    } else {
      lot.date_impression = new Date();
    }

    await lot.save();
    return lot;
  }
}

module.exports = new CodeBarreService();
