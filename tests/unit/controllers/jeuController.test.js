/**
 * Tests unitaires pour jeuController
 * Gestion des jeux de la ludotheque avec relations normalisees
 */

const jeuController = require('../../../backend/controllers/jeuController');
const { Op } = require('sequelize');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, params = {}, query = {}) => {
  const req = {
    body,
    params,
    query
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
  Jeu: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn()
  },
  Emprunt: {
    count: jest.fn()
  },
  Utilisateur: {
    findByPk: jest.fn()
  },
  Categorie: {
    findAll: jest.fn()
  },
  Theme: {
    findAll: jest.fn()
  },
  Mecanisme: {
    findAll: jest.fn()
  },
  Langue: {
    findAll: jest.fn()
  },
  Editeur: {
    findAll: jest.fn()
  },
  Auteur: {
    findAll: jest.fn()
  },
  Illustrateur: {
    findAll: jest.fn()
  },
  Gamme: {
    findByPk: jest.fn()
  },
  EmplacementJeu: {
    findByPk: jest.fn()
  },
  JeuCategorie: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuTheme: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuMecanisme: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuLangue: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuEditeur: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuAuteur: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  JeuIllustrateur: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  Op: {
    ne: Symbol('ne'),
    lt: Symbol('lt'),
    lte: Symbol('lte'),
    gt: Symbol('gt'),
    gte: Symbol('gte'),
    in: Symbol('in'),
    or: Symbol('or'),
    like: Symbol('like'),
    between: Symbol('between')
  }
}));

// Mock du service eanLookupService
jest.mock('../../../backend/services/eanLookupService', () => ({
  lookupEAN: jest.fn(),
  lookupByTitle: jest.fn()
}));

const {
  Jeu, Emprunt, Utilisateur, Categorie, Theme, Mecanisme, Langue,
  Editeur, Auteur, Illustrateur, Gamme, EmplacementJeu,
  JeuCategorie, JeuTheme, JeuMecanisme, JeuLangue,
  JeuEditeur, JeuAuteur, JeuIllustrateur
} = require('../../../backend/models');
const eanLookupService = require('../../../backend/services/eanLookupService');

describe('jeuController - getAllJeux', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les jeux avec pagination', async () => {
    const { req, res } = createMocks();

    const mockJeux = [
      { id: 1, titre: 'Catan', statut: 'disponible' },
      { id: 2, titre: 'Carcassonne', statut: 'disponible' }
    ];

    Jeu.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockJeux
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 50,
      offset: 0,
      order: [['titre', 'ASC']],
      distinct: true
    });

    expect(res.json).toHaveBeenCalledWith({
      jeux: mockJeux,
      pagination: {
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      }
    });
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'emprunte' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'emprunte' }
      })
    );
  });

  it('devrait filtrer par age_min', async () => {
    const { req, res } = createMocks({}, {}, { age_min: '8' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          age_min: expect.any(Object)
        })
      })
    );
  });

  it('devrait filtrer par nb_joueurs', async () => {
    const { req, res } = createMocks({}, {}, { nb_joueurs: '4' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nb_joueurs_min: expect.any(Object),
          nb_joueurs_max: expect.any(Object)
        })
      })
    );
  });

  it('devrait rechercher par texte dans plusieurs champs', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Catan' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ id: 1, titre: 'Catan' }]
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.arrayContaining([
            expect.objectContaining({ titre: expect.any(Object) }),
            expect.objectContaining({ editeur: expect.any(Object) }),
            expect.objectContaining({ auteur: expect.any(Object) }),
            expect.objectContaining({ code_barre: expect.any(Object) }),
            expect.objectContaining({ ean: expect.any(Object) })
          ])
        })
      })
    );
  });

  it('devrait supporter le filtre categorie legacy', async () => {
    const { req, res } = createMocks({}, {}, { categorie: 'Strategie' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: expect.any(Object)
        })
      })
    );
  });

  it('devrait filtrer par categorie_id avec sous-requete', async () => {
    const { req, res } = createMocks({}, {}, { categorie_id: '1' });

    JeuCategorie.findAll.mockResolvedValue([
      { jeu_id: 1 },
      { jeu_id: 2 }
    ]);

    Jeu.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(JeuCategorie.findAll).toHaveBeenCalledWith({
      attributes: ['jeu_id'],
      where: { categorie_id: 1 }
    });

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: expect.any(Object)
        })
      })
    );
  });

  it('devrait filtrer par theme_id avec sous-requete', async () => {
    const { req, res } = createMocks({}, {}, { theme_id: '2' });

    JeuTheme.findAll.mockResolvedValue([
      { jeu_id: 3 },
      { jeu_id: 4 }
    ]);

    Jeu.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(JeuTheme.findAll).toHaveBeenCalledWith({
      attributes: ['jeu_id'],
      where: { theme_id: 2 }
    });
  });

  it('devrait filtrer par mecanisme_id avec sous-requete', async () => {
    const { req, res } = createMocks({}, {}, { mecanisme_id: '3' });

    JeuMecanisme.findAll.mockResolvedValue([
      { jeu_id: 5 },
      { jeu_id: 6 }
    ]);

    Jeu.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(JeuMecanisme.findAll).toHaveBeenCalledWith({
      attributes: ['jeu_id'],
      where: { mecanisme_id: 3 }
    });
  });

  it('devrait combiner plusieurs filtres par ID', async () => {
    const { req, res } = createMocks({}, {}, { categorie_id: '1', theme_id: '2' });

    JeuCategorie.findAll.mockResolvedValue([
      { jeu_id: 1 },
      { jeu_id: 2 },
      { jeu_id: 3 }
    ]);

    JeuTheme.findAll.mockResolvedValue([
      { jeu_id: 2 },
      { jeu_id: 3 },
      { jeu_id: 4 }
    ]);

    Jeu.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(JeuCategorie.findAll).toHaveBeenCalled();
    expect(JeuTheme.findAll).toHaveBeenCalled();
  });

  it('devrait inclure les references si demande', async () => {
    const { req, res } = createMocks({}, {}, { include_refs: 'true' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ model: Categorie, as: 'categoriesRef' }),
          expect.objectContaining({ model: Theme, as: 'themesRef' }),
          expect.objectContaining({ model: Mecanisme, as: 'mecanismesRef' }),
          expect.objectContaining({ model: Langue, as: 'languesRef' }),
          expect.objectContaining({ model: Editeur, as: 'editeursRef' }),
          expect.objectContaining({ model: Auteur, as: 'auteursRef' }),
          expect.objectContaining({ model: Illustrateur, as: 'illustrateursRef' }),
          expect.objectContaining({ model: Gamme, as: 'gammeRef' }),
          expect.objectContaining({ model: EmplacementJeu, as: 'emplacementRef' })
        ])
      })
    );
  });

  it('devrait gerer la pagination personnalisee', async () => {
    const { req, res } = createMocks({}, {}, { page: '2', limit: '10' });

    Jeu.findAndCountAll.mockResolvedValue({
      count: 25,
      rows: []
    });

    await jeuController.getAllJeux(req, res);

    expect(Jeu.findAndCountAll).toHaveBeenCalledWith(
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

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Jeu.findAndCountAll.mockRejectedValue(error);

    await jeuController.getAllJeux(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - getJeuById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un jeu par ID avec toutes les associations', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      statut: 'disponible',
      categoriesRef: [{ id: 1, nom: 'Strategie' }],
      themesRef: [],
      emprunts: []
    };

    Jeu.findByPk.mockResolvedValue(mockJeu);

    await jeuController.getJeuById(req, res);

    expect(Jeu.findByPk).toHaveBeenCalledWith('1', {
      include: expect.arrayContaining([
        expect.objectContaining({ model: Categorie, as: 'categoriesRef' }),
        expect.objectContaining({ model: Theme, as: 'themesRef' }),
        expect.objectContaining({ model: Mecanisme, as: 'mecanismesRef' }),
        expect.objectContaining({ model: Langue, as: 'languesRef' }),
        expect.objectContaining({ model: Editeur, as: 'editeursRef' }),
        expect.objectContaining({ model: Auteur, as: 'auteursRef' }),
        expect.objectContaining({ model: Illustrateur, as: 'illustrateursRef' }),
        expect.objectContaining({ model: Gamme, as: 'gammeRef' }),
        expect.objectContaining({ model: EmplacementJeu, as: 'emplacementRef' }),
        expect.objectContaining({
          model: Emprunt,
          as: 'emprunts',
          include: expect.arrayContaining([
            expect.objectContaining({ model: Utilisateur, as: 'adherent' })
          ])
        })
      ])
    });

    expect(res.json).toHaveBeenCalledWith({ jeu: mockJeu });
  });

  it('devrait retourner 404 si jeu non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Jeu.findByPk.mockResolvedValue(null);

    await jeuController.getJeuById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Jeu not found'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Jeu.findByPk.mockRejectedValue(error);

    await jeuController.getJeuById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - createJeu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer un jeu avec succes', async () => {
    const { req, res } = createMocks({
      titre: 'Catan',
      editeur: 'Filosofia',
      age_min: 10,
      nb_joueurs_min: 3,
      nb_joueurs_max: 4,
      statut: 'disponible'
    });

    const mockCreatedJeu = {
      id: 1,
      titre: 'Catan',
      editeur: 'Filosofia',
      statut: 'disponible'
    };

    const mockJeuComplet = {
      id: 1,
      titre: 'Catan',
      categoriesRef: []
    };

    Jeu.create.mockResolvedValue(mockCreatedJeu);
    Jeu.findByPk.mockResolvedValue(mockJeuComplet);

    await jeuController.createJeu(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Catan',
        editeur: 'Filosofia',
        age_min: 10,
        nb_joueurs_min: 3,
        nb_joueurs_max: 4,
        statut: 'disponible'
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Jeu created successfully',
      jeu: mockJeuComplet
    });
  });

  it('devrait creer un jeu avec toutes les proprietes', async () => {
    const { req, res } = createMocks({
      titre: 'Catan',
      sous_titre: 'Edition Deluxe',
      type_jeu: 'basegame',
      editeur: 'Filosofia',
      auteur: 'Klaus Teuber',
      illustrateur: 'Michael Menzel',
      annee_sortie: 1995,
      age_min: 10,
      nb_joueurs_min: 3,
      nb_joueurs_max: 4,
      duree_partie: 90,
      description: 'Un jeu de gestion de ressources',
      regles_url: 'https://example.com/regles.pdf',
      image_url: 'https://example.com/image.jpg',
      prix_achat: 45.99,
      prix_indicatif: 49.99,
      ean: '1234567890123',
      id_externe: 13,
      notes: 'Jeu très populaire',
      emplacement_id: 1,
      gamme_id: 2
    });

    const mockCreatedJeu = { id: 1 };
    Jeu.create.mockResolvedValue(mockCreatedJeu);
    Jeu.findByPk.mockResolvedValue({ id: 1, titre: 'Catan' });

    await jeuController.createJeu(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Catan',
        sous_titre: 'Edition Deluxe',
        type_jeu: 'basegame',
        editeur: 'Filosofia',
        auteur: 'Klaus Teuber',
        illustrateur: 'Michael Menzel',
        annee_sortie: 1995,
        age_min: 10,
        nb_joueurs_min: 3,
        nb_joueurs_max: 4,
        duree_partie: 90,
        description: 'Un jeu de gestion de ressources',
        regles_url: 'https://example.com/regles.pdf',
        image_url: 'https://example.com/image.jpg',
        prix_achat: 45.99,
        prix_indicatif: 49.99,
        ean: '1234567890123',
        id_externe: 13,
        notes: 'Jeu très populaire',
        emplacement_id: 1,
        gamme_id: 2,
        statut: 'disponible'
      })
    );
  });

  it('devrait synchroniser les relations many-to-many', async () => {
    const { req, res } = createMocks({
      titre: 'Catan',
      categorie_ids: [1, 2],
      theme_ids: [3],
      mecanisme_ids: [4, 5],
      langue_ids: [1],
      editeur_ids: [1],
      auteur_ids: [1, 2],
      illustrateur_ids: [1]
    });

    const mockCreatedJeu = { id: 1, titre: 'Catan' };
    Jeu.create.mockResolvedValue(mockCreatedJeu);
    Jeu.findByPk.mockResolvedValue(mockCreatedJeu);

    JeuCategorie.destroy.mockResolvedValue(0);
    JeuCategorie.bulkCreate.mockResolvedValue([]);
    JeuTheme.destroy.mockResolvedValue(0);
    JeuTheme.bulkCreate.mockResolvedValue([]);
    JeuMecanisme.destroy.mockResolvedValue(0);
    JeuMecanisme.bulkCreate.mockResolvedValue([]);
    JeuLangue.destroy.mockResolvedValue(0);
    JeuLangue.bulkCreate.mockResolvedValue([]);
    JeuEditeur.destroy.mockResolvedValue(0);
    JeuEditeur.bulkCreate.mockResolvedValue([]);
    JeuAuteur.destroy.mockResolvedValue(0);
    JeuAuteur.bulkCreate.mockResolvedValue([]);
    JeuIllustrateur.destroy.mockResolvedValue(0);
    JeuIllustrateur.bulkCreate.mockResolvedValue([]);

    await jeuController.createJeu(req, res);

    expect(JeuCategorie.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuCategorie.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, categorie_id: 1 },
      { jeu_id: 1, categorie_id: 2 }
    ]);

    expect(JeuTheme.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuTheme.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, theme_id: 3 }
    ]);

    expect(JeuMecanisme.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuMecanisme.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, mecanisme_id: 4 },
      { jeu_id: 1, mecanisme_id: 5 }
    ]);

    expect(JeuAuteur.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuAuteur.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, auteur_id: 1 },
      { jeu_id: 1, auteur_id: 2 }
    ]);
  });

  it('devrait gerer le champ categorie legacy', async () => {
    const { req, res } = createMocks({
      titre: 'Catan',
      categorie: 'Strategie'
    });

    const mockCreatedJeu = { id: 1 };
    Jeu.create.mockResolvedValue(mockCreatedJeu);
    Jeu.findByPk.mockResolvedValue({ id: 1, titre: 'Catan' });

    await jeuController.createJeu(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: 'Strategie'
      })
    );
  });

  it('devrait retourner 400 si titre manquant', async () => {
    const { req, res } = createMocks({
      editeur: 'Filosofia'
    });

    await jeuController.createJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Titre is required'
    });
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks({
      titre: 'Catan'
    });

    const validationError = {
      name: 'SequelizeValidationError',
      errors: [
        { message: 'Age min must be between 0 and 99' },
        { message: 'Year must be between 1900 and current year' }
      ]
    };

    Jeu.create.mockRejectedValue(validationError);

    await jeuController.createJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Age min must be between 0 and 99, Year must be between 1900 and current year'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({
      titre: 'Catan'
    });

    const error = new Error('Database error');
    Jeu.create.mockRejectedValue(error);

    await jeuController.createJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - updateJeu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour un jeu avec succes', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Catan - Edition 2023',
        age_min: 12,
        prix_indicatif: 54.99
      },
      { id: '1' }
    );

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      age_min: 10,
      prix_indicatif: 49.99,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockJeuComplet = {
      id: 1,
      titre: 'Catan - Edition 2023',
      age_min: 12,
      prix_indicatif: 54.99
    };

    Jeu.findByPk.mockResolvedValueOnce(mockJeu);
    Jeu.findByPk.mockResolvedValueOnce(mockJeuComplet);

    await jeuController.updateJeu(req, res);

    expect(mockJeu.titre).toBe('Catan - Edition 2023');
    expect(mockJeu.age_min).toBe(12);
    expect(mockJeu.prix_indicatif).toBe(54.99);
    expect(mockJeu.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: 'Jeu updated successfully',
      jeu: mockJeuComplet
    });
  });

  it('devrait mettre a jour tous les champs modifiables', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Nouveau titre',
        sous_titre: 'Nouveau sous-titre',
        type_jeu: 'extension',
        editeur: 'Nouveau editeur',
        auteur: 'Nouvel auteur',
        illustrateur: 'Nouvel illustrateur',
        annee_sortie: 2024,
        age_min: 14,
        nb_joueurs_min: 2,
        nb_joueurs_max: 6,
        duree_partie: 120,
        description: 'Nouvelle description',
        statut: 'indisponible',
        emplacement_id: 2,
        gamme_id: 3,
        prix_achat: 60,
        prix_indicatif: 70,
        etat: 'bon',
        notes: 'Nouvelles notes',
        ean: '9876543210123',
        id_externe: 99
      },
      { id: '1' }
    );

    const mockJeu = {
      id: 1,
      titre: 'Ancien titre',
      save: jest.fn().mockResolvedValue(true)
    };

    Jeu.findByPk.mockResolvedValueOnce(mockJeu);
    Jeu.findByPk.mockResolvedValueOnce(mockJeu);

    await jeuController.updateJeu(req, res);

    expect(mockJeu.titre).toBe('Nouveau titre');
    expect(mockJeu.sous_titre).toBe('Nouveau sous-titre');
    expect(mockJeu.type_jeu).toBe('extension');
    expect(mockJeu.editeur).toBe('Nouveau editeur');
    expect(mockJeu.auteur).toBe('Nouvel auteur');
    expect(mockJeu.illustrateur).toBe('Nouvel illustrateur');
    expect(mockJeu.annee_sortie).toBe(2024);
    expect(mockJeu.age_min).toBe(14);
    expect(mockJeu.nb_joueurs_min).toBe(2);
    expect(mockJeu.nb_joueurs_max).toBe(6);
    expect(mockJeu.duree_partie).toBe(120);
    expect(mockJeu.description).toBe('Nouvelle description');
    expect(mockJeu.statut).toBe('indisponible');
    expect(mockJeu.emplacement_id).toBe(2);
    expect(mockJeu.gamme_id).toBe(3);
    expect(mockJeu.prix_achat).toBe(60);
    expect(mockJeu.prix_indicatif).toBe(70);
    expect(mockJeu.etat).toBe('bon');
    expect(mockJeu.notes).toBe('Nouvelles notes');
    expect(mockJeu.ean).toBe('9876543210123');
    expect(mockJeu.id_externe).toBe(99);
  });

  it('devrait mettre a jour les relations many-to-many', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Catan',
        categorie_ids: [2, 3],
        theme_ids: [],
        auteur_ids: [5]
      },
      { id: '1' }
    );

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      save: jest.fn().mockResolvedValue(true)
    };

    Jeu.findByPk.mockResolvedValueOnce(mockJeu);
    Jeu.findByPk.mockResolvedValueOnce(mockJeu);

    JeuCategorie.destroy.mockResolvedValue(0);
    JeuCategorie.bulkCreate.mockResolvedValue([]);
    JeuTheme.destroy.mockResolvedValue(0);
    JeuAuteur.destroy.mockResolvedValue(0);
    JeuAuteur.bulkCreate.mockResolvedValue([]);

    await jeuController.updateJeu(req, res);

    expect(JeuCategorie.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuCategorie.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, categorie_id: 2 },
      { jeu_id: 1, categorie_id: 3 }
    ]);

    expect(JeuTheme.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuTheme.bulkCreate).not.toHaveBeenCalled();

    expect(JeuAuteur.destroy).toHaveBeenCalledWith({ where: { jeu_id: 1 } });
    expect(JeuAuteur.bulkCreate).toHaveBeenCalledWith([
      { jeu_id: 1, auteur_id: 5 }
    ]);
  });

  it('devrait gerer les valeurs undefined sans les modifier', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Nouveau titre'
      },
      { id: '1' }
    );

    const mockJeu = {
      id: 1,
      titre: 'Ancien titre',
      age_min: 10,
      editeur: 'Filosofia',
      save: jest.fn().mockResolvedValue(true)
    };

    Jeu.findByPk.mockResolvedValueOnce(mockJeu);
    Jeu.findByPk.mockResolvedValueOnce(mockJeu);

    await jeuController.updateJeu(req, res);

    expect(mockJeu.titre).toBe('Nouveau titre');
    expect(mockJeu.age_min).toBe(10); // Non modifie
    expect(mockJeu.editeur).toBe('Filosofia'); // Non modifie
  });

  it('devrait retourner 404 si jeu non trouve', async () => {
    const { req, res } = createMocks(
      { titre: 'Nouveau titre' },
      { id: '999' }
    );

    Jeu.findByPk.mockResolvedValue(null);

    await jeuController.updateJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Jeu not found'
    });
  });

  it('devrait retourner 400 pour erreur de validation Sequelize', async () => {
    const { req, res } = createMocks(
      { titre: 'Catan', age_min: 150 },
      { id: '1' }
    );

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeValidationError',
        errors: [{ message: 'Age min must be between 0 and 99' }]
      })
    };

    Jeu.findByPk.mockResolvedValue(mockJeu);

    await jeuController.updateJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Age min must be between 0 and 99'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks(
      { titre: 'Catan' },
      { id: '1' }
    );

    const error = new Error('Database error');
    Jeu.findByPk.mockRejectedValue(error);

    await jeuController.updateJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - deleteJeu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait supprimer un jeu sans emprunts actifs', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      destroy: jest.fn().mockResolvedValue(true)
    };

    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.count.mockResolvedValue(0);

    await jeuController.deleteJeu(req, res);

    expect(Emprunt.count).toHaveBeenCalledWith({
      where: {
        jeu_id: '1',
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });

    expect(mockJeu.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Jeu deleted successfully'
    });
  });

  it('devrait retourner 404 si jeu non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Jeu.findByPk.mockResolvedValue(null);

    await jeuController.deleteJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Jeu not found'
    });
  });

  it('devrait retourner 400 si jeu a des emprunts actifs', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      destroy: jest.fn()
    };

    Jeu.findByPk.mockResolvedValue(mockJeu);
    Emprunt.count.mockResolvedValue(2);

    await jeuController.deleteJeu(req, res);

    expect(mockJeu.destroy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot delete',
      message: 'Jeu is currently borrowed. Please wait for return.'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Jeu.findByPk.mockRejectedValue(error);

    await jeuController.deleteJeu(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - getCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les categories normalisees si disponibles', async () => {
    const { req, res } = createMocks();

    const mockCategories = [
      { id: 1, nom: 'Strategie', actif: true },
      { id: 2, nom: 'Familial', actif: true },
      { id: 3, nom: 'Ambiance', actif: true }
    ];

    Categorie.findAll.mockResolvedValue(mockCategories);

    await jeuController.getCategories(req, res);

    expect(Categorie.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({
      categories: ['Strategie', 'Familial', 'Ambiance'],
      categoriesRef: mockCategories
    });
  });

  it('devrait extraire les categories du champ texte si table vide (legacy)', async () => {
    const { req, res } = createMocks();

    const mockJeux = [
      { categories: 'Strategie, Familial' },
      { categories: 'Ambiance, Strategie' },
      { categories: 'Familial' }
    ];

    Categorie.findAll.mockResolvedValue([]);
    Jeu.findAll.mockResolvedValue(mockJeux);

    await jeuController.getCategories(req, res);

    expect(Jeu.findAll).toHaveBeenCalledWith({
      attributes: ['categories'],
      where: { categories: { [Op.ne]: null } }
    });

    expect(res.json).toHaveBeenCalledWith({
      categories: ['Ambiance', 'Familial', 'Strategie'],
      categoriesRef: [
        { id: 1, nom: 'Ambiance' },
        { id: 2, nom: 'Familial' },
        { id: 3, nom: 'Strategie' }
      ]
    });
  });

  it('devrait ignorer les categories vides dans le mode legacy', async () => {
    const { req, res } = createMocks();

    const mockJeux = [
      { categories: 'Strategie,  , Familial' },
      { categories: '' },
      { categories: null }
    ];

    Categorie.findAll.mockResolvedValue([]);
    Jeu.findAll.mockResolvedValue(mockJeux);

    await jeuController.getCategories(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['Familial', 'Strategie']
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Categorie.findAll.mockRejectedValue(error);

    await jeuController.getCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('jeuController - lookupEAN', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait rechercher par EAN avec succes', async () => {
    const { req, res } = createMocks({
      ean: '3558380077992'
    });

    const mockResult = {
      found: true,
      source: 'boardgamegeek',
      jeu: {
        titre: 'Catan',
        editeur: 'Filosofia',
        annee_sortie: 1995,
        age_min: 10,
        nb_joueurs_min: 3,
        nb_joueurs_max: 4
      }
    };

    eanLookupService.lookupEAN.mockResolvedValue(mockResult);

    await jeuController.lookupEAN(req, res);

    expect(eanLookupService.lookupEAN).toHaveBeenCalledWith('3558380077992');
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('devrait rechercher par titre avec succes', async () => {
    const { req, res } = createMocks({
      title: 'Catan'
    });

    const mockResult = {
      found: true,
      source: 'boardgamegeek',
      jeu: {
        titre: 'Catan',
        editeur: 'Filosofia'
      }
    };

    eanLookupService.lookupByTitle.mockResolvedValue(mockResult);

    await jeuController.lookupEAN(req, res);

    expect(eanLookupService.lookupByTitle).toHaveBeenCalledWith('Catan');
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('devrait retourner found:false si aucun resultat par EAN', async () => {
    const { req, res } = createMocks({
      ean: '9999999999999'
    });

    eanLookupService.lookupEAN.mockResolvedValue({
      found: false
    });

    await jeuController.lookupEAN(req, res);

    expect(res.json).toHaveBeenCalledWith({
      found: false,
      source: 'not_found',
      jeu: null,
      message: 'Aucun jeu trouve pour le code EAN 9999999999999'
    });
  });

  it('devrait retourner found:false si aucun resultat par titre', async () => {
    const { req, res } = createMocks({
      title: 'Jeu Inexistant'
    });

    eanLookupService.lookupByTitle.mockResolvedValue(null);

    await jeuController.lookupEAN(req, res);

    expect(res.json).toHaveBeenCalledWith({
      found: false,
      source: 'not_found',
      jeu: null,
      message: 'Aucun jeu trouve pour "Jeu Inexistant"'
    });
  });

  it('devrait retourner 400 si ni EAN ni titre fourni', async () => {
    const { req, res } = createMocks({});

    await jeuController.lookupEAN(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'EAN ou titre requis'
    });
  });

  it('devrait gerer les erreurs sans retourner 500', async () => {
    const { req, res } = createMocks({
      ean: '1234567890123'
    });

    const error = new Error('API unavailable');
    eanLookupService.lookupEAN.mockRejectedValue(error);

    await jeuController.lookupEAN(req, res);

    expect(res.json).toHaveBeenCalledWith({
      found: false,
      source: 'error',
      jeu: null,
      message: 'Erreur de recherche: API unavailable'
    });
  });
});
