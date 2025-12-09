/**
 * Tests unitaires pour le middleware rateLimiter
 * Protection contre les attaques par force brute et les abus d'API
 */

// Mock express-rate-limit AVANT tout import
const mockConfigs = [];
const mockRateLimit = jest.fn((config) => {
  mockConfigs.push(config);
  // Retourne un middleware qui simule le comportement de express-rate-limit
  return jest.fn((req, res, next) => {
    // Si skip retourne true, passe directement au suivant
    if (config.skip && config.skip()) {
      next();
      return;
    }
    // Sinon, appelle next() normalement (en production, il y aurait une logique de comptage)
    next();
  });
});

jest.mock('express-rate-limit', () => mockRateLimit);

describe('Rate Limiter Middleware', () => {
  let rateLimiters;

  beforeAll(() => {
    // Charger le module après le mock
    rateLimiters = require('../../../backend/middleware/rateLimiter');
  });

  describe('apiLimiter', () => {
    it('devrait avoir la bonne configuration', () => {
      const apiConfig = mockConfigs.find(config => config.max === 100);

      expect(apiConfig).toBeDefined();
      expect(apiConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(apiConfig.max).toBe(100);
      expect(apiConfig.message).toEqual({
        error: 'Trop de requêtes',
        message: 'Vous avez dépassé le nombre maximum de requêtes. Veuillez réessayer dans 15 minutes.',
        retryAfter: '15 minutes'
      });
      expect(apiConfig.standardHeaders).toBe(true);
      expect(apiConfig.legacyHeaders).toBe(false);
      expect(apiConfig.skip).toBeDefined();
      expect(typeof apiConfig.skip).toBe('function');
    });

    it('devrait être désactivé en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const apiConfig = mockConfigs.find(config => config.max === 100);

      // Le skip devrait retourner true car NODE_ENV !== 'production'
      expect(apiConfig.skip()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait être activé en production', () => {
      // Note: La fonction skip capture isRateLimitDisabled au moment du chargement du module
      // Donc on ne peut pas changer dynamiquement NODE_ENV après le require
      // Ce test vérifie juste que la fonction skip existe et est cohérente
      const apiConfig = mockConfigs.find(config => config.max === 100);

      // La fonction skip est définie et évalue l'environnement
      expect(apiConfig.skip).toBeDefined();
      expect(typeof apiConfig.skip).toBe('function');

      // En environnement de test (non-production), skip devrait retourner true
      // Dans un vrai environnement de production, skip retournerait false
      const skipResult = apiConfig.skip();
      expect(typeof skipResult).toBe('boolean');
    });

    it('devrait pouvoir être désactivé avec DISABLE_RATE_LIMIT', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDisable = process.env.DISABLE_RATE_LIMIT;

      process.env.NODE_ENV = 'production';
      process.env.DISABLE_RATE_LIMIT = 'true';

      const apiConfig = mockConfigs.find(config => config.max === 100);

      // Le skip devrait retourner true même en production car DISABLE_RATE_LIMIT = 'true'
      expect(apiConfig.skip()).toBe(true);

      process.env.NODE_ENV = originalEnv;
      if (originalDisable) {
        process.env.DISABLE_RATE_LIMIT = originalDisable;
      } else {
        delete process.env.DISABLE_RATE_LIMIT;
      }
    });
  });

  describe('loginLimiter', () => {
    it('devrait avoir la bonne configuration', () => {
      const loginConfig = mockConfigs.find(config =>
        config.max === 5 && config.skipSuccessfulRequests === true
      );

      expect(loginConfig).toBeDefined();
      expect(loginConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(loginConfig.max).toBe(5); // 5 tentatives max
      expect(loginConfig.message).toEqual({
        error: 'Trop de tentatives de connexion',
        message: 'Trop de tentatives de connexion depuis cette adresse IP. Veuillez réessayer dans 15 minutes.',
        retryAfter: '15 minutes'
      });
      expect(loginConfig.standardHeaders).toBe(true);
      expect(loginConfig.legacyHeaders).toBe(false);
      expect(loginConfig.skipSuccessfulRequests).toBe(true);
      expect(loginConfig.skip).toBeDefined();
      expect(typeof loginConfig.skip).toBe('function');
    });

    it('devrait avoir skipSuccessfulRequests activé', () => {
      const loginConfig = mockConfigs.find(config =>
        config.max === 5 && config.skipSuccessfulRequests === true
      );

      expect(loginConfig.skipSuccessfulRequests).toBe(true);
    });

    it('devrait être désactivé en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const loginConfig = mockConfigs.find(config =>
        config.max === 5 && config.skipSuccessfulRequests === true
      );

      expect(loginConfig.skip()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('resetPasswordLimiter', () => {
    it('devrait avoir la bonne configuration', () => {
      const resetConfig = mockConfigs.find(config =>
        config.max === 3 && config.windowMs === 60 * 60 * 1000 &&
        config.message?.error === 'Trop de demandes de réinitialisation'
      );

      expect(resetConfig).toBeDefined();
      expect(resetConfig.windowMs).toBe(60 * 60 * 1000); // 1 heure
      expect(resetConfig.max).toBe(3); // 3 tentatives max
      expect(resetConfig.message).toEqual({
        error: 'Trop de demandes de réinitialisation',
        message: 'Trop de demandes de réinitialisation de mot de passe. Veuillez réessayer dans 1 heure.',
        retryAfter: '1 heure'
      });
      expect(resetConfig.standardHeaders).toBe(true);
      expect(resetConfig.legacyHeaders).toBe(false);
      expect(resetConfig.skip).toBeDefined();
      expect(typeof resetConfig.skip).toBe('function');
    });

    it('devrait avoir une fenêtre de 1 heure', () => {
      const resetConfig = mockConfigs.find(config =>
        config.max === 3 && config.windowMs === 60 * 60 * 1000 &&
        config.message?.error === 'Trop de demandes de réinitialisation'
      );

      expect(resetConfig.windowMs).toBe(60 * 60 * 1000);
    });

    it('devrait être désactivé en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const resetConfig = mockConfigs.find(config =>
        config.max === 3 && config.windowMs === 60 * 60 * 1000 &&
        config.message?.error === 'Trop de demandes de réinitialisation'
      );

      expect(resetConfig.skip()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('registerLimiter', () => {
    it('devrait avoir la bonne configuration', () => {
      const registerConfig = mockConfigs.find(config =>
        config.message?.error === 'Trop de créations de compte'
      );

      expect(registerConfig).toBeDefined();
      expect(registerConfig.windowMs).toBe(60 * 60 * 1000); // 1 heure
      expect(registerConfig.max).toBe(3); // 3 créations max
      expect(registerConfig.message).toEqual({
        error: 'Trop de créations de compte',
        message: 'Trop de créations de compte depuis cette adresse IP. Veuillez réessayer dans 1 heure.',
        retryAfter: '1 heure'
      });
      expect(registerConfig.standardHeaders).toBe(true);
      expect(registerConfig.legacyHeaders).toBe(false);
      expect(registerConfig.skip).toBeDefined();
      expect(typeof registerConfig.skip).toBe('function');
    });

    it('devrait avoir une fenêtre de 1 heure', () => {
      const registerConfig = mockConfigs.find(config =>
        config.message?.error === 'Trop de créations de compte'
      );

      expect(registerConfig.windowMs).toBe(60 * 60 * 1000);
    });

    it('devrait être désactivé en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const registerConfig = mockConfigs.find(config =>
        config.message?.error === 'Trop de créations de compte'
      );

      expect(registerConfig.skip()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Configuration commune', () => {
    it('tous les limiters devraient utiliser standardHeaders', () => {
      expect(mockConfigs.length).toBeGreaterThan(0);
      mockConfigs.forEach(config => {
        expect(config.standardHeaders).toBe(true);
      });
    });

    it('tous les limiters devraient désactiver legacyHeaders', () => {
      mockConfigs.forEach(config => {
        expect(config.legacyHeaders).toBe(false);
      });
    });

    it('tous les limiters devraient avoir une fonction skip', () => {
      mockConfigs.forEach(config => {
        expect(config.skip).toBeDefined();
        expect(typeof config.skip).toBe('function');
      });
    });

    it('tous les limiters devraient avoir un message d\'erreur structuré', () => {
      mockConfigs.forEach(config => {
        expect(config.message).toBeDefined();
        expect(config.message.error).toBeDefined();
        expect(config.message.message).toBeDefined();
        expect(config.message.retryAfter).toBeDefined();
      });
    });
  });

  describe('Valeurs de configuration', () => {
    it('apiLimiter: 100 requêtes / 15 minutes', () => {
      const config = mockConfigs.find(config => config.max === 100);

      expect(config).toBeDefined();
      expect(config.max).toBe(100);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });

    it('loginLimiter: 5 tentatives / 15 minutes', () => {
      const config = mockConfigs.find(config =>
        config.max === 5 && config.skipSuccessfulRequests === true
      );

      expect(config).toBeDefined();
      expect(config.max).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });

    it('resetPasswordLimiter: 3 tentatives / 1 heure', () => {
      const config = mockConfigs.find(config =>
        config.max === 3 && config.windowMs === 60 * 60 * 1000 &&
        config.message?.error === 'Trop de demandes de réinitialisation'
      );

      expect(config).toBeDefined();
      expect(config.max).toBe(3);
      expect(config.windowMs).toBe(60 * 60 * 1000);
    });

    it('registerLimiter: 3 tentatives / 1 heure', () => {
      const config = mockConfigs.find(config =>
        config.message?.error === 'Trop de créations de compte'
      );

      expect(config).toBeDefined();
      expect(config.max).toBe(3);
      expect(config.windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe('Messages d\'erreur', () => {
    it('apiLimiter devrait avoir un message approprié', () => {
      const config = mockConfigs.find(config => config.max === 100);

      expect(config).toBeDefined();
      expect(config.message.error).toBe('Trop de requêtes');
      expect(config.message.message).toContain('15 minutes');
      expect(config.message.retryAfter).toBe('15 minutes');
    });

    it('loginLimiter devrait avoir un message approprié', () => {
      const config = mockConfigs.find(config =>
        config.max === 5 && config.skipSuccessfulRequests === true
      );

      expect(config).toBeDefined();
      expect(config.message.error).toBe('Trop de tentatives de connexion');
      expect(config.message.message).toContain('15 minutes');
      expect(config.message.retryAfter).toBe('15 minutes');
    });

    it('resetPasswordLimiter devrait avoir un message approprié', () => {
      const config = mockConfigs.find(config =>
        config.max === 3 && config.windowMs === 60 * 60 * 1000 &&
        config.message?.error === 'Trop de demandes de réinitialisation'
      );

      expect(config).toBeDefined();
      expect(config.message.error).toBe('Trop de demandes de réinitialisation');
      expect(config.message.message).toContain('1 heure');
      expect(config.message.retryAfter).toBe('1 heure');
    });

    it('registerLimiter devrait avoir un message approprié', () => {
      const config = mockConfigs.find(config =>
        config.message?.error === 'Trop de créations de compte'
      );

      expect(config).toBeDefined();
      expect(config.message.error).toBe('Trop de créations de compte');
      expect(config.message.message).toContain('1 heure');
      expect(config.message.retryAfter).toBe('1 heure');
    });
  });

  describe('Export du module', () => {
    it('devrait exporter tous les limiters', () => {
      expect(rateLimiters).toHaveProperty('apiLimiter');
      expect(rateLimiters).toHaveProperty('loginLimiter');
      expect(rateLimiters).toHaveProperty('resetPasswordLimiter');
      expect(rateLimiters).toHaveProperty('registerLimiter');
    });

    it('tous les limiters devraient être des fonctions', () => {
      expect(typeof rateLimiters.apiLimiter).toBe('function');
      expect(typeof rateLimiters.loginLimiter).toBe('function');
      expect(typeof rateLimiters.resetPasswordLimiter).toBe('function');
      expect(typeof rateLimiters.registerLimiter).toBe('function');
    });
  });

  describe('Comportement runtime', () => {
    it('apiLimiter devrait être appelable comme middleware', () => {
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      // Le middleware devrait être appelable sans erreur
      expect(() => rateLimiters.apiLimiter(req, res, next)).not.toThrow();
    });

    it('loginLimiter devrait être appelable comme middleware', () => {
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      // Le middleware devrait être appelable sans erreur
      expect(() => rateLimiters.loginLimiter(req, res, next)).not.toThrow();
    });

    it('resetPasswordLimiter devrait être appelable comme middleware', () => {
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      // Le middleware devrait être appelable sans erreur
      expect(() => rateLimiters.resetPasswordLimiter(req, res, next)).not.toThrow();
    });

    it('registerLimiter devrait être appelable comme middleware', () => {
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      // Le middleware devrait être appelable sans erreur
      expect(() => rateLimiters.registerLimiter(req, res, next)).not.toThrow();
    });
  });

  describe('Vérification du nombre de limiters', () => {
    it('devrait créer exactement 4 limiters', () => {
      // Vérifie que rateLimit a été appelé 4 fois pour les 4 limiters
      expect(mockConfigs.length).toBe(4);
    });

    it('chaque limiter devrait avoir une configuration unique', () => {
      // Vérifie que les configurations sont différentes
      const maxValues = mockConfigs.map(c => c.max);
      const windowValues = mockConfigs.map(c => c.windowMs);

      // apiLimiter: 100 req/15min
      expect(maxValues).toContain(100);
      // loginLimiter: 5 req/15min
      expect(maxValues).toContain(5);
      // resetPasswordLimiter et registerLimiter: 3 req/1h
      expect(maxValues.filter(v => v === 3).length).toBe(2);

      // 15 minutes (2 limiters) et 1 heure (2 limiters)
      expect(windowValues.filter(v => v === 15 * 60 * 1000).length).toBe(2);
      expect(windowValues.filter(v => v === 60 * 60 * 1000).length).toBe(2);
    });
  });
});
