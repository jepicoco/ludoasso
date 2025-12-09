/**
 * Tests unitaires pour utilisateurController
 * Gestion des utilisateurs (anciennement adherents)
 */

const utilisateurController = require('../../../backend/controllers/utilisateurController');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, params = {}, query = {}, user = null, headers = {}, ip = '127.0.0.1') => {
  const req = {
    body,
    params,
    query,
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
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  Emprunt: {
    findOne: jest.fn(),
    count: jest.fn()
  },
  Jeu: {},
  Cotisation: {
    findOne: jest.fn()
  },
  UtilisateurArchive: {
    create: jest.fn()
  },
  ArchiveAccessLog: {
    create: jest.fn()
  },
  TemplateMessage: {
    findByCode: jest.fn()
  },
  ConfigurationSMS: {
    findOne: jest.fn()
  },
  sequelize: {
    transaction: jest.fn()
  }
}));

// Mock des services
jest.mock('../../../backend/services/emailService', () => ({
  sendEmail: jest.fn()
}));

jest.mock('../../../backend/services/eventTriggerService', () => ({
  trigger: jest.fn(),
  prepareEmpruntsVariables: jest.fn()
}));

jest.mock('../../../backend/utils/smsService', () => ({
  sendSMS: jest.fn()
}));

const { Utilisateur, Emprunt, Cotisation, UtilisateurArchive, ArchiveAccessLog, TemplateMessage, ConfigurationSMS, sequelize } = require('../../../backend/models');
const emailService = require('../../../backend/services/emailService');
const eventTriggerService = require('../../../backend/services/eventTriggerService');
const smsService = require('../../../backend/utils/smsService');

describe('utilisateurController - getAllUtilisateurs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les utilisateurs avec pagination par defaut', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockUtilisateurs = [
      { id: 1, nom: 'Doe', prenom: 'John', email: 'john@example.com' },
      { id: 2, nom: 'Smith', prenom: 'Jane', email: 'jane@example.com' }
    ];

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockUtilisateurs
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 50,
      offset: 0,
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
      attributes: { exclude: ['password'] }
    });

    expect(res.json).toHaveBeenCalledWith({
      utilisateurs: mockUtilisateurs,
      adherents: mockUtilisateurs,
      pagination: {
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      }
    });
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'actif' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 5,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'actif' }
      })
    );
  });

  it('devrait filtrer par role', async () => {
    const { req, res } = createMocks({}, {}, { role: 'administrateur' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'administrateur' }
      })
    );
  });

  it('devrait filtrer par adhesion association active', async () => {
    const { req, res } = createMocks({}, {}, { date_fin_adhesion_association: 'actif' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date_fin_adhesion_association: expect.objectContaining({
            [require('sequelize').Op.gte]: expect.any(Date)
          })
        }
      })
    );
  });

  it('devrait filtrer par adhesion association expiree', async () => {
    const { req, res } = createMocks({}, {}, { date_fin_adhesion_association: 'expire' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date_fin_adhesion_association: expect.objectContaining({
            [require('sequelize').Op.lt]: expect.any(Date)
          })
        }
      })
    );
  });

  it('devrait rechercher par nom, prenom, email ou code_barre', async () => {
    const { req, res } = createMocks({}, {}, { search: 'dupont' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ id: 1, nom: 'Dupont', prenom: 'Pierre', email: 'pierre.dupont@example.com' }]
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [require('sequelize').Op.or]: [
            { nom: { [require('sequelize').Op.like]: '%dupont%' } },
            { prenom: { [require('sequelize').Op.like]: '%dupont%' } },
            { email: { [require('sequelize').Op.like]: '%dupont%' } },
            { code_barre: { [require('sequelize').Op.like]: '%dupont%' } }
          ]
        }
      })
    );
  });

  it('devrait supporter la pagination personnalisee', async () => {
    const { req, res } = createMocks({}, {}, { page: '2', limit: '10' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 25,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 10
      })
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: {
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3
        }
      })
    );
  });

  it('devrait combiner plusieurs filtres', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'actif', role: 'usager', search: 'test' });

    Utilisateur.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(Utilisateur.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          statut: 'actif',
          role: 'usager',
          [require('sequelize').Op.or]: expect.any(Array)
        }
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, {}, {});

    Utilisateur.findAndCountAll.mockRejectedValue(new Error('Database error'));

    await utilisateurController.getAllUtilisateurs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - getUtilisateurById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un utilisateur avec ses emprunts', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      code_barre: 'USR001',
      emprunts: [
        { id: 1, date_emprunt: '2024-01-01', jeu: { id: 1, titre: 'Test Game' } }
      ]
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.getUtilisateurById(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith('1', {
      attributes: { exclude: ['password'] },
      include: [{
        model: Emprunt,
        as: 'emprunts',
        include: [{
          model: require('../../../backend/models').Jeu,
          as: 'jeu'
        }],
        order: [['date_emprunt', 'DESC']]
      }]
    });

    expect(res.json).toHaveBeenCalledWith({
      utilisateur: mockUtilisateur,
      adherent: mockUtilisateur
    });
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.getUtilisateurById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

    await utilisateurController.getUtilisateurById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - createUtilisateur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 400 si champs requis manquants', async () => {
    const { req, res } = createMocks({ nom: 'Doe' });

    await utilisateurController.createUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Nom, prenom, email et mot de passe sont requis'
    });
  });

  it('devrait creer un utilisateur avec valeurs par defaut', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123'
    });

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      role: 'usager',
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        email: 'john@example.com',
        statut: 'actif',
        role: 'usager',
        password: 'hashed_password'
      })
    };

    Utilisateur.create.mockResolvedValue(mockUtilisateur);

    await utilisateurController.createUtilisateur(req, res);

    expect(Utilisateur.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nom: 'Doe',
        prenom: 'John',
        email: 'john@example.com',
        password: 'password123',
        date_inscription: expect.any(Date),
        statut: 'actif',
        role: 'usager',
        photo: null
      })
    );

    expect(eventTriggerService.trigger).toHaveBeenCalledWith('UTILISATEUR_CREATION', {
      utilisateur: mockUtilisateur
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usager cree avec succes',
      utilisateur: expect.not.objectContaining({ password: expect.anything() }),
      adherent: expect.not.objectContaining({ password: expect.anything() })
    });
  });

  it('devrait creer un utilisateur avec tous les champs optionnels', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      date_inscription: '2024-01-01',
      date_fin_cotisation: '2025-01-01',
      statut: 'suspendu',
      role: 'administrateur',
      photo: '/uploads/photo.jpg',
      date_fin_adhesion_association: '2025-12-31',
      notes: 'Test notes'
    });

    const mockUtilisateur = {
      id: 1,
      toJSON: jest.fn().mockReturnValue({ id: 1, nom: 'Doe' })
    };

    Utilisateur.create.mockResolvedValue(mockUtilisateur);

    await utilisateurController.createUtilisateur(req, res);

    expect(Utilisateur.create).toHaveBeenCalledWith({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      date_inscription: '2024-01-01',
      date_fin_cotisation: '2025-01-01',
      statut: 'suspendu',
      role: 'administrateur',
      photo: '/uploads/photo.jpg',
      date_fin_adhesion_association: '2025-12-31',
      notes: 'Test notes'
    });

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123'
    });

    const validationError = new Error('Validation error');
    validationError.name = 'SequelizeValidationError';
    validationError.errors = [
      { message: 'Invalid email format' },
      { message: 'Password too short' }
    ];

    Utilisateur.create.mockRejectedValue(validationError);

    await utilisateurController.createUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Invalid email format, Password too short'
    });
  });

  it('devrait retourner 409 pour email duplique', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'duplicate@example.com',
      password: 'password123'
    });

    const uniqueError = new Error('Unique constraint error');
    uniqueError.name = 'SequelizeUniqueConstraintError';

    Utilisateur.create.mockRejectedValue(uniqueError);

    await utilisateurController.createUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate entry',
      message: 'Cet email existe deja'
    });
  });

  it('devrait gerer l\'echec du declenchement d\'evenement', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123'
    });

    const mockUtilisateur = {
      id: 1,
      toJSON: jest.fn().mockReturnValue({ id: 1, nom: 'Doe' })
    };

    Utilisateur.create.mockResolvedValue(mockUtilisateur);
    eventTriggerService.trigger.mockRejectedValue(new Error('Event error'));

    await utilisateurController.createUtilisateur(req, res);

    // L'utilisateur devrait quand meme etre cree
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      password: 'password123'
    });

    Utilisateur.create.mockRejectedValue(new Error('Database error'));

    await utilisateurController.createUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - updateUtilisateur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({ nom: 'NewName' }, { id: '999' });

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.updateUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait mettre a jour les champs fournis', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'OldName',
      prenom: 'OldPrenom',
      email: 'old@example.com',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        nom: 'NewName',
        prenom: 'NewPrenom',
        statut: 'actif'
      })
    };

    const { req, res } = createMocks(
      { nom: 'NewName', prenom: 'NewPrenom' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    expect(mockUtilisateur.nom).toBe('NewName');
    expect(mockUtilisateur.prenom).toBe('NewPrenom');
    expect(mockUtilisateur.save).toHaveBeenCalled();

    expect(eventTriggerService.trigger).toHaveBeenCalledWith('UTILISATEUR_MODIFICATION', {
      utilisateur: mockUtilisateur
    });

    expect(res.json).toHaveBeenCalledWith({
      message: 'Usager mis a jour avec succes',
      utilisateur: expect.not.objectContaining({ password: expect.anything() }),
      adherent: expect.not.objectContaining({ password: expect.anything() })
    });
  });

  it('devrait declencher evenement UTILISATEUR_SUSPENDED lors du changement vers statut suspendu', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      statut: 'actif',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({ id: 1, statut: 'suspendu' })
    };

    const { req, res } = createMocks({ statut: 'suspendu' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    expect(mockUtilisateur.statut).toBe('suspendu');
    expect(eventTriggerService.trigger).toHaveBeenCalledWith('UTILISATEUR_SUSPENDED', {
      utilisateur: mockUtilisateur
    });
  });

  it('devrait permettre de mettre a jour tous les champs', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Old',
      prenom: 'Old',
      email: 'old@example.com',
      telephone: '0600000000',
      adresse: 'Old',
      ville: 'Old',
      code_postal: '00000',
      date_naissance: '1990-01-01',
      date_inscription: '2020-01-01',
      date_fin_cotisation: '2021-01-01',
      statut: 'actif',
      role: 'usager',
      photo: null,
      date_fin_adhesion_association: null,
      notes: '',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({ id: 1 })
    };

    const { req, res } = createMocks(
      {
        nom: 'New',
        prenom: 'New',
        email: 'new@example.com',
        telephone: '0612345678',
        adresse: 'New Address',
        ville: 'Paris',
        code_postal: '75001',
        date_naissance: '1995-06-15',
        date_inscription: '2024-01-01',
        date_fin_cotisation: '2025-01-01',
        statut: 'inactif',
        role: 'administrateur',
        photo: '/photo.jpg',
        date_fin_adhesion_association: '2025-12-31',
        notes: 'New notes'
      },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    expect(mockUtilisateur.nom).toBe('New');
    expect(mockUtilisateur.prenom).toBe('New');
    expect(mockUtilisateur.email).toBe('new@example.com');
    expect(mockUtilisateur.telephone).toBe('0612345678');
    expect(mockUtilisateur.adresse).toBe('New Address');
    expect(mockUtilisateur.ville).toBe('Paris');
    expect(mockUtilisateur.code_postal).toBe('75001');
    expect(mockUtilisateur.date_naissance).toBe('1995-06-15');
    expect(mockUtilisateur.date_inscription).toBe('2024-01-01');
    expect(mockUtilisateur.date_fin_cotisation).toBe('2025-01-01');
    expect(mockUtilisateur.statut).toBe('inactif');
    expect(mockUtilisateur.role).toBe('administrateur');
    expect(mockUtilisateur.photo).toBe('/photo.jpg');
    expect(mockUtilisateur.date_fin_adhesion_association).toBe('2025-12-31');
    expect(mockUtilisateur.notes).toBe('New notes');
  });

  it('devrait permettre de vider un champ avec null', async () => {
    const mockUtilisateur = {
      id: 1,
      telephone: '0600000000',
      adresse: '123 Rue Test',
      notes: 'Old notes',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({ id: 1, telephone: null, adresse: null, notes: null })
    };

    const { req, res } = createMocks(
      { telephone: null, adresse: null, notes: null },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    expect(mockUtilisateur.telephone).toBeNull();
    expect(mockUtilisateur.adresse).toBeNull();
    expect(mockUtilisateur.notes).toBeNull();
  });

  it('devrait ignorer les champs undefined et conserver les valeurs existantes', async () => {
    const mockUtilisateur = {
      id: 1,
      telephone: '0600000000',
      adresse: '123 Rue Test',
      notes: 'Old notes',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({ id: 1 })
    };

    const { req, res } = createMocks(
      { telephone: undefined, adresse: undefined, notes: undefined },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    // Les champs undefined ne sont pas modifies
    expect(mockUtilisateur.telephone).toBe('0600000000');
    expect(mockUtilisateur.adresse).toBe('123 Rue Test');
    expect(mockUtilisateur.notes).toBe('Old notes');
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const mockUtilisateur = {
      id: 1,
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeValidationError',
        errors: [{ message: 'Invalid email format' }]
      })
    };

    const { req, res } = createMocks({ email: 'invalid' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.updateUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Invalid email format'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({ nom: 'NewName' }, { id: '1' });

    Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

    await utilisateurController.updateUtilisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - deleteUtilisateur', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true)
    };
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({ motif: 'Test motif' }, { id: '999' });

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.deleteUtilisateur(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait retourner 400 si utilisateur a des emprunts actifs', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John'
    };

    const { req, res } = createMocks({ motif: 'Test motif' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(2); // 2 emprunts actifs

    await utilisateurController.deleteUtilisateur(req, res);

    expect(Emprunt.count).toHaveBeenCalledWith({
      where: {
        adherent_id: '1',
        statut: { [require('sequelize').Op.in]: ['en_cours', 'en_retard'] }
      },
      transaction: mockTransaction
    });

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot archive',
      message: 'Impossible d\'archiver : 2 emprunt(s) en cours. Veuillez d\'abord cloturer tous les emprunts.'
    });
  });

  it('devrait archiver utilisateur sans emprunts ni cotisations', async () => {
    const mockUtilisateur = {
      id: 1,
      code_barre: 'USR001',
      civilite: 'M.',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      telephone: '0612345678',
      adresse: '123 Rue Test',
      ville: 'Paris',
      code_postal: '75001',
      date_naissance: '1990-01-01',
      date_adhesion: '2020-01-01',
      date_fin_adhesion: '2021-01-01',
      adhesion_association: true,
      statut: 'actif',
      photo: '/photo.jpg',
      notes: 'Test notes',
      date_fin_adhesion_association: '2025-12-31',
      role: 'usager',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      { motif: 'Demission' },
      { id: '1' },
      {},
      { id: 10, nom: 'Admin', prenom: 'Super', role: 'administrateur' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(UtilisateurArchive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adherent_id: 1,
        code_barre: 'USR001',
        civilite: 'M.',
        nom: 'Doe',
        prenom: 'John',
        email: 'john@example.com',
        statut_avant_archivage: 'actif',
        archive_par: 10,
        motif_archivage: 'Demission',
        derniere_activite: null
      }),
      { transaction: mockTransaction }
    );

    expect(mockUtilisateur.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: 'Usager archive avec succes',
      archived: true,
      archiveId: 100
    });
  });

  it('devrait calculer derniere activite depuis dernier emprunt', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' }, {}, { id: 10 });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue({ date_emprunt: '2024-06-15' });
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(UtilisateurArchive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        derniere_activite: new Date('2024-06-15')
      }),
      { transaction: mockTransaction }
    );
  });

  it('devrait calculer derniere activite depuis derniere cotisation', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' }, {}, { id: 10 });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue({ date_paiement: '2024-08-20' });
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(UtilisateurArchive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        derniere_activite: new Date('2024-08-20')
      }),
      { transaction: mockTransaction }
    );
  });

  it('devrait prendre la plus recente entre emprunt et cotisation', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' }, {}, { id: 10 });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue({ date_emprunt: '2024-09-01' });
    Cotisation.findOne.mockResolvedValue({ date_paiement: '2024-08-01' });
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(UtilisateurArchive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        derniere_activite: new Date('2024-09-01')
      }),
      { transaction: mockTransaction }
    );
  });

  it('devrait utiliser motif par defaut si non fourni', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks({}, { id: '1' }, {}, { id: 10 });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(UtilisateurArchive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        motif_archivage: 'Archivage manuel'
      }),
      { transaction: mockTransaction }
    );
  });

  it('devrait logger l\'acces aux archives', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks(
      { motif: 'Test' },
      { id: '1' },
      {},
      { id: 10, nom: 'Admin', prenom: 'Super', role: 'administrateur' },
      { 'user-agent': 'Jest Test Agent' },
      '192.168.1.100'
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(ArchiveAccessLog.create).toHaveBeenCalledWith({
      user_id: 10,
      user_nom: 'Admin',
      user_prenom: 'Super',
      user_role: 'administrateur',
      action: 'archivage',
      utilisateur_archive_id: 100,
      details: 'Usager John Doe archive',
      ip_address: '192.168.1.100',
      user_agent: 'Jest Test Agent'
    });
  });

  it('devrait gerer l\'echec du log d\'archive', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockResolvedValue(true)
    };

    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' }, {}, { id: 10 });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });
    ArchiveAccessLog.create.mockRejectedValue(new Error('Log error'));

    await utilisateurController.deleteUtilisateur(req, res);

    // L'archivage devrait quand meme reussir
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usager archive avec succes',
      archived: true,
      archiveId: 100
    });
  });

  it('devrait rollback en cas d\'erreur', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif',
      destroy: jest.fn().mockRejectedValue(new Error('Destroy error'))
    };

    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count.mockResolvedValue(0);
    Emprunt.findOne.mockResolvedValue(null);
    Cotisation.findOne.mockResolvedValue(null);
    UtilisateurArchive.create.mockResolvedValue({ id: 100 });

    await utilisateurController.deleteUtilisateur(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Destroy error'
    });
  });
});

describe('utilisateurController - getUtilisateurStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.getUtilisateurStats(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait retourner les statistiques d\'un utilisateur', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      code_barre: 'USR001'
    };

    const { req, res } = createMocks({}, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Emprunt.count
      .mockResolvedValueOnce(15) // total emprunts
      .mockResolvedValueOnce(2)  // emprunts en cours
      .mockResolvedValueOnce(1); // emprunts en retard

    await utilisateurController.getUtilisateurStats(req, res);

    expect(Emprunt.count).toHaveBeenCalledTimes(3);
    expect(Emprunt.count).toHaveBeenNthCalledWith(1, { where: { adherent_id: '1' } });
    expect(Emprunt.count).toHaveBeenNthCalledWith(2, { where: { adherent_id: '1', statut: 'en_cours' } });
    expect(Emprunt.count).toHaveBeenNthCalledWith(3, { where: { adherent_id: '1', statut: 'en_retard' } });

    expect(res.json).toHaveBeenCalledWith({
      utilisateur: {
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        code_barre: 'USR001'
      },
      adherent: {
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        code_barre: 'USR001'
      },
      stats: {
        totalEmprunts: 15,
        empruntsEnCours: 2,
        empruntsEnRetard: 1
      }
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

    await utilisateurController.getUtilisateurStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - sendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'TEST' },
      { id: '999' }
    );

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.sendEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait retourner 400 si mode template sans templateCode', async () => {
    const mockUtilisateur = {
      id: 1,
      email: 'john@example.com'
    };

    const { req, res } = createMocks({ mode: 'template' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.sendEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Template code is required'
    });
  });

  it('devrait retourner 404 si template non trouve', async () => {
    const mockUtilisateur = {
      id: 1,
      email: 'john@example.com'
    };

    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'NONEXISTENT' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TemplateMessage.findByCode.mockResolvedValue(null);

    await utilisateurController.sendEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Template not found'
    });
  });

  it('devrait envoyer email en mode template', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com'
    };

    const mockTemplate = {
      compileEmail: jest.fn().mockReturnValue({
        objet: 'Test Subject',
        corps: '<p>Test Body</p>'
      })
    };

    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'TEST_TEMPLATE', variables: { custom: 'value' } },
      { id: '1' },
      {},
      { id: 10 }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TemplateMessage.findByCode.mockResolvedValue(mockTemplate);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({
      messageId: 'msg-123',
      logId: 456
    });

    await utilisateurController.sendEmail(req, res);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        utilisateurId: 1,
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
        templateCode: 'TEST_TEMPLATE',
        metadata: {
          destinataire_nom: 'John Doe',
          sent_by: 10,
          mode: 'template'
        }
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Email envoye avec succes',
      messageId: 'msg-123',
      logId: 456
    });
  });

  it('devrait retourner 400 si mode custom sans subject ou body', async () => {
    const mockUtilisateur = {
      id: 1,
      email: 'john@example.com'
    };

    const { req, res } = createMocks(
      { mode: 'custom', subject: 'Test' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.sendEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Subject and body are required'
    });
  });

  it('devrait envoyer email en mode custom', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com'
    };

    const { req, res } = createMocks(
      {
        mode: 'custom',
        subject: 'Hello {{prenom}}',
        body: '<p>Dear {{prenom}} {{nom}}</p>',
        variables: { extra: 'data' }
      },
      { id: '1' },
      {},
      { id: 10 }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({
      messageId: 'msg-456',
      logId: 789
    });

    await utilisateurController.sendEmail(req, res);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        utilisateurId: 1,
        subject: 'Hello John',
        html: '<p>Dear John Doe</p>',
        metadata: {
          destinataire_nom: 'John Doe',
          sent_by: 10,
          mode: 'custom'
        }
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Email envoye avec succes',
      messageId: 'msg-456',
      logId: 789
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks(
      { mode: 'custom', subject: 'Test', body: 'Test' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

    await utilisateurController.sendEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('utilisateurController - sendSms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'TEST' },
      { id: '999' }
    );

    Utilisateur.findByPk.mockResolvedValue(null);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Usager non trouve'
    });
  });

  it('devrait retourner 400 si utilisateur sans telephone', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      telephone: null
    };

    const { req, res } = createMocks(
      { mode: 'custom', body: 'Test SMS' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'L\'usager n\'a pas de numero de telephone'
    });
  });

  it('devrait retourner 400 si mode template sans templateCode', async () => {
    const mockUtilisateur = {
      id: 1,
      telephone: '0612345678'
    };

    const { req, res } = createMocks({ mode: 'template' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Template code is required'
    });
  });

  it('devrait retourner 404 si template non trouve', async () => {
    const mockUtilisateur = {
      id: 1,
      telephone: '0612345678'
    };

    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'NONEXISTENT' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TemplateMessage.findByCode.mockResolvedValue(null);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Template not found'
    });
  });

  it('devrait retourner 400 si mode custom sans body', async () => {
    const mockUtilisateur = {
      id: 1,
      telephone: '0612345678'
    };

    const { req, res } = createMocks({ mode: 'custom' }, { id: '1' });

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'SMS body is required'
    });
  });

  it('devrait retourner 400 si SMS depasse 480 caracteres', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const longText = 'x'.repeat(481);

    const { req, res } = createMocks(
      { mode: 'custom', body: longText },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Le SMS depasse 480 caracteres (max 3 segments)'
    });
  });

  it('devrait retourner 400 si aucune configuration SMS active', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const { req, res } = createMocks(
      { mode: 'custom', body: 'Test SMS' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    ConfigurationSMS.findOne.mockResolvedValue(null);

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Configuration error',
      message: 'Aucune configuration SMS active.'
    });
  });

  it('devrait envoyer SMS en mode custom', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const { req, res } = createMocks(
      { mode: 'custom', body: 'Bonjour {{prenom}}!', variables: { extra: 'data' } },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    ConfigurationSMS.findOne.mockResolvedValue({ id: 1, actif: true });
    smsService.sendSMS.mockResolvedValue({
      success: true,
      ticket: 'SMS-123'
    });

    await utilisateurController.sendSms(req, res);

    expect(smsService.sendSMS).toHaveBeenCalledWith(1, {
      to: '+33612345678',
      text: 'Bonjour John!',
      adherent_id: 1,
      destinataire_nom: 'John Doe',
      template_code: null
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'SMS envoye avec succes',
      to: '0612345678',
      text: 'Bonjour John!',
      mode: 'custom',
      ticket: 'SMS-123',
      smsLogId: undefined
    });
  });

  it('devrait envoyer SMS en mode template', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const mockTemplate = {
      compileSMS: jest.fn().mockReturnValue('Bonjour John!')
    };

    const { req, res } = createMocks(
      { mode: 'template', templateCode: 'TEST_SMS' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TemplateMessage.findByCode.mockResolvedValue(mockTemplate);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    ConfigurationSMS.findOne.mockResolvedValue({ id: 1, actif: true });
    smsService.sendSMS.mockResolvedValue({
      success: true,
      ticket: 'SMS-456',
      smsLogId: 789
    });

    await utilisateurController.sendSms(req, res);

    expect(smsService.sendSMS).toHaveBeenCalledWith(1, {
      to: '+33612345678',
      text: 'Bonjour John!',
      adherent_id: 1,
      destinataire_nom: 'John Doe',
      template_code: 'TEST_SMS'
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'SMS envoye avec succes',
      to: '0612345678',
      text: 'Bonjour John!',
      mode: 'template',
      ticket: 'SMS-456',
      smsLogId: 789
    });
  });

  it('devrait normaliser numero francais commencant par 0', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const { req, res } = createMocks(
      { mode: 'custom', body: 'Test' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    ConfigurationSMS.findOne.mockResolvedValue({ id: 1 });
    smsService.sendSMS.mockResolvedValue({ success: true });

    await utilisateurController.sendSms(req, res);

    expect(smsService.sendSMS).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ to: '+33612345678' })
    );
  });

  it('devrait retourner 500 si envoi SMS echoue', async () => {
    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      telephone: '0612345678'
    };

    const { req, res } = createMocks(
      { mode: 'custom', body: 'Test' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    eventTriggerService.prepareEmpruntsVariables.mockResolvedValue({});
    ConfigurationSMS.findOne.mockResolvedValue({ id: 1 });
    smsService.sendSMS.mockResolvedValue({
      success: false,
      error: 'API error'
    });

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'SMS error',
      message: 'API error'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks(
      { mode: 'custom', body: 'Test' },
      { id: '1' }
    );

    Utilisateur.findByPk.mockRejectedValue(new Error('Database error'));

    await utilisateurController.sendSms(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});
