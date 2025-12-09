/**
 * Tests unitaires pour le middleware usagerAuth
 * Verification JWT et authentification pour les usagers
 */

const jwt = require('jsonwebtoken');
const { authUsager, optionalAuthUsager } = require('../../../backend/middleware/usagerAuth');
const { Utilisateur } = require('../../../backend/models');

// Mock des modules
jest.mock('jsonwebtoken');
jest.mock('../../../backend/models', () => ({
  Utilisateur: {
    findByPk: jest.fn()
  }
}));

// Mock console.error pour eviter le bruit dans les tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Helper pour creer des mocks req/res/next
const createMocks = (authHeader = null) => {
  const req = {
    headers: {}
  };

  if (authHeader !== null) {
    req.headers.authorization = authHeader;
  }

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();

  return { req, res, next };
};

describe('authUsager Middleware', () => {
  const mockUsager = {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    role: 'usager',
    statut: 'actif'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes';
  });

  describe('Token valide', () => {
    it('devrait authentifier avec un token Bearer valide', async () => {
      const { req, res, next } = createMocks('Bearer valid-token-123');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue(mockUsager);

      await authUsager(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token-123', 'test-secret-key-for-testing-purposes');
      expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
      expect(req.usager).toEqual(mockUsager);
      expect(req.usagerId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait ajouter usager et usagerId a la requete', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 42 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, id: 42 });

      await authUsager(req, res, next);

      expect(req.usager).toBeDefined();
      expect(req.usagerId).toBe(42);
      expect(req.usager.id).toBe(42);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token manquant', () => {
    it('devrait retourner 401 si aucun token fourni', async () => {
      const { req, res, next } = createMocks();

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Non authentifie',
        message: 'Token manquant ou invalide'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si format Authorization invalide (sans Bearer)', async () => {
      const { req, res, next } = createMocks('just-a-token');

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Non authentifie',
        message: 'Token manquant ou invalide'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si Authorization vide', async () => {
      const { req, res, next } = createMocks('');

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Non authentifie',
        message: 'Token manquant ou invalide'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si Authorization est "Bearer " sans token', async () => {
      const { req, res, next } = createMocks('Bearer ');

      // jwt.verify avec une string vide lance une erreur JsonWebTokenError
      const jwtError = new Error('jwt must be provided');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token invalide',
        message: 'Veuillez vous reconnecter'
      });
    });
  });

  describe('Token expire', () => {
    it('devrait retourner 401 avec message approprie pour token expire', async () => {
      const { req, res, next } = createMocks('Bearer expired-token');

      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Session expiree',
        message: 'Veuillez vous reconnecter'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token invalide', () => {
    it('devrait retourner 401 pour token malformed', async () => {
      const { req, res, next } = createMocks('Bearer malformed-token');

      const jwtError = new Error('jwt malformed');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token invalide',
        message: 'Veuillez vous reconnecter'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 pour signature invalide', async () => {
      const { req, res, next } = createMocks('Bearer invalid-signature-token');

      const jwtError = new Error('invalid signature');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token invalide',
        message: 'Veuillez vous reconnecter'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Utilisateur non trouve', () => {
    it('devrait retourner 401 si utilisateur n\'existe pas en DB', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 999 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Non authentifie',
        message: 'Utilisateur non trouve'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('ne devrait pas attacher usager ou usagerId si utilisateur non trouve', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 999 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await authUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
    });
  });

  describe('Verification du statut utilisateur', () => {
    it('devrait autoriser un utilisateur avec statut actif', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'actif' });

      await authUsager(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si statut est suspendu', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'suspendu' });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acces refuse',
        message: 'Votre compte est suspendu'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si statut est inactif', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'inactif' });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acces refuse',
        message: 'Votre compte est inactif'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si statut est archive', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'archive' });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acces refuse',
        message: 'Votre compte est archive'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait inclure le statut dans le message d\'erreur', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'bloque' });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acces refuse',
        message: 'Votre compte est bloque'
      });
    });
  });

  describe('Erreurs generales', () => {
    it('devrait retourner 500 pour erreur DB inattendue', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(new Error('Database connection failed'));

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur serveur',
        message: 'Erreur lors de la verification de l\'authentification'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait logger l\'erreur en console', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      const dbError = new Error('Database error');
      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(dbError);

      await authUsager(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Erreur auth usager:', dbError);
    });

    it('devrait retourner 500 pour erreur inattendue non-JWT', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      const unexpectedError = new Error('Unexpected error');
      jwt.verify.mockImplementation(() => {
        throw unexpectedError;
      });

      await authUsager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur serveur',
        message: 'Erreur lors de la verification de l\'authentification'
      });
    });
  });
});

describe('optionalAuthUsager Middleware', () => {
  const mockUsager = {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    role: 'usager',
    statut: 'actif'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes';
  });

  describe('Token present et valide', () => {
    it('devrait attacher l\'usager si token valide et statut actif', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue(mockUsager);

      await optionalAuthUsager(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-for-testing-purposes');
      expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
      expect(req.usager).toEqual(mockUsager);
      expect(req.usagerId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait attacher usager et usagerId correctement', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 42 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, id: 42 });

      await optionalAuthUsager(req, res, next);

      expect(req.usager.id).toBe(42);
      expect(req.usagerId).toBe(42);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token absent', () => {
    it('devrait continuer sans erreur si aucun token fourni', async () => {
      const { req, res, next } = createMocks();

      await optionalAuthUsager(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(Utilisateur.findByPk).not.toHaveBeenCalled();
      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer si Authorization vide', async () => {
      const { req, res, next } = createMocks('');

      await optionalAuthUsager(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Format Authorization invalide', () => {
    it('devrait continuer si format n\'est pas "Bearer <token>"', async () => {
      const { req, res, next } = createMocks('just-a-token');

      await optionalAuthUsager(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(Utilisateur.findByPk).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer si Authorization est "Bearer " sans token', async () => {
      const { req, res, next } = createMocks('Bearer ');

      // jwt.verify avec une string vide lance une erreur JsonWebTokenError
      const jwtError = new Error('jwt must be provided');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer si Authorization commence par autre chose que Bearer', async () => {
      const { req, res, next } = createMocks('Basic abc123');

      await optionalAuthUsager(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token invalide', () => {
    it('devrait continuer sans erreur si token invalide', async () => {
      const { req, res, next } = createMocks('Bearer invalid-token');

      const jwtError = new Error('invalid token');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur si token expire', async () => {
      const { req, res, next } = createMocks('Bearer expired-token');

      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur pour signature invalide', async () => {
      const { req, res, next } = createMocks('Bearer bad-signature');

      const jwtError = new Error('invalid signature');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Utilisateur non trouve', () => {
    it('devrait continuer sans attacher usager si utilisateur n\'existe pas', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 999 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Verification du statut utilisateur', () => {
    it('devrait attacher usager si statut est actif', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'actif' });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeDefined();
      expect(req.usagerId).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('ne devrait PAS attacher usager si statut est suspendu', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'suspendu' });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('ne devrait PAS attacher usager si statut est inactif', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'inactif' });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(req.usagerId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('ne devrait PAS attacher usager si statut est archive', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'archive' });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('devrait verifier que statut === "actif" exactement', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ ...mockUsager, statut: 'bloque' });

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Erreurs DB', () => {
    it('devrait continuer sans erreur en cas d\'erreur DB', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait continuer meme si findByPk lance une erreur reseau', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(new Error('ECONNREFUSED'));

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Cas limites', () => {
    it('devrait gerer un utilisateur null gracieusement', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('devrait gerer un utilisateur sans statut gracieusement', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue({ id: 1, nom: 'Test' }); // pas de statut

      await optionalAuthUsager(req, res, next);

      expect(req.usager).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('devrait gerer un token decode sans id', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({}); // pas d'id
      Utilisateur.findByPk.mockResolvedValue(null);

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Erreurs generales', () => {
    it('devrait continuer pour toute erreur inattendue', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('ne devrait jamais bloquer la requete', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockImplementation(() => {
        throw new TypeError('Cannot read property');
      });

      await optionalAuthUsager(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
