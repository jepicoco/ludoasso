/**
 * Tests unitaires pour authController
 * Gestion de l'authentification et des profils utilisateurs
 */

const authController = require('../../../backend/controllers/authController');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, user = null, headers = {}, ip = '127.0.0.1') => {
  const req = {
    body,
    user,
    ip,
    connection: { remoteAddress: '127.0.0.1' },
    get: jest.fn((header) => headers[header.toLowerCase()] || null)
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();
  return { req, res, next };
};

// Mock des modeles Sequelize
jest.mock('../../../backend/models', () => ({
  Utilisateur: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

// Mock du logger d'audit
jest.mock('../../../backend/utils/auditLogger', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  passwordReset: jest.fn()
}));

const { Utilisateur } = require('../../../backend/models');
const auditLogger = require('../../../backend/utils/auditLogger');

describe('authController - login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 400 si email manquant', async () => {
    const { req, res } = createMocks({ password: 'password123' });

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Email and password are required'
    });
  });

  it('devrait retourner 400 si password manquant', async () => {
    const { req, res } = createMocks({ email: 'test@example.com' });

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Email and password are required'
    });
  });

  it('devrait retourner 401 si utilisateur inexistant', async () => {
    const { req, res } = createMocks(
      { email: 'nonexistent@example.com', password: 'password123' },
      null,
      { 'user-agent': 'Jest Test' }
    );

    Utilisateur.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(Utilisateur.findOne).toHaveBeenCalledWith({
      where: { email: 'nonexistent@example.com' }
    });
    expect(auditLogger.login).toHaveBeenCalledWith({
      userId: null,
      email: 'nonexistent@example.com',
      ip: '127.0.0.1',
      userAgent: 'Jest Test',
      success: false
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  });

  it('devrait retourner 401 si mot de passe incorrect', async () => {
    const { req, res } = createMocks(
      { email: 'user@example.com', password: 'wrongpassword' },
      null,
      { 'user-agent': 'Jest Test' }
    );

    const mockUser = {
      id: 1,
      email: 'user@example.com',
      comparePassword: jest.fn().mockResolvedValue(false)
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
    expect(auditLogger.login).toHaveBeenCalledWith({
      userId: 1,
      email: 'user@example.com',
      ip: '127.0.0.1',
      userAgent: 'Jest Test',
      success: false
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  });

  it('devrait retourner 403 si compte suspendu', async () => {
    const { req, res } = createMocks(
      { email: 'suspended@example.com', password: 'password123' }
    );

    const mockUser = {
      id: 1,
      email: 'suspended@example.com',
      statut: 'suspendu',
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Account suspended',
      message: 'Your account has been suspended. Please contact administration.'
    });
    expect(auditLogger.login).not.toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('devrait retourner 403 si compte inactif', async () => {
    const { req, res } = createMocks(
      { email: 'inactive@example.com', password: 'password123' }
    );

    const mockUser = {
      id: 1,
      email: 'inactive@example.com',
      statut: 'inactif',
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Account inactive',
      message: 'Your account is inactive. Please contact administration.'
    });
  });

  it('devrait retourner 200 et token pour login reussi', async () => {
    const { req, res } = createMocks(
      { email: 'user@example.com', password: 'password123' },
      null,
      { 'user-agent': 'Jest Test' }
    );

    const mockUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'user@example.com',
      code_barre: 'USR001',
      statut: 'actif',
      role: 'usager',
      modules_autorises: ['ludotheque'],
      comparePassword: jest.fn().mockResolvedValue(true),
      generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token')
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    expect(mockUser.generateAuthToken).toHaveBeenCalled();
    expect(auditLogger.login).toHaveBeenCalledWith({
      userId: 1,
      email: 'user@example.com',
      ip: '127.0.0.1',
      userAgent: 'Jest Test',
      success: true
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful',
      token: 'mock-jwt-token',
      user: {
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        email: 'user@example.com',
        code_barre: 'USR001',
        statut: 'actif',
        role: 'usager',
        modules_autorises: ['ludotheque']
      }
    });
  });

  it('devrait utiliser role par defaut "usager" si role non defini', async () => {
    const { req, res } = createMocks(
      { email: 'user@example.com', password: 'password123' }
    );

    const mockUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'user@example.com',
      code_barre: 'USR001',
      statut: 'actif',
      role: null, // Role non defini
      modules_autorises: null,
      comparePassword: jest.fn().mockResolvedValue(true),
      generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token')
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          role: 'usager'
        })
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks(
      { email: 'user@example.com', password: 'password123' }
    );

    const dbError = new Error('Database connection failed');
    Utilisateur.findOne.mockRejectedValue(dbError);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('authController - register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 400 si nom manquant', async () => {
    const { req, res } = createMocks({
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123'
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Nom, prenom, email, and password are required'
    });
  });

  it('devrait retourner 400 si prenom manquant', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Nom, prenom, email, and password are required'
    });
  });

  it('devrait retourner 400 si email manquant', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      password: 'password123'
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devrait retourner 400 si password manquant', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com'
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devrait retourner 400 si email invalide', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'invalid-email',
      password: 'password123'
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Invalid email format'
    });
  });

  it('devrait retourner 400 si mot de passe trop court', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: '12345' // Moins de 6 caracteres
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Password must be at least 6 characters long'
    });
  });

  it('devrait retourner 409 si utilisateur existe deja', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'existing@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue({ id: 1, email: 'existing@example.com' });

    await authController.register(req, res);

    expect(Utilisateur.findOne).toHaveBeenCalledWith({
      where: { email: 'existing@example.com' }
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'User already exists',
      message: 'An account with this email already exists'
    });
  });

  it('devrait creer un utilisateur avec succes', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'new@example.com',
      password: 'password123',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01'
    });

    Utilisateur.findOne.mockResolvedValue(null);

    const mockCreatedUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'new@example.com',
      code_barre: 'USR001',
      statut: 'actif',
      generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token')
    };

    Utilisateur.create.mockResolvedValue(mockCreatedUser);

    await authController.register(req, res);

    expect(Utilisateur.create).toHaveBeenCalledWith({
      nom: 'Doe',
      prenom: 'John',
      email: 'new@example.com',
      password: 'password123',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      date_adhesion: expect.any(Date),
      statut: 'actif'
    });

    expect(mockCreatedUser.generateAuthToken).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Registration successful',
      token: 'mock-jwt-token',
      user: {
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        email: 'new@example.com',
        code_barre: 'USR001',
        statut: 'actif'
      }
    });
  });

  it('devrait creer un utilisateur sans champs optionnels', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'minimal@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue(null);

    const mockCreatedUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'minimal@example.com',
      code_barre: 'USR001',
      statut: 'actif',
      generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token')
    };

    Utilisateur.create.mockResolvedValue(mockCreatedUser);

    await authController.register(req, res);

    expect(Utilisateur.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nom: 'Doe',
        prenom: 'John',
        email: 'minimal@example.com',
        password: 'password123',
        telephone: undefined,
        adresse: undefined,
        ville: undefined,
        code_postal: undefined,
        date_naissance: undefined
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'test@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue(null);

    const validationError = new Error('Validation error');
    validationError.name = 'SequelizeValidationError';
    validationError.errors = [
      { message: 'Email must be valid' },
      { message: 'Phone number invalid' }
    ];

    Utilisateur.create.mockRejectedValue(validationError);

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Email must be valid, Phone number invalid'
    });
  });

  it('devrait retourner 409 pour contrainte unique Sequelize', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'duplicate@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue(null);

    const uniqueError = new Error('Unique constraint error');
    uniqueError.name = 'SequelizeUniqueConstraintError';

    Utilisateur.create.mockRejectedValue(uniqueError);

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate entry',
      message: 'Email already exists'
    });
  });

  it('devrait retourner 500 pour erreur serveur', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'test@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue(null);

    const serverError = new Error('Database connection failed');
    Utilisateur.create.mockRejectedValue(serverError);

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('authController - getProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner le profil complet de l\'utilisateur', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      date_adhesion: '2024-01-01',
      date_fin_adhesion: '2025-01-01',
      statut: 'actif',
      photo: '/uploads/photo.jpg',
      notes: 'Membre actif',
      role: 'usager',
      modules_autorises: ['ludotheque', 'bibliotheque']
    };

    const { req, res } = createMocks({}, mockUser);

    await authController.getProfile(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 1,
        code_barre: 'USR001',
        nom: 'Doe',
        prenom: 'John',
        email: 'john@example.com',
        telephone: '0612345678',
        adresse: '123 Rue Test',
        ville: 'Paris',
        code_postal: '75001',
        date_naissance: '1990-01-01',
        date_adhesion: '2024-01-01',
        date_fin_adhesion: '2025-01-01',
        statut: 'actif',
        photo: '/uploads/photo.jpg',
        notes: 'Membre actif',
        role: 'usager',
        modules_autorises: ['ludotheque', 'bibliotheque']
      }
    });
  });

  it('devrait utiliser role par defaut "usager" si non defini', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      role: null
    };

    const { req, res } = createMocks({}, mockUser);

    await authController.getProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          role: 'usager'
        })
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const mockUser = {
      id: 1,
      get nom() {
        throw new Error('Property access error');
      }
    };

    const { req, res } = createMocks({}, mockUser);

    await authController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Property access error'
    });
  });
});

describe('authController - updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour les champs autorises', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'OldName',
      prenom: 'OldFirstName',
      email: 'john@example.com',
      telephone: '0600000000',
      adresse: 'Old Address',
      ville: 'OldCity',
      code_postal: '00000',
      date_naissance: '1990-01-01',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      {
        nom: 'NewName',
        prenom: 'NewFirstName',
        telephone: '0612345678',
        adresse: 'New Address',
        ville: 'Paris',
        code_postal: '75001',
        date_naissance: '1990-06-15'
      },
      mockUser
    );

    await authController.updateProfile(req, res);

    expect(mockUser.nom).toBe('NewName');
    expect(mockUser.prenom).toBe('NewFirstName');
    expect(mockUser.telephone).toBe('0612345678');
    expect(mockUser.adresse).toBe('New Address');
    expect(mockUser.ville).toBe('Paris');
    expect(mockUser.code_postal).toBe('75001');
    expect(mockUser.date_naissance).toBe('1990-06-15');
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: 'Profile updated successfully',
      user: {
        id: 1,
        code_barre: 'USR001',
        nom: 'NewName',
        prenom: 'NewFirstName',
        email: 'john@example.com',
        telephone: '0612345678',
        adresse: 'New Address',
        ville: 'Paris',
        code_postal: '75001',
        date_naissance: '1990-06-15',
        statut: 'actif'
      }
    });
  });

  it('devrait mettre a jour seulement les champs fournis', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      telephone: '0600000000',
      adresse: 'Old Address',
      ville: 'OldCity',
      code_postal: '00000',
      date_naissance: '1990-01-01',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      {
        telephone: '0612345678',
        ville: 'Paris'
      },
      mockUser
    );

    await authController.updateProfile(req, res);

    expect(mockUser.nom).toBe('Doe'); // Non modifie
    expect(mockUser.prenom).toBe('John'); // Non modifie
    expect(mockUser.telephone).toBe('0612345678'); // Modifie
    expect(mockUser.adresse).toBe('Old Address'); // Non modifie
    expect(mockUser.ville).toBe('Paris'); // Modifie
  });

  it('devrait permettre de vider un champ avec null', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      telephone: '0600000000',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      {
        telephone: null,
        adresse: null
      },
      mockUser
    );

    await authController.updateProfile(req, res);

    // Le controller accepte null comme valeur (null !== undefined est true)
    expect(mockUser.telephone).toBeNull();
    expect(mockUser.adresse).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('ne devrait pas modifier l\'email (champ non autorise)', async () => {
    const mockUser = {
      id: 1,
      code_barre: 'USR001',
      nom: 'Doe',
      prenom: 'John',
      email: 'original@example.com',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      {
        nom: 'NewName',
        email: 'newemail@example.com' // Tente de modifier email
      },
      mockUser
    );

    await authController.updateProfile(req, res);

    expect(mockUser.email).toBe('original@example.com'); // Email non modifie
    expect(mockUser.nom).toBe('NewName'); // Nom modifie
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const mockUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeValidationError',
        errors: [
          { message: 'Invalid phone format' },
          { message: 'Code postal must be 5 digits' }
        ]
      })
    };

    const { req, res } = createMocks(
      {
        telephone: 'invalid',
        code_postal: '123'
      },
      mockUser
    );

    await authController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Invalid phone format, Code postal must be 5 digits'
    });
  });

  it('devrait retourner 500 pour erreur serveur', async () => {
    const mockUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      save: jest.fn().mockRejectedValue(new Error('Database connection failed'))
    };

    const { req, res } = createMocks({ nom: 'NewName' }, mockUser);

    await authController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('authController - Validation des inputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation email', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'test123@test-domain.com'
    ];

    const invalidEmails = [
      'invalid',
      'invalid@',
      '@invalid.com',
      'invalid@domain',
      'invalid domain@test.com',
      'invalid@.com'
    ];

    validEmails.forEach(email => {
      it(`devrait accepter email valide: ${email}`, async () => {
        const { req, res } = createMocks({
          nom: 'Doe',
          prenom: 'John',
          email,
          password: 'password123'
        });

        Utilisateur.findOne.mockResolvedValue(null);
        Utilisateur.create.mockResolvedValue({
          id: 1,
          email,
          generateAuthToken: jest.fn().mockReturnValue('token')
        });

        await authController.register(req, res);

        expect(Utilisateur.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
      });
    });

    invalidEmails.forEach(email => {
      it(`devrait rejeter email invalide: ${email}`, async () => {
        const { req, res } = createMocks({
          nom: 'Doe',
          prenom: 'John',
          email,
          password: 'password123'
        });

        await authController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Validation error',
          message: 'Invalid email format'
        });
        expect(Utilisateur.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Validation mot de passe', () => {
    it('devrait accepter mot de passe de 6 caracteres', async () => {
      const { req, res } = createMocks({
        nom: 'Doe',
        prenom: 'John',
        email: 'test@example.com',
        password: '123456'
      });

      Utilisateur.findOne.mockResolvedValue(null);
      Utilisateur.create.mockResolvedValue({
        id: 1,
        generateAuthToken: jest.fn().mockReturnValue('token')
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devrait accepter mot de passe long', async () => {
      const { req, res } = createMocks({
        nom: 'Doe',
        prenom: 'John',
        email: 'test@example.com',
        password: 'VeryLongPasswordWith$pecialCharacters123!'
      });

      Utilisateur.findOne.mockResolvedValue(null);
      Utilisateur.create.mockResolvedValue({
        id: 1,
        generateAuthToken: jest.fn().mockReturnValue('token')
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devrait rejeter mot de passe de 5 caracteres', async () => {
      const { req, res } = createMocks({
        nom: 'Doe',
        prenom: 'John',
        email: 'test@example.com',
        password: '12345'
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    });
  });
});

describe('authController - Cas limites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait gerer req.ip absent', async () => {
    const req = {
      body: { email: 'test@example.com', password: 'password123' },
      connection: { remoteAddress: '192.168.1.1' },
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    delete req.ip; // Supprime explicitement req.ip

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    Utilisateur.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(auditLogger.login).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '192.168.1.1' // Utilise connection.remoteAddress
      })
    );
  });

  it('devrait gerer user-agent absent', async () => {
    const { req, res } = createMocks(
      { email: 'test@example.com', password: 'password123' },
      null,
      {} // Pas de user-agent
    );

    Utilisateur.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(auditLogger.login).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: null
      })
    );
  });

  it('devrait gerer date_adhesion manuelle lors de l\'inscription', async () => {
    const fixedDate = new Date('2024-01-15');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'test@example.com',
      password: 'password123'
    });

    Utilisateur.findOne.mockResolvedValue(null);
    Utilisateur.create.mockResolvedValue({
      id: 1,
      generateAuthToken: jest.fn().mockReturnValue('token')
    });

    await authController.register(req, res);

    expect(Utilisateur.create).toHaveBeenCalledWith(
      expect.objectContaining({
        date_adhesion: fixedDate
      })
    );

    jest.restoreAllMocks();
  });

  it('devrait gerer modules_autorises null dans la reponse login', async () => {
    const { req, res } = createMocks({
      email: 'test@example.com',
      password: 'password123'
    });

    const mockUser = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'test@example.com',
      statut: 'actif',
      modules_autorises: null,
      comparePassword: jest.fn().mockResolvedValue(true),
      generateAuthToken: jest.fn().mockReturnValue('token')
    };

    Utilisateur.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          modules_autorises: null
        })
      })
    );
  });
});
