/**
 * Tests unitaires pour le controleur des codes-barres reserves
 */

// Mock du logger pour eviter les logs pendant les tests
jest.mock('../../../backend/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock du service
const mockCodeBarreService = {
  getParametres: jest.fn(),
  updateParametres: jest.fn(),
  reserveCodes: jest.fn(),
  getLots: jest.fn(),
  getLotDetails: jest.fn(),
  cancelLot: jest.fn(),
  cancelCode: jest.fn(),
  restoreCode: jest.fn(),
  validateScannedCode: jest.fn(),
  assignCode: jest.fn(),
  getAvailableCodes: jest.fn(),
  markLotPrinted: jest.fn(),
  generatePreview: jest.fn()
};

// Mock du pdfService
const mockPdfService = {
  generateBarcodeLabels: jest.fn()
};

// Mock du models
jest.mock('../../../backend/models', () => ({
  ParametresCodesBarres: {
    TOKENS: {
      PREFIX: '{PREFIX}',
      ANNEE_LONGUE: '{ANNEE_LONGUE}',
      NUMERO_SEQUENCE_8: '{NUMERO_SEQUENCE_8}'
    }
  }
}));

jest.mock('../../../backend/services/codeBarreService', () => mockCodeBarreService);
jest.mock('../../../backend/services/pdfService', () => mockPdfService);

const controller = require('../../../backend/controllers/codesBarresReservesController');

describe('CodesBarresReservesController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {},
      query: {},
      user: { id: 1, role: 'administrateur' }
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('getParametres', () => {
    it('devrait retourner les parametres pour un module valide', async () => {
      req.params.module = 'jeu';
      const mockParams = {
        module: 'jeu',
        format_pattern: '{PREFIX}{NUMERO_SEQUENCE_8}',
        prefix: 'JEU',
        sequence_reset: 'never',
        current_sequence: 100,
        current_period: null,
        griller_annules: false,
        format_locked: false
      };

      mockCodeBarreService.getParametres.mockResolvedValue(mockParams);

      await controller.getParametres(req, res);

      expect(mockCodeBarreService.getParametres).toHaveBeenCalledWith('jeu');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        parametres: expect.objectContaining({
          module: 'jeu',
          format_pattern: '{PREFIX}{NUMERO_SEQUENCE_8}',
          prefix: 'JEU'
        })
      });
    });

    it('devrait retourner 400 pour un module invalide', async () => {
      req.params.module = 'invalid';

      await controller.getParametres(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Module invalide')
      }));
    });
  });

  describe('updateParametres', () => {
    it('devrait mettre a jour les parametres', async () => {
      req.params.module = 'jeu';
      req.body = {
        format_pattern: '{PREFIX}{ANNEE_COURTE}{NUMERO_SEQUENCE_6}',
        prefix: 'JX',
        sequence_reset: 'yearly',
        griller_annules: true
      };

      const mockUpdated = {
        module: 'jeu',
        format_pattern: '{PREFIX}{ANNEE_COURTE}{NUMERO_SEQUENCE_6}',
        prefix: 'JX',
        sequence_reset: 'yearly',
        griller_annules: true,
        format_locked: false
      };

      mockCodeBarreService.updateParametres.mockResolvedValue(mockUpdated);

      await controller.updateParametres(req, res);

      expect(mockCodeBarreService.updateParametres).toHaveBeenCalledWith('jeu', {
        format_pattern: req.body.format_pattern,
        prefix: req.body.prefix,
        sequence_reset: req.body.sequence_reset,
        griller_annules: req.body.griller_annules
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        parametres: expect.objectContaining({
          module: 'jeu',
          prefix: 'JX'
        })
      });
    });

    it('devrait retourner 400 si format verrouille', async () => {
      req.params.module = 'jeu';
      req.body = { format_pattern: 'new' };

      mockCodeBarreService.updateParametres.mockRejectedValue(
        new Error('Le format est verrouille')
      );

      await controller.updateParametres(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('verrouille')
      }));
    });
  });

  describe('createLot', () => {
    it('devrait creer un lot et retourner les codes', async () => {
      req.params.module = 'jeu';
      req.body = { quantite: 50 };

      const mockLot = {
        id: 1,
        quantite: 50,
        getStats: jest.fn().mockReturnValue({
          id: 1,
          quantite: 50,
          code_debut: 'JEU00000001',
          code_fin: 'JEU00000050'
        })
      };

      const mockResult = {
        lot: mockLot,
        codes: [
          { code_barre: 'JEU00000001' },
          { code_barre: 'JEU00000050' }
        ]
      };

      mockCodeBarreService.reserveCodes.mockResolvedValue(mockResult);

      await controller.createLot(req, res);

      expect(mockCodeBarreService.reserveCodes).toHaveBeenCalledWith('jeu', 50, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('50')
      }));
    });

    it('devrait valider la quantite minimale', async () => {
      req.params.module = 'jeu';
      req.body = { quantite: 0 };

      await controller.createLot(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('entre 1 et 1000')
      }));
    });

    it('devrait valider la quantite maximale', async () => {
      req.params.module = 'jeu';
      req.body = { quantite: 1001 };

      await controller.createLot(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('entre 1 et 1000')
      }));
    });
  });

  describe('getLots', () => {
    it('devrait retourner la liste des lots', async () => {
      req.params.module = 'jeu';
      req.query = { page: '1', limit: '20' };

      const mockResult = {
        lots: [
          { id: 1, quantite: 50, nb_utilises: 10, nb_annules: 2 },
          { id: 2, quantite: 100, nb_utilises: 0, nb_annules: 0 }
        ],
        total: 2,
        page: 1,
        limit: 20
      };

      mockCodeBarreService.getLots.mockResolvedValue(mockResult);

      await controller.getLots(req, res);

      expect(mockCodeBarreService.getLots).toHaveBeenCalledWith('jeu', {
        page: 1,
        limit: 20,
        statut: undefined
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        lots: mockResult.lots,
        total: 2,
        page: 1,
        limit: 20
      });
    });
  });

  describe('getLotDetails', () => {
    it('devrait retourner les details d\'un lot', async () => {
      req.params.lotId = '1';

      const mockLot = {
        id: 1,
        quantite: 50,
        codes: [{ code_barre: 'JEU00000001' }]
      };

      mockCodeBarreService.getLotDetails.mockResolvedValue(mockLot);

      await controller.getLotDetails(req, res);

      expect(mockCodeBarreService.getLotDetails).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        lot: mockLot
      });
    });

    it('devrait retourner 404 si lot non trouve', async () => {
      req.params.lotId = '999';

      mockCodeBarreService.getLotDetails.mockRejectedValue(
        new Error('Lot non trouve')
      );

      await controller.getLotDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cancelLot', () => {
    it('devrait annuler un lot', async () => {
      req.params.lotId = '1';

      const mockResult = {
        lot: { id: 1, statut: 'annule' },
        nb_codes_annules: 38
      };

      mockCodeBarreService.cancelLot.mockResolvedValue(mockResult);

      await controller.cancelLot(req, res);

      expect(mockCodeBarreService.cancelLot).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('38')
      }));
    });
  });

  describe('cancelCode', () => {
    it('devrait annuler un code individuel', async () => {
      req.params.module = 'jeu';
      req.params.codeId = '1';

      const mockCode = {
        id: 1,
        code_barre: 'JEU00000001',
        statut: 'annule'
      };

      mockCodeBarreService.cancelCode.mockResolvedValue(mockCode);

      await controller.cancelCode(req, res);

      expect(mockCodeBarreService.cancelCode).toHaveBeenCalledWith('jeu', 1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('JEU00000001')
      }));
    });
  });

  describe('restoreCode', () => {
    it('devrait restaurer un code annule', async () => {
      req.params.module = 'jeu';
      req.params.codeId = '1';

      const mockCode = {
        id: 1,
        code_barre: 'JEU00000001',
        statut: 'reserve'
      };

      mockCodeBarreService.restoreCode.mockResolvedValue(mockCode);

      await controller.restoreCode(req, res);

      expect(mockCodeBarreService.restoreCode).toHaveBeenCalledWith('jeu', 1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('restaure')
      }));
    });
  });

  describe('validateScannedCode', () => {
    it('devrait valider un code scanne', async () => {
      req.body = { code_barre: 'JEU00000001' };

      const mockResult = {
        valid: true,
        module: 'jeu',
        preReserve: true,
        statut: 'reserve'
      };

      mockCodeBarreService.validateScannedCode.mockResolvedValue(mockResult);

      await controller.validateScannedCode(req, res);

      expect(mockCodeBarreService.validateScannedCode).toHaveBeenCalledWith('JEU00000001');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('devrait retourner 400 si code manquant', async () => {
      req.body = {};

      await controller.validateScannedCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('requis')
      }));
    });
  });

  describe('assignCode', () => {
    it('devrait assigner un code a une entite', async () => {
      req.params.module = 'jeu';
      req.body = { code_barre: 'JEU00000001', entity_id: 5 };

      const mockCode = {
        id: 1,
        code_barre: 'JEU00000001',
        statut: 'utilise'
      };

      mockCodeBarreService.assignCode.mockResolvedValue(mockCode);

      await controller.assignCode(req, res);

      expect(mockCodeBarreService.assignCode).toHaveBeenCalledWith('jeu', 'JEU00000001', 5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('assigne')
      }));
    });

    it('devrait retourner 400 si code_barre manquant', async () => {
      req.params.module = 'jeu';
      req.body = { entity_id: 5 };

      await controller.assignCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devrait retourner 400 si entity_id manquant', async () => {
      req.params.module = 'jeu';
      req.body = { code_barre: 'JEU00000001' };

      await controller.assignCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('printLot', () => {
    it('devrait generer un PDF et le retourner', async () => {
      req.params.lotId = '1';
      req.body = {};

      const mockLot = {
        id: 1,
        quantite: 10,
        statut: 'actif',
        codes: [
          { code_barre: 'JEU00000001' },
          { code_barre: 'JEU00000002' }
        ]
      };

      const mockPdfBuffer = Buffer.from('PDF content');

      mockCodeBarreService.getLotDetails.mockResolvedValue(mockLot);
      mockPdfService.generateBarcodeLabels.mockResolvedValue(mockPdfBuffer);
      mockCodeBarreService.markLotPrinted.mockResolvedValue(true);

      await controller.printLot(req, res);

      expect(mockPdfService.generateBarcodeLabels).toHaveBeenCalledWith(mockLot);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('devrait refuser d\'imprimer un lot annule', async () => {
      req.params.lotId = '1';

      mockCodeBarreService.getLotDetails.mockResolvedValue({
        id: 1,
        statut: 'annule'
      });

      await controller.printLot(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('annule')
      }));
    });
  });

  describe('getTokens', () => {
    it('devrait retourner la liste des tokens de format', async () => {
      await controller.getTokens(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        tokens: expect.arrayContaining([
          expect.objectContaining({
            key: 'PREFIX',
            token: '{PREFIX}',
            description: expect.any(String),
            example: expect.any(String)
          })
        ])
      });
    });
  });

  describe('getStats', () => {
    it('devrait retourner les stats de tous les modules', async () => {
      const mockParams = { prefix: 'JEU', format_locked: false, current_sequence: 100 };
      const mockLotsResult = { lots: [{ quantite: 50, nb_utilises: 10, nb_annules: 5 }], total: 1 };
      const mockAvailableResult = { total: 35 };

      mockCodeBarreService.getParametres.mockResolvedValue(mockParams);
      mockCodeBarreService.getLots.mockResolvedValue(mockLotsResult);
      mockCodeBarreService.getAvailableCodes.mockResolvedValue(mockAvailableResult);

      await controller.getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: expect.objectContaining({
          jeu: expect.objectContaining({
            prefix: 'JEU',
            total_codes: 50,
            total_utilises: 10,
            total_annules: 5
          })
        })
      });
    });
  });

  describe('generatePreview', () => {
    it('devrait retourner un apercu du format', async () => {
      req.params.module = 'jeu';

      mockCodeBarreService.generatePreview.mockResolvedValue('JEU00000101');

      await controller.generatePreview(req, res);

      expect(mockCodeBarreService.generatePreview).toHaveBeenCalledWith('jeu');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        preview: 'JEU00000101'
      });
    });
  });

  describe('getAllParametres', () => {
    it('devrait retourner les parametres de tous les modules', async () => {
      const mockParams = {
        format_pattern: '{PREFIX}{NUMERO_SEQUENCE_8}',
        prefix: 'JEU',
        sequence_reset: 'never',
        current_sequence: 0,
        griller_annules: false,
        format_locked: false
      };

      mockCodeBarreService.getParametres.mockResolvedValue(mockParams);

      await controller.getAllParametres(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        parametres: expect.objectContaining({
          jeu: expect.any(Object),
          livre: expect.any(Object),
          film: expect.any(Object),
          disque: expect.any(Object),
          utilisateur: expect.any(Object)
        })
      });
    });
  });

  describe('getAvailableCodes', () => {
    it('devrait retourner les codes disponibles', async () => {
      req.params.module = 'jeu';
      req.query = { page: '1', limit: '50' };

      const mockResult = {
        codes: [{ id: 1, code_barre: 'JEU00000001', statut: 'reserve' }],
        total: 1,
        page: 1,
        limit: 50
      };

      mockCodeBarreService.getAvailableCodes.mockResolvedValue(mockResult);

      await controller.getAvailableCodes(req, res);

      expect(mockCodeBarreService.getAvailableCodes).toHaveBeenCalledWith('jeu', {
        page: 1,
        limit: 50
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });
  });
});
