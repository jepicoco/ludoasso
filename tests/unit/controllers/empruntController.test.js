/**
 * Tests unitaires pour empruntController
 * Gestion des emprunts (jeux, livres, films, disques)
 */

const empruntController = require('../../../backend/controllers/empruntController');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, params = {}, query = {}, user = null) => {
  const req = {
    body,
    params,
    query,
    user
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
  Emprunt: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Utilisateur: {
    findByPk: jest.fn()
  },
  Jeu: {
    findByPk: jest.fn()
  },
  sequelize: {
    transaction: jest.fn()
  },
  Op: {
    lt: Symbol('lt'),
    in: Symbol('in')
  },
  Transaction: {
    ISOLATION_LEVELS: {
      READ_COMMITTED: 'READ COMMITTED'
    },
    LOCK: {
      UPDATE: 'UPDATE'
    }
  }
}));

// Mock des services
jest.mock('../../../backend/services/eventTriggerService', () => ({
  triggerEmpruntCreated: jest.fn(),
  triggerEmpruntReturned: jest.fn()
}));

const { Emprunt, Utilisateur, Jeu, sequelize, Op, Transaction } = require('../../../backend/models');
const eventTriggerService = require('../../../backend/services/eventTriggerService');

describe('empruntController - getAllEmprunts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les emprunts avec pagination par defaut', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockEmprunts = [
      {
        id: 1,
        utilisateur_id: 1,
        jeu_id: 1,
        statut: 'en_cours',
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          utilisateur: { id: 1, nom: 'Doe', prenom: 'John' },
          jeu: { id: 1, titre: 'Catan' }
        })
      },
      {
        id: 2,
        utilisateur_id: 2,
        jeu_id: 2,
        statut: 'retourne',
        toJSON: jest.fn().mockReturnValue({
          id: 2,
          utilisateur: { id: 2, nom: 'Smith', prenom: 'Jane' },
          jeu: { id: 2, titre: 'Azul' }
        })
      }
    ];

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockEmprunts
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ],
      limit: 50,
      offset: 0,
      order: [['date_emprunt', 'DESC']]
    });

    expect(res.json).toHaveBeenCalledWith({
      emprunts: expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          adherent: { id: 1, nom: 'Doe', prenom: 'John' }
        }),
        expect.objectContaining({
          id: 2,
          adherent: { id: 2, nom: 'Smith', prenom: 'Jane' }
        })
      ]),
      pagination: {
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      }
    });
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'en_cours' });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        id: 1,
        statut: 'en_cours',
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          statut: 'en_cours',
          utilisateur: {},
          jeu: {}
        })
      }]
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'en_cours' }
      })
    );
  });

  it('devrait filtrer par utilisateur_id', async () => {
    const { req, res } = createMocks({}, {}, { utilisateur_id: '1' });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          utilisateur_id: 1,
          utilisateur: {},
          jeu: {}
        })
      }]
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { utilisateur_id: '1' }
      })
    );
  });

  it('devrait supporter adherent_id pour retrocompatibilite', async () => {
    const { req, res } = createMocks({}, {}, { adherent_id: '1' });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          utilisateur_id: 1,
          utilisateur: {},
          jeu: {}
        })
      }]
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { utilisateur_id: '1' }
      })
    );
  });

  it('devrait filtrer par jeu_id', async () => {
    const { req, res } = createMocks({}, {}, { jeu_id: '5' });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          jeu_id: 5,
          utilisateur: {},
          jeu: {}
        })
      }]
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jeu_id: '5' }
      })
    );
  });

  it('devrait supporter la pagination personnalisee', async () => {
    const { req, res } = createMocks({}, {}, { page: '2', limit: '10' });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 25,
      rows: []
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
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
    const { req, res } = createMocks({}, {}, {
      statut: 'en_cours',
      utilisateur_id: '1',
      jeu_id: '5'
    });

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          utilisateur: {},
          jeu: {}
        })
      }]
    });

    await empruntController.getAllEmprunts(req, res);

    expect(Emprunt.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          statut: 'en_cours',
          utilisateur_id: '1',
          jeu_id: '5'
        }
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, {}, {});

    const dbError = new Error('Database connection failed');
    Emprunt.findAndCountAll.mockRejectedValue(dbError);

    await empruntController.getAllEmprunts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('empruntController - getEmpruntById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un emprunt par son ID', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmprunt = {
      id: 1,
      utilisateur_id: 1,
      jeu_id: 1,
      statut: 'en_cours',
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur_id: 1,
        jeu_id: 1,
        statut: 'en_cours',
        utilisateur: { id: 1, nom: 'Doe', prenom: 'John' },
        jeu: { id: 1, titre: 'Catan' }
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.getEmpruntById(req, res);

    expect(Emprunt.findByPk).toHaveBeenCalledWith('1', {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    expect(res.json).toHaveBeenCalledWith({
      emprunt: expect.objectContaining({
        id: 1,
        adherent: { id: 1, nom: 'Doe', prenom: 'John' }
      })
    });
  });

  it('devrait retourner 404 si emprunt non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Emprunt.findByPk.mockResolvedValue(null);

    await empruntController.getEmpruntById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Emprunt not found'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const dbError = new Error('Database connection failed');
    Emprunt.findByPk.mockRejectedValue(dbError);

    await empruntController.getEmpruntById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('empruntController - createEmprunt', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('devrait creer un emprunt avec succes', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1,
      date_retour_prevue: '2024-12-31',
      commentaire: 'Premier emprunt'
    });

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      statut: 'disponible',
      estDisponible: jest.fn().mockReturnValue(true),
      save: jest.fn()
    };

    const mockEmprunt = {
      id: 1,
      utilisateur_id: 1,
      jeu_id: 1,
      statut: 'en_cours',
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur_id: 1,
        jeu_id: 1,
        statut: 'en_cours',
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.create.mockResolvedValue(mockEmprunt);

    await empruntController.createEmprunt(req, res);

    expect(sequelize.transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        isolationLevel: expect.anything()
      })
    );

    expect(Utilisateur.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
    expect(Jeu.findByPk).toHaveBeenCalledWith(1, {
      transaction: mockTransaction,
      lock: Transaction.LOCK.UPDATE
    });

    expect(Emprunt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateur_id: 1,
        jeu_id: 1,
        statut: 'en_cours',
        commentaire: 'Premier emprunt'
      }),
      { transaction: mockTransaction }
    );

    expect(mockJeu.statut).toBe('emprunte');
    expect(mockJeu.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(eventTriggerService.triggerEmpruntCreated).toHaveBeenCalledWith(
      mockEmprunt,
      mockUtilisateur,
      mockJeu
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Emprunt created successfully',
      emprunt: expect.objectContaining({
        id: 1,
        adherent: mockUtilisateur
      })
    });
  });

  it('devrait supporter adherent_id pour retrocompatibilite', async () => {
    const { req, res } = createMocks({
      adherent_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      statut: 'disponible',
      estDisponible: jest.fn().mockReturnValue(true),
      save: jest.fn()
    };

    const mockEmprunt = {
      id: 1,
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.create.mockResolvedValue(mockEmprunt);

    await empruntController.createEmprunt(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait calculer date_retour_prevue par defaut (14 jours)', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      statut: 'disponible',
      estDisponible: jest.fn().mockReturnValue(true),
      save: jest.fn()
    };

    const mockEmprunt = {
      id: 1,
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.create.mockResolvedValue(mockEmprunt);

    await empruntController.createEmprunt(req, res);

    expect(Emprunt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        date_retour_prevue: expect.any(Date)
      }),
      { transaction: mockTransaction }
    );

    const createCall = Emprunt.create.mock.calls[0][0];
    const dateRetour = createCall.date_retour_prevue;
    const dateEmprunt = createCall.date_emprunt;
    const diffDays = Math.floor((dateRetour - dateEmprunt) / (1000 * 60 * 60 * 24));

    expect(diffDays).toBe(14);
  });

  it('devrait retourner 400 si utilisateur_id manquant', async () => {
    const { req, res } = createMocks({
      jeu_id: 1
    });

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'utilisateur_id (ou adherent_id) and jeu_id are required'
    });
  });

  it('devrait retourner 400 si jeu_id manquant', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1
    });

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 999,
      jeu_id: 1
    });

    Utilisateur.findByPk.mockResolvedValue(null);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Utilisateur not found'
    });
  });

  it('devrait retourner 403 si utilisateur suspendu', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'suspendu'
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Utilisateur account is suspendu. Only active members can borrow games.'
    });
  });

  it('devrait retourner 403 si utilisateur inactif', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'inactif'
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('devrait retourner 404 si jeu non trouve', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 999
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(null);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Jeu not found'
    });
  });

  it('devrait retourner 400 si jeu non disponible', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      statut: 'emprunte',
      estDisponible: jest.fn().mockReturnValue(false)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Game not available',
      message: 'Game is currently emprunte'
    });
  });

  it('devrait rollback la transaction en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const dbError = new Error('Database connection failed');
    Utilisateur.findByPk.mockRejectedValue(dbError);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      statut: 'disponible',
      estDisponible: jest.fn().mockReturnValue(true),
      save: jest.fn()
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);

    const validationError = new Error('Validation error');
    validationError.name = 'SequelizeValidationError';
    validationError.errors = [
      { message: 'Date invalide' },
      { message: 'Commentaire trop long' }
    ];

    Emprunt.create.mockRejectedValue(validationError);

    await empruntController.createEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Date invalide, Commentaire trop long'
    });
  });

  it('ne devrait pas bloquer la creation si l\'event trigger echoue', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      jeu_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      statut: 'actif'
    };

    const mockJeu = {
      id: 1,
      statut: 'disponible',
      estDisponible: jest.fn().mockReturnValue(true),
      save: jest.fn()
    };

    const mockEmprunt = {
      id: 1,
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.create.mockResolvedValue(mockEmprunt);

    // Event trigger echoue mais ne doit pas bloquer
    eventTriggerService.triggerEmpruntCreated.mockRejectedValue(new Error('Email service down'));

    await empruntController.createEmprunt(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Emprunt created successfully'
      })
    );
  });
});

describe('empruntController - retourEmprunt', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('devrait retourner un emprunt avec succes', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      statut: 'emprunte',
      save: jest.fn()
    };

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John'
    };

    const mockEmprunt = {
      id: 1,
      statut: 'en_cours',
      date_retour_effective: null,
      jeu: mockJeu,
      utilisateur: mockUtilisateur,
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        statut: 'retourne',
        date_retour_effective: new Date(),
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.retourEmprunt(req, res);

    expect(Emprunt.findByPk).toHaveBeenCalledWith('1', {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ],
      transaction: mockTransaction,
      lock: Transaction.LOCK.UPDATE
    });

    expect(mockEmprunt.statut).toBe('retourne');
    expect(mockEmprunt.date_retour_effective).toBeInstanceOf(Date);
    expect(mockEmprunt.save).toHaveBeenCalledWith({ transaction: mockTransaction });

    expect(mockJeu.statut).toBe('disponible');
    expect(mockJeu.save).toHaveBeenCalledWith({ transaction: mockTransaction });

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(eventTriggerService.triggerEmpruntReturned).toHaveBeenCalledWith(
      mockEmprunt,
      mockUtilisateur,
      mockJeu
    );

    expect(res.json).toHaveBeenCalledWith({
      message: 'Game returned successfully',
      emprunt: expect.objectContaining({
        id: 1,
        statut: 'retourne',
        adherent: mockUtilisateur
      })
    });
  });

  it('devrait retourner 404 si emprunt non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Emprunt.findByPk.mockResolvedValue(null);

    await empruntController.retourEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Emprunt not found'
    });
  });

  it('devrait retourner 400 si emprunt deja retourne', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmprunt = {
      id: 1,
      statut: 'retourne',
      date_retour_effective: new Date('2024-01-15')
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.retourEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Already returned',
      message: 'This game has already been returned'
    });
  });

  it('devrait fonctionner meme si jeu est null', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John'
    };

    const mockEmprunt = {
      id: 1,
      statut: 'en_cours',
      jeu: null, // Pas de jeu associe
      utilisateur: mockUtilisateur,
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        statut: 'retourne',
        utilisateur: mockUtilisateur,
        jeu: null
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.retourEmprunt(req, res);

    expect(mockEmprunt.statut).toBe('retourne');
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Game returned successfully'
      })
    );
  });

  it('devrait rollback la transaction en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const dbError = new Error('Database connection failed');
    Emprunt.findByPk.mockRejectedValue(dbError);

    await empruntController.retourEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });

  it('ne devrait pas bloquer le retour si l\'event trigger echoue', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      statut: 'emprunte',
      save: jest.fn()
    };

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe'
    };

    const mockEmprunt = {
      id: 1,
      statut: 'en_cours',
      jeu: mockJeu,
      utilisateur: mockUtilisateur,
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);
    eventTriggerService.triggerEmpruntReturned.mockRejectedValue(new Error('Email service down'));

    await empruntController.retourEmprunt(req, res);

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Game returned successfully'
      })
    );
  });
});

describe('empruntController - updateEmprunt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour les champs autorises', async () => {
    const { req, res } = createMocks(
      {
        date_retour_prevue: '2024-12-31',
        commentaire: 'Prolongation accordee',
        statut: 'en_cours'
      },
      { id: '1' }
    );

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John'
    };

    const mockJeu = {
      id: 1,
      titre: 'Catan'
    };

    const mockEmprunt = {
      id: 1,
      date_retour_prevue: new Date('2024-12-15'),
      commentaire: 'Ancien commentaire',
      statut: 'en_cours',
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        date_retour_prevue: new Date('2024-12-31'),
        commentaire: 'Prolongation accordee',
        statut: 'en_cours',
        utilisateur: mockUtilisateur,
        jeu: mockJeu
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.updateEmprunt(req, res);

    expect(mockEmprunt.save).toHaveBeenCalled();
    expect(mockEmprunt.reload).toHaveBeenCalledWith({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    expect(res.json).toHaveBeenCalledWith({
      message: 'Emprunt updated successfully',
      emprunt: expect.objectContaining({
        id: 1,
        adherent: mockUtilisateur
      })
    });
  });

  it('devrait mettre a jour seulement les champs fournis', async () => {
    const { req, res } = createMocks(
      {
        commentaire: 'Nouveau commentaire'
      },
      { id: '1' }
    );

    const mockEmprunt = {
      id: 1,
      date_retour_prevue: new Date('2024-12-15'),
      commentaire: 'Ancien commentaire',
      statut: 'en_cours',
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        commentaire: 'Nouveau commentaire',
        utilisateur: {},
        jeu: {}
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.updateEmprunt(req, res);

    expect(mockEmprunt.commentaire).toBe('Nouveau commentaire');
    expect(mockEmprunt.save).toHaveBeenCalled();
  });

  it('devrait permettre de vider le commentaire', async () => {
    const { req, res } = createMocks(
      {
        commentaire: null
      },
      { id: '1' }
    );

    const mockEmprunt = {
      id: 1,
      commentaire: 'Ancien commentaire',
      save: jest.fn(),
      reload: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        commentaire: null,
        utilisateur: {},
        jeu: {}
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.updateEmprunt(req, res);

    expect(mockEmprunt.commentaire).toBeNull();
    expect(mockEmprunt.save).toHaveBeenCalled();
  });

  it('devrait retourner 404 si emprunt non trouve', async () => {
    const { req, res } = createMocks(
      { commentaire: 'Test' },
      { id: '999' }
    );

    Emprunt.findByPk.mockResolvedValue(null);

    await empruntController.updateEmprunt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Emprunt not found'
    });
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks(
      { commentaire: 'x'.repeat(5000) },
      { id: '1' }
    );

    const mockEmprunt = {
      id: 1,
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeValidationError',
        errors: [
          { message: 'Commentaire trop long' }
        ]
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.updateEmprunt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Commentaire trop long'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks(
      { commentaire: 'Test' },
      { id: '1' }
    );

    const dbError = new Error('Database connection failed');
    Emprunt.findByPk.mockRejectedValue(dbError);

    await empruntController.updateEmprunt(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('empruntController - deleteEmprunt', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('devrait supprimer un emprunt retourne', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmprunt = {
      id: 1,
      statut: 'retourne',
      jeu: {
        id: 1,
        statut: 'disponible'
      },
      destroy: jest.fn()
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.deleteEmprunt(req, res);

    expect(Emprunt.findByPk).toHaveBeenCalledWith('1', {
      include: [{ model: Jeu, as: 'jeu' }],
      transaction: mockTransaction,
      lock: Transaction.LOCK.UPDATE
    });

    expect(mockEmprunt.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: 'Emprunt deleted successfully'
    });
  });

  it('devrait remettre le jeu disponible si emprunt actif', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      statut: 'emprunte',
      save: jest.fn()
    };

    const mockEmprunt = {
      id: 1,
      statut: 'en_cours',
      jeu: mockJeu,
      destroy: jest.fn()
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.deleteEmprunt(req, res);

    expect(mockJeu.statut).toBe('disponible');
    expect(mockJeu.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockEmprunt.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('devrait fonctionner si jeu est null', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmprunt = {
      id: 1,
      statut: 'en_cours',
      jeu: null,
      destroy: jest.fn()
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.deleteEmprunt(req, res);

    expect(mockEmprunt.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('devrait retourner 404 si emprunt non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Emprunt.findByPk.mockResolvedValue(null);

    await empruntController.deleteEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Emprunt not found'
    });
  });

  it('devrait rollback la transaction en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const dbError = new Error('Database connection failed');
    Emprunt.findByPk.mockRejectedValue(dbError);

    await empruntController.deleteEmprunt(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('empruntController - getOverdueEmprunts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les emprunts en retard', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockEmprunts = [
      {
        id: 1,
        statut: 'en_retard',
        date_retour_prevue: new Date('2024-01-01'),
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          statut: 'en_retard',
          date_retour_prevue: new Date('2024-01-01'),
          utilisateur: { id: 1, nom: 'Doe', prenom: 'John' },
          jeu: { id: 1, titre: 'Catan' }
        })
      },
      {
        id: 2,
        statut: 'en_retard',
        date_retour_prevue: new Date('2024-01-05'),
        toJSON: jest.fn().mockReturnValue({
          id: 2,
          statut: 'en_retard',
          date_retour_prevue: new Date('2024-01-05'),
          utilisateur: { id: 2, nom: 'Smith', prenom: 'Jane' },
          jeu: { id: 2, titre: 'Azul' }
        })
      }
    ];

    Emprunt.update.mockResolvedValue([2]); // 2 lignes mises a jour
    Emprunt.findAll.mockResolvedValue(mockEmprunts);

    await empruntController.getOverdueEmprunts(req, res);

    // Verifier que la mise a jour a ete appelee avec une date (peu importe laquelle)
    expect(Emprunt.update).toHaveBeenCalledWith(
      { statut: 'en_retard' },
      expect.objectContaining({
        where: expect.objectContaining({
          statut: 'en_cours'
        })
      })
    );

    // Verifier que findAll a ete appele avec les bons parametres
    expect(Emprunt.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [
          { model: Utilisateur, as: 'utilisateur' },
          { model: Jeu, as: 'jeu' }
        ],
        order: [['date_retour_prevue', 'ASC']]
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      emprunts: expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          adherent: { id: 1, nom: 'Doe', prenom: 'John' }
        }),
        expect.objectContaining({
          id: 2,
          adherent: { id: 2, nom: 'Smith', prenom: 'Jane' }
        })
      ]),
      total: 2
    });
  });

  it('devrait retourner une liste vide si aucun emprunt en retard', async () => {
    const { req, res } = createMocks({}, {}, {});

    Emprunt.update.mockResolvedValue([0]);
    Emprunt.findAll.mockResolvedValue([]);

    await empruntController.getOverdueEmprunts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      emprunts: [],
      total: 0
    });
  });

  it('devrait trier par date_retour_prevue croissante', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockEmprunts = [
      {
        id: 1,
        date_retour_prevue: new Date('2024-01-01'),
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          date_retour_prevue: new Date('2024-01-01'),
          utilisateur: {},
          jeu: {}
        })
      },
      {
        id: 2,
        date_retour_prevue: new Date('2024-01-05'),
        toJSON: jest.fn().mockReturnValue({
          id: 2,
          date_retour_prevue: new Date('2024-01-05'),
          utilisateur: {},
          jeu: {}
        })
      }
    ];

    Emprunt.update.mockResolvedValue([2]);
    Emprunt.findAll.mockResolvedValue(mockEmprunts);

    await empruntController.getOverdueEmprunts(req, res);

    expect(Emprunt.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['date_retour_prevue', 'ASC']]
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({}, {}, {});

    const dbError = new Error('Database connection failed');
    Emprunt.update.mockRejectedValue(dbError);

    await empruntController.getOverdueEmprunts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection failed'
    });
  });
});

describe('empruntController - Retrocompatibilite adherent/utilisateur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllEmprunts - devrait ajouter alias adherent dans toutes les reponses', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockEmprunts = [{
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: { id: 1, nom: 'Doe' }
      })
    }];

    Emprunt.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: mockEmprunts
    });

    await empruntController.getAllEmprunts(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        emprunts: expect.arrayContaining([
          expect.objectContaining({
            adherent: { id: 1, nom: 'Doe' },
            utilisateur: { id: 1, nom: 'Doe' }
          })
        ])
      })
    );
  });

  it('getEmpruntById - devrait ajouter alias adherent', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmprunt = {
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: { id: 1, nom: 'Doe' }
      })
    };

    Emprunt.findByPk.mockResolvedValue(mockEmprunt);

    await empruntController.getEmpruntById(req, res);

    expect(res.json).toHaveBeenCalledWith({
      emprunt: expect.objectContaining({
        adherent: { id: 1, nom: 'Doe' },
        utilisateur: { id: 1, nom: 'Doe' }
      })
    });
  });

  it('getOverdueEmprunts - devrait ajouter alias adherent', async () => {
    const { req, res } = createMocks({}, {}, {});

    const mockEmprunts = [{
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur: { id: 1, nom: 'Doe' }
      })
    }];

    Emprunt.update.mockResolvedValue([1]);
    Emprunt.findAll.mockResolvedValue(mockEmprunts);

    await empruntController.getOverdueEmprunts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      emprunts: expect.arrayContaining([
        expect.objectContaining({
          adherent: { id: 1, nom: 'Doe' },
          utilisateur: { id: 1, nom: 'Doe' }
        })
      ]),
      total: 1
    });
  });
});
