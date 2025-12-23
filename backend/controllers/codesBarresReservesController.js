/**
 * Controller pour la gestion des codes-barres reserves
 */

const codeBarreService = require('../services/codeBarreService');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');

// Modules autorises
const VALID_MODULES = ['utilisateur', 'jeu', 'livre', 'film', 'disque'];

/**
 * Valider le parametre module
 */
const validateModule = (module) => {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(`Module invalide: ${module}. Valeurs acceptees: ${VALID_MODULES.join(', ')}`);
  }
};

/**
 * Extraire le contexte depuis la requete (query params)
 */
const extractContext = (req) => {
  const { organisation_id, structure_id, groupe_id } = req.query;
  return {
    organisation_id: organisation_id ? parseInt(organisation_id) : null,
    structure_id: structure_id ? parseInt(structure_id) : null,
    groupe_id: groupe_id ? parseInt(groupe_id) : null
  };
};

/**
 * GET /api/codes-barres-reserves/parametres/:module
 * Obtenir les parametres de format pour un module
 * Query params: organisation_id, structure_id, groupe_id
 */
exports.getParametres = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const context = extractContext(req);
    const params = await codeBarreService.getParametres(module, context);

    res.json({
      success: true,
      parametres: {
        module: params.module,
        format_pattern: params.format_pattern,
        prefix: params.prefix,
        sequence_reset: params.sequence_reset,
        current_sequence: params.current_sequence,
        current_period: params.current_period,
        griller_annules: params.griller_annules,
        format_locked: params.format_locked,
        organisation_id: params.organisation_id,
        structure_id: params.structure_id,
        groupe_id: params.groupe_id
      }
    });
  } catch (error) {
    logger.error('Erreur getParametres:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /api/codes-barres-reserves/parametres/:module
 * Mettre a jour les parametres de format
 * Query params: organisation_id, structure_id, groupe_id
 */
exports.updateParametres = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const context = extractContext(req);
    const { format_pattern, prefix, sequence_reset, griller_annules } = req.body;

    const params = await codeBarreService.updateParametres(module, {
      format_pattern,
      prefix,
      sequence_reset,
      griller_annules
    }, context);

    logger.info(`Parametres codes-barres mis a jour pour ${module}`, {
      userId: req.user?.id,
      module,
      context
    });

    res.json({
      success: true,
      parametres: {
        module: params.module,
        format_pattern: params.format_pattern,
        prefix: params.prefix,
        sequence_reset: params.sequence_reset,
        griller_annules: params.griller_annules,
        format_locked: params.format_locked,
        organisation_id: params.organisation_id,
        structure_id: params.structure_id,
        groupe_id: params.groupe_id
      }
    });
  } catch (error) {
    logger.error('Erreur updateParametres:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/preview/:module
 * Obtenir un apercu du format
 */
exports.generatePreview = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const preview = await codeBarreService.generatePreview(module);

    res.json({
      success: true,
      preview
    });
  } catch (error) {
    logger.error('Erreur generatePreview:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/parametres
 * Obtenir les parametres de tous les modules
 * Query params: organisation_id, structure_id, groupe_id
 */
exports.getAllParametres = async (req, res) => {
  try {
    const context = extractContext(req);
    const parametres = {};

    for (const module of VALID_MODULES) {
      const params = await codeBarreService.getParametres(module, context);
      parametres[module] = {
        format_pattern: params.format_pattern,
        prefix: params.prefix,
        sequence_reset: params.sequence_reset,
        current_sequence: params.current_sequence,
        current_period: params.current_period,
        griller_annules: params.griller_annules,
        format_locked: params.format_locked,
        organisation_id: params.organisation_id,
        structure_id: params.structure_id,
        groupe_id: params.groupe_id
      };
    }

    res.json({
      success: true,
      parametres
    });
  } catch (error) {
    logger.error('Erreur getAllParametres:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/codes-barres-reserves/lots/:module
 * Creer un nouveau lot de codes-barres
 */
exports.createLot = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const { quantite } = req.body;
    const creatorId = req.user.id;

    if (!quantite || quantite < 1 || quantite > 1000) {
      return res.status(400).json({
        success: false,
        message: 'La quantite doit etre entre 1 et 1000'
      });
    }

    const result = await codeBarreService.reserveCodes(module, quantite, creatorId);

    logger.info(`Lot de ${quantite} codes-barres cree pour ${module}`, {
      userId: creatorId,
      module,
      lotId: result.lot.id
    });

    res.status(201).json({
      success: true,
      message: `${quantite} codes-barres reserves avec succes`,
      lot: result.lot.getStats(),
      codes: result.codes
    });
  } catch (error) {
    logger.error('Erreur createLot:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/lots/:module
 * Obtenir la liste des lots d'un module
 */
exports.getLots = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const { page = 1, limit = 20, statut } = req.query;

    const result = await codeBarreService.getLots(module, {
      page: parseInt(page),
      limit: parseInt(limit),
      statut
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Erreur getLots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/lots/detail/:lotId
 * Obtenir le detail d'un lot
 */
exports.getLotDetails = async (req, res) => {
  try {
    const { lotId } = req.params;

    const lot = await codeBarreService.getLotDetails(parseInt(lotId));

    res.json({
      success: true,
      lot
    });
  } catch (error) {
    logger.error('Erreur getLotDetails:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/codes-barres-reserves/lots/:lotId/print
 * Generer le PDF pour impression d'un lot
 */
exports.printLot = async (req, res) => {
  try {
    const { lotId } = req.params;
    const { reprint = false } = req.body;

    const lot = await codeBarreService.getLotDetails(parseInt(lotId));

    if (lot.statut === 'annule') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'imprimer un lot annule'
      });
    }

    // Generer le PDF
    const pdfBuffer = await pdfService.generateBarcodeLabels(lot);

    // Marquer le lot comme imprime
    await codeBarreService.markLotPrinted(parseInt(lotId), reprint);

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiquettes-lot-${lotId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Erreur printLot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/codes-barres-reserves/lots/:lotId
 * Annuler un lot
 */
exports.cancelLot = async (req, res) => {
  try {
    const { lotId } = req.params;

    const result = await codeBarreService.cancelLot(parseInt(lotId));

    logger.info(`Lot ${lotId} annule`, {
      userId: req.user?.id,
      lotId,
      nbCodesAnnules: result.nb_codes_annules
    });

    res.json({
      success: true,
      message: `Lot annule. ${result.nb_codes_annules} codes ont ete annules.`,
      lot: result.lot
    });
  } catch (error) {
    logger.error('Erreur cancelLot:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/codes-barres-reserves/codes/:module/:codeId
 * Annuler un code individuel
 */
exports.cancelCode = async (req, res) => {
  try {
    const { module, codeId } = req.params;
    validateModule(module);

    const code = await codeBarreService.cancelCode(module, parseInt(codeId));

    logger.info(`Code ${code.code_barre} annule`, {
      userId: req.user?.id,
      module,
      codeId
    });

    res.json({
      success: true,
      message: `Code ${code.code_barre} annule`,
      code: {
        id: code.id,
        code_barre: code.code_barre,
        statut: code.statut
      }
    });
  } catch (error) {
    logger.error('Erreur cancelCode:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/codes-barres-reserves/codes/:module/:codeId/restore
 * Restaurer un code annule
 */
exports.restoreCode = async (req, res) => {
  try {
    const { module, codeId } = req.params;
    validateModule(module);

    const code = await codeBarreService.restoreCode(module, parseInt(codeId));

    logger.info(`Code ${code.code_barre} restaure`, {
      userId: req.user?.id,
      module,
      codeId
    });

    res.json({
      success: true,
      message: `Code ${code.code_barre} restaure`,
      code: {
        id: code.id,
        code_barre: code.code_barre,
        statut: code.statut
      }
    });
  } catch (error) {
    logger.error('Erreur restoreCode:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/disponibles/:module
 * Obtenir les codes disponibles (reserves) d'un module
 */
exports.getAvailableCodes = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const { page = 1, limit = 50 } = req.query;

    const result = await codeBarreService.getAvailableCodes(module, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Erreur getAvailableCodes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/codes-barres-reserves/validate
 * Valider un code scanne
 */
exports.validateScannedCode = async (req, res) => {
  try {
    const { code_barre } = req.body;

    if (!code_barre) {
      return res.status(400).json({
        success: false,
        message: 'Code-barre requis'
      });
    }

    const result = await codeBarreService.validateScannedCode(code_barre);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Erreur validateScannedCode:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/codes-barres-reserves/assign/:module
 * Assigner un code a une entite
 */
exports.assignCode = async (req, res) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const { code_barre, entity_id } = req.body;

    if (!code_barre || !entity_id) {
      return res.status(400).json({
        success: false,
        message: 'code_barre et entity_id requis'
      });
    }

    const code = await codeBarreService.assignCode(module, code_barre, entity_id);

    logger.info(`Code ${code_barre} assigne a ${module} ${entity_id}`, {
      userId: req.user?.id,
      module,
      codeBarre: code_barre,
      entityId: entity_id
    });

    res.json({
      success: true,
      message: `Code ${code_barre} assigne avec succes`,
      code: {
        id: code.id,
        code_barre: code.code_barre,
        statut: code.statut
      }
    });
  } catch (error) {
    logger.error('Erreur assignCode:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/tokens
 * Obtenir la liste des tokens disponibles pour le format
 */
exports.getTokens = async (req, res) => {
  try {
    const { ParametresCodesBarres } = require('../models');
    const tokens = ParametresCodesBarres.TOKENS;

    const tokenList = Object.entries(tokens).map(([key, value]) => {
      let description = '';
      let example = '';
      const now = new Date();

      switch (key) {
        case 'PREFIX':
          description = 'Prefixe du module (ex: JEU, LIV)';
          example = 'JEU';
          break;
        case 'ANNEE_LONGUE':
          description = 'Annee sur 4 chiffres';
          example = now.getFullYear().toString();
          break;
        case 'ANNEE_COURTE':
          description = 'Annee sur 2 chiffres';
          example = now.getFullYear().toString().slice(-2);
          break;
        case 'MOIS_LONG':
          description = 'Mois sur 2 chiffres';
          example = String(now.getMonth() + 1).padStart(2, '0');
          break;
        case 'MOIS_COURT':
          description = 'Mois sans zero';
          example = String(now.getMonth() + 1);
          break;
        case 'JOUR_LONG':
          description = 'Jour sur 2 chiffres';
          example = String(now.getDate()).padStart(2, '0');
          break;
        case 'JOUR_COURT':
          description = 'Jour sans zero';
          example = String(now.getDate());
          break;
        case 'NUMERO_SEQUENCE_4':
          description = 'Numero de sequence sur 4 chiffres';
          example = '0001';
          break;
        case 'NUMERO_SEQUENCE_6':
          description = 'Numero de sequence sur 6 chiffres';
          example = '000001';
          break;
        case 'NUMERO_SEQUENCE_8':
          description = 'Numero de sequence sur 8 chiffres';
          example = '00000001';
          break;
        case 'NUMERO_SEQUENCE_10':
          description = 'Numero de sequence sur 10 chiffres';
          example = '0000000001';
          break;
      }

      return {
        key,
        token: value,
        description,
        example
      };
    });

    res.json({
      success: true,
      tokens: tokenList
    });
  } catch (error) {
    logger.error('Erreur getTokens:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/codes-barres-reserves/stats
 * Obtenir les statistiques globales
 */
exports.getStats = async (req, res) => {
  try {
    const stats = {};

    for (const module of VALID_MODULES) {
      const params = await codeBarreService.getParametres(module);
      const lotsResult = await codeBarreService.getLots(module, { limit: 1000 });
      const availableResult = await codeBarreService.getAvailableCodes(module, { limit: 1 });

      let totalCodes = 0;
      let totalUtilises = 0;
      let totalAnnules = 0;

      lotsResult.lots.forEach(lot => {
        totalCodes += lot.quantite;
        totalUtilises += lot.nb_utilises;
        totalAnnules += lot.nb_annules;
      });

      stats[module] = {
        prefix: params.prefix,
        format_locked: params.format_locked,
        current_sequence: params.current_sequence,
        total_lots: lotsResult.total,
        total_codes: totalCodes,
        total_utilises: totalUtilises,
        total_annules: totalAnnules,
        total_disponibles: availableResult.total
      };
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Erreur getStats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
