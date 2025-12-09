/**
 * Tests unitaires pour le middleware auth
 * Verification JWT et authentification optionnelle
 */

const jwt = require('jsonwebtoken');
const { verifyToken, verifyActiveStatus, optionalAuth } = require('../../../backend/middleware/auth');
const { Utilisateur } = require('../../../backend/models');

// Mock des modules
jest.mock('jsonwebtoken');
jest.mock('../../../backend/models', () => ({
  Utilisateur: {
    findByPk: jest.fn()
  }
}));

// Helper pour creer des mocks req/res/next
const createMocks = (authHeader = null, queryToken = null, user = null) => {
  const req = {
    headers: {},
    query: {}
  };

  if (authHeader) {
    req.headers.authorization = authHeader;
  }

  if (queryToken) {
    req.query.token = queryToken;
  }

  if (user !== null) {
    req.user = user;
  }

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();

  return { req, res, next };
};

describe('verifyToken Middleware', () => {
  const mockUser = {
    id: 1,
    nom: 'Test',
    prenom: 'User',
    email: 'test@example.com',
    role: 'benevole',
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
      Utilisateur.findByPk.mockResolvedValue(mockUser);

      await verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token-123', 'test-secret-key-for-testing-purposes');
      expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait authentifier avec un token dans query parameter', async () => {
      const { req, res, next } = createMocks(null, 'query-token-456');

      jwt.verify.mockReturnValue({ id: 2 });
      Utilisateur.findByPk.mockResolvedValue(mockUser);

      await verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('query-token-456', 'test-secret-key-for-testing-purposes');
      expect(Utilisateur.findByPk).toHaveBeenCalledWith(2);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('devrait prioriser le header Authorization sur query parameter', async () => {
      const { req, res, next } = createMocks('Bearer header-token', 'query-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue(mockUser);

      await verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('header-token', 'test-secret-key-for-testing-purposes');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token manquant', () => {
    it('devrait retourner 401 si aucun token fourni', async () => {
      const { req, res, next } = createMocks();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si format Authorization invalide (sans Bearer)', async () => {
      const { req, res, next } = createMocks('just-a-token');

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si Authorization vide', async () => {
      const { req, res, next } = createMocks('');

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'No token provided'
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

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        message: 'Please login again'
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

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'jwt malformed'
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

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'invalid signature'
      });
    });
  });

  describe('Utilisateur non trouve', () => {
    it('devrait retourner 401 si utilisateur n\'existe pas en DB', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 999 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Erreurs generales', () => {
    it('devrait retourner 500 pour erreur DB inattendue', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(new Error('Database connection failed'));

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication error',
        message: 'Database connection failed'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('verifyActiveStatus Middleware', () => {
  describe('Verification statut actif', () => {
    it('devrait retourner 401 si req.user n\'existe pas', () => {
      const { req, res, next } = createMocks();

      verifyActiveStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait appeler next() si statut est actif', () => {
      const { req, res, next } = createMocks(null, null, {
        id: 1,
        statut: 'actif'
      });

      verifyActiveStatus(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si statut est inactif', () => {
      const { req, res, next } = createMocks(null, null, {
        id: 1,
        statut: 'inactif'
      });

      verifyActiveStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account inactive',
        message: 'Your account is inactif. Please contact administration.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si statut est suspendu', () => {
      const { req, res, next } = createMocks(null, null, {
        id: 1,
        statut: 'suspendu'
      });

      verifyActiveStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account inactive',
        message: 'Your account is suspendu. Please contact administration.'
      });
    });

    it('devrait retourner 403 si statut est archive', () => {
      const { req, res, next } = createMocks(null, null, {
        id: 1,
        statut: 'archive'
      });

      verifyActiveStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account inactive',
        message: 'Your account is archive. Please contact administration.'
      });
    });
  });
});

describe('optionalAuth Middleware', () => {
  const mockUser = {
    id: 1,
    nom: 'Test',
    prenom: 'User',
    email: 'test@example.com',
    role: 'benevole'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes';
  });

  describe('Token present et valide', () => {
    it('devrait attacher l\'utilisateur si token valide', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-for-testing-purposes');
      expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Token absent', () => {
    it('devrait continuer sans erreur si aucun token fourni', async () => {
      const { req, res, next } = createMocks();

      await optionalAuth(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(Utilisateur.findByPk).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
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

      await optionalAuth(req, res, next);

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

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Utilisateur non trouve', () => {
    it('devrait continuer sans attacher user si utilisateur n\'existe pas', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 999 });
      Utilisateur.findByPk.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Format Authorization invalide', () => {
    it('devrait continuer si format n\'est pas "Bearer <token>"', async () => {
      const { req, res, next } = createMocks('just-a-token');

      await optionalAuth(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('devrait continuer si Authorization a plus de 2 parties', async () => {
      const { req, res, next } = createMocks('Bearer token extra-part');

      await optionalAuth(req, res, next);

      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Erreurs DB', () => {
    it('devrait continuer sans erreur en cas d\'erreur DB', async () => {
      const { req, res, next } = createMocks('Bearer valid-token');

      jwt.verify.mockReturnValue({ id: 1 });
      Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
