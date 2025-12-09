/**
 * Tests unitaires pour le service de codes-barres
 * Tests des fonctions utilitaires et de detection
 */

describe('CodeBarreService', () => {
  // Nous testons principalement les fonctions pures et la logique de detection
  // Les tests d'integration avec la BDD sont faits separement

  describe('getCurrentPeriod', () => {
    // Import dynamique pour eviter les problemes de mock
    let codeBarreService;

    beforeAll(() => {
      // Mock minimal des models
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: {
          getOrCreateForModule: jest.fn()
        },
        LotCodesBarres: {},
        CodeBarreJeu: {},
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: {
          transaction: jest.fn()
        }
      }));

      codeBarreService = require('../../../backend/services/codeBarreService');
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('devrait retourner null pour never', () => {
      const result = codeBarreService.getCurrentPeriod('never');
      expect(result).toBeNull();
    });

    it('devrait retourner l\'annee pour yearly', () => {
      const result = codeBarreService.getCurrentPeriod('yearly');
      const expected = new Date().getFullYear().toString();
      expect(result).toBe(expected);
    });

    it('devrait retourner annee+mois pour monthly', () => {
      const result = codeBarreService.getCurrentPeriod('monthly');
      const now = new Date();
      const expected = now.getFullYear().toString() +
                       String(now.getMonth() + 1).padStart(2, '0');
      expect(result).toBe(expected);
    });

    it('devrait retourner annee+mois+jour pour daily', () => {
      const result = codeBarreService.getCurrentPeriod('daily');
      const now = new Date();
      const expected = now.getFullYear().toString() +
                       String(now.getMonth() + 1).padStart(2, '0') +
                       String(now.getDate()).padStart(2, '0');
      expect(result).toBe(expected);
    });
  });

  describe('detectModuleFromCode', () => {
    let codeBarreService;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: {
          getOrCreateForModule: jest.fn()
        },
        LotCodesBarres: {},
        CodeBarreJeu: {},
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: {
          transaction: jest.fn()
        }
      }));

      codeBarreService = require('../../../backend/services/codeBarreService');
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('devrait detecter le module jeu', () => {
      expect(codeBarreService.detectModuleFromCode('JEU00000001')).toBe('jeu');
    });

    it('devrait detecter le module jeu en minuscules', () => {
      expect(codeBarreService.detectModuleFromCode('jeu00000001')).toBe('jeu');
    });

    it('devrait detecter le module livre', () => {
      expect(codeBarreService.detectModuleFromCode('LIV00000001')).toBe('livre');
    });

    it('devrait detecter le module film', () => {
      expect(codeBarreService.detectModuleFromCode('FLM00000001')).toBe('film');
    });

    it('devrait detecter le module disque', () => {
      expect(codeBarreService.detectModuleFromCode('DSQ00000001')).toBe('disque');
    });

    it('devrait detecter le module disque avec ancien prefix MUS', () => {
      expect(codeBarreService.detectModuleFromCode('MUS00000001')).toBe('disque');
    });

    it('devrait detecter le module utilisateur', () => {
      expect(codeBarreService.detectModuleFromCode('USA00000001')).toBe('utilisateur');
    });

    it('devrait retourner null pour un code avec prefix inconnu', () => {
      expect(codeBarreService.detectModuleFromCode('XXX00000001')).toBeNull();
    });

    it('devrait retourner null pour un code trop court', () => {
      expect(codeBarreService.detectModuleFromCode('AB')).toBeNull();
    });
  });

  describe('Validation des modules', () => {
    let codeBarreService;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: {
          getOrCreateForModule: jest.fn()
        },
        LotCodesBarres: {},
        CodeBarreJeu: {},
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: {
          transaction: jest.fn()
        }
      }));

      codeBarreService = require('../../../backend/services/codeBarreService');
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('devrait lever une erreur pour un module inconnu lors de getAvailableCodes', async () => {
      await expect(codeBarreService.getAvailableCodes('invalid'))
        .rejects.toThrow('Module inconnu');
    });

    it('devrait lever une erreur pour un module inconnu lors de assignCode', async () => {
      await expect(codeBarreService.assignCode('invalid', 'XXX00000001', 1))
        .rejects.toThrow('Module inconnu');
    });

    it('devrait lever une erreur pour un module inconnu lors de isCodeReservedOrUsed', async () => {
      await expect(codeBarreService.isCodeReservedOrUsed('invalid', 'XXX00000001'))
        .rejects.toThrow('Module inconnu');
    });
  });

  describe('Validation code scanne', () => {
    let codeBarreService;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: {
          getOrCreateForModule: jest.fn()
        },
        LotCodesBarres: {},
        CodeBarreJeu: { findOne: jest.fn().mockResolvedValue(null) },
        CodeBarreLivre: { findOne: jest.fn().mockResolvedValue(null) },
        CodeBarreFilm: { findOne: jest.fn().mockResolvedValue(null) },
        CodeBarreDisque: { findOne: jest.fn().mockResolvedValue(null) },
        CodeBarreUtilisateur: { findOne: jest.fn().mockResolvedValue(null) },
        sequelize: {
          transaction: jest.fn()
        }
      }));

      codeBarreService = require('../../../backend/services/codeBarreService');
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('devrait retourner valid=false pour un code de module inconnu', async () => {
      const result = await codeBarreService.validateScannedCode('XXX00000001');

      expect(result.valid).toBe(false);
      expect(result.module).toBeNull();
      expect(result.message).toContain('non reconnu');
    });

    it('devrait retourner valid=true avec warning pour code non pre-imprime', async () => {
      const result = await codeBarreService.validateScannedCode('JEU00000001');

      expect(result.valid).toBe(true);
      expect(result.reserved).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.module).toBe('jeu');
    });
  });

  describe('Validation code avec mocks pour differents statuts', () => {
    afterEach(() => {
      jest.resetModules();
    });

    it('devrait valider un code reserve', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'reserve',
            lot_id: 1
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      const result = await codeBarreService.validateScannedCode('JEU00000001');

      expect(result.valid).toBe(true);
      expect(result.reserved).toBe(true);
      expect(result.module).toBe('jeu');
    });

    it('devrait refuser un code deja utilise', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'utilise',
            jeu_id: 5
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      const result = await codeBarreService.validateScannedCode('JEU00000001');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('deja utilise');
    });

    it('devrait refuser un code grille', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'grille'
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      const result = await codeBarreService.validateScannedCode('JEU00000001');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('grille');
    });

    it('devrait permettre la reutilisation d\'un code annule', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'annule'
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      const result = await codeBarreService.validateScannedCode('JEU00000001');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('reactive');
    });
  });

  describe('assignCode avec mocks', () => {
    afterEach(() => {
      jest.resetModules();
    });

    it('devrait marquer un code reserve comme utilise', async () => {
      const mockCode = {
        id: 1,
        code_barre: 'JEU00000001',
        statut: 'reserve',
        lot_id: 1,
        jeu_id: null,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockLot = {
        id: 1,
        checkCompletion: jest.fn().mockResolvedValue(true)
      };

      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {
          findByPk: jest.fn().mockResolvedValue(mockLot),
          increment: jest.fn().mockResolvedValue(true)
        },
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue(mockCode)
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      const result = await codeBarreService.assignCode('jeu', 'JEU00000001', 5);

      expect(mockCode.statut).toBe('utilise');
      expect(mockCode.jeu_id).toBe(5);
      expect(mockCode.save).toHaveBeenCalled();
    });

    it('devrait refuser d\'assigner un code deja utilise', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'utilise',
            jeu_id: 3
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');

      await expect(codeBarreService.assignCode('jeu', 'JEU00000001', 5))
        .rejects.toThrow('deja utilise');
    });

    it('devrait refuser d\'assigner un code grille', async () => {
      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            code_barre: 'JEU00000001',
            statut: 'grille'
          })
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');

      await expect(codeBarreService.assignCode('jeu', 'JEU00000001', 5))
        .rejects.toThrow('grille');
    });

    it('devrait creer un enregistrement pour un code non reserve', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 2,
        code_barre: 'JEU99999999',
        statut: 'utilise',
        jeu_id: 5
      });

      jest.doMock('../../../backend/models', () => ({
        ParametresCodesBarres: { getOrCreateForModule: jest.fn() },
        LotCodesBarres: {},
        CodeBarreJeu: {
          findOne: jest.fn().mockResolvedValue(null),
          create: mockCreate
        },
        CodeBarreLivre: {},
        CodeBarreFilm: {},
        CodeBarreDisque: {},
        CodeBarreUtilisateur: {},
        sequelize: { transaction: jest.fn() }
      }));

      const codeBarreService = require('../../../backend/services/codeBarreService');
      await codeBarreService.assignCode('jeu', 'JEU99999999', 5);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        code_barre: 'JEU99999999',
        statut: 'utilise',
        jeu_id: 5
      }));
    });
  });
});
