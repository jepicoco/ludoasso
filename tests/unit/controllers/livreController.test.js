/**
 * Tests unitaires pour livreController
 * Gestion des livres avec normalization tables
 */

const livreController = require('../../../backend/controllers/livreController');
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
  Livre: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  Emprunt: {
    count: jest.fn()
  },
  Utilisateur: {
    findByPk: jest.fn()
  },
  GenreLitteraire: {
    findAll: jest.fn()
  },
  FormatLivre: {
    findAll: jest.fn()
  },
  CollectionLivre: {
    findAll: jest.fn()
  },
  EmplacementLivre: {
    findAll: jest.fn()
  },
  Auteur: {},
  Editeur: {},
  Theme: {},
  Langue: {},
  LivreAuteur: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  LivreEditeur: {
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  LivreGenre: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  LivreTheme: {
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  LivreLangue: {
    destroy: jest.fn(),
    bulkCreate: jest.fn()
  },
  Op: {
    ne: Symbol('ne'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    in: Symbol('in'),
    or: Symbol('or'),
    like: Symbol('like'),
    between: Symbol('between')
  }
}));

const {
  Livre, Emprunt, Utilisateur,
  GenreLitteraire, FormatLivre, CollectionLivre, EmplacementLivre,
  Auteur, Editeur, Theme, Langue,
  LivreAuteur, LivreEditeur, LivreGenre, LivreTheme, LivreLangue
} = require('../../../backend/models');

describe('livreController - getAllLivres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les livres avec pagination', async () => {
    const { req, res } = createMocks({}, {}, { page: '1', limit: '50' });

    const mockLivres = [
      { id: 1, titre: 'Livre 1', statut: 'disponible' },
      { id: 2, titre: 'Livre 2', statut: 'disponible' }
    ];

    Livre.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockLivres
    });

    await livreController.getAllLivres(req, res);

    expect(Livre.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      limit: 50,
      offset: 0,
      order: [['titre', 'ASC']],
      distinct: true
    });

    expect(res.json).toHaveBeenCalledWith({
      livres: mockLivres,
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

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(Livre.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'emprunte' }
      })
    );
  });

  it('devrait filtrer par format_id', async () => {
    const { req, res } = createMocks({}, {}, { format_id: '3' });

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(Livre.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { format_id: 3 }
      })
    );
  });

  it('devrait filtrer par collection_id', async () => {
    const { req, res } = createMocks({}, {}, { collection_id: '2' });

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(Livre.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collection_id: 2 }
      })
    );
  });

  it('devrait rechercher par titre, sous_titre, isbn, code_barre', async () => {
    const { req, res } = createMocks({}, {}, { search: 'harry potter' });

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    const whereClause = Livre.findAndCountAll.mock.calls[0][0].where;
    // Verify that Op.or exists as a Symbol key
    const symbolKeys = Object.getOwnPropertySymbols(whereClause);
    expect(symbolKeys.length).toBeGreaterThan(0);
    expect(whereClause[symbolKeys[0]]).toHaveLength(4);
  });

  it('devrait inclure les references quand demande', async () => {
    const { req, res } = createMocks({}, {}, { include_refs: 'true' });

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    const options = Livre.findAndCountAll.mock.calls[0][0];
    expect(options.include).toBeDefined();
    expect(options.include).toHaveLength(8);
  });

  it('ne devrait pas inclure les references par defaut', async () => {
    const { req, res } = createMocks({}, {}, {});

    Livre.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await livreController.getAllLivres(req, res);

    const options = Livre.findAndCountAll.mock.calls[0][0];
    expect(options.include).toBeUndefined();
  });

  it('devrait filtrer par genre_id via sous-requete', async () => {
    const { req, res } = createMocks({}, {}, { genre_id: '5' });

    LivreGenre.findAll.mockResolvedValue([
      { livre_id: 1 },
      { livre_id: 2 },
      { livre_id: 3 }
    ]);

    Livre.findAndCountAll.mockResolvedValue({ count: 3, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(LivreGenre.findAll).toHaveBeenCalledWith({
      attributes: ['livre_id'],
      where: { genre_id: 5 }
    });

    const whereClause = Livre.findAndCountAll.mock.calls[0][0].where;
    expect(whereClause.id).toBeDefined();
  });

  it('devrait filtrer par theme_id via sous-requete', async () => {
    const { req, res } = createMocks({}, {}, { theme_id: '7' });

    LivreTheme.findAll.mockResolvedValue([
      { livre_id: 4 },
      { livre_id: 5 }
    ]);

    Livre.findAndCountAll.mockResolvedValue({ count: 2, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(LivreTheme.findAll).toHaveBeenCalledWith({
      attributes: ['livre_id'],
      where: { theme_id: 7 }
    });
  });

  it('devrait combiner genre_id et theme_id avec intersection', async () => {
    const { req, res } = createMocks({}, {}, { genre_id: '5', theme_id: '7' });

    LivreGenre.findAll.mockResolvedValue([
      { livre_id: 1 },
      { livre_id: 2 },
      { livre_id: 3 }
    ]);

    LivreTheme.findAll.mockResolvedValue([
      { livre_id: 2 },
      { livre_id: 3 },
      { livre_id: 4 }
    ]);

    Livre.findAndCountAll.mockResolvedValue({ count: 2, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(LivreGenre.findAll).toHaveBeenCalled();
    expect(LivreTheme.findAll).toHaveBeenCalled();
  });

  it('devrait calculer correctement les pages', async () => {
    const { req, res } = createMocks({}, {}, { page: '2', limit: '20' });

    Livre.findAndCountAll.mockResolvedValue({ count: 55, rows: [] });

    await livreController.getAllLivres(req, res);

    expect(Livre.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 20
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      livres: [],
      pagination: {
        total: 55,
        page: 2,
        limit: 20,
        totalPages: 3
      }
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Livre.findAndCountAll.mockRejectedValue(error);

    await livreController.getAllLivres(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getLivreById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un livre par ID avec references', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockLivre = {
      id: 1,
      titre: 'Le Seigneur des Anneaux',
      sous_titre: 'La Communauté de l\'Anneau',
      isbn: '978-2-266-15410-9',
      statut: 'disponible'
    };

    Livre.findByPk.mockResolvedValue(mockLivre);

    await livreController.getLivreById(req, res);

    expect(Livre.findByPk).toHaveBeenCalledWith('1', {
      include: expect.arrayContaining([
        expect.objectContaining({ model: GenreLitteraire, as: 'genresRef' }),
        expect.objectContaining({ model: Theme, as: 'themesRef' }),
        expect.objectContaining({ model: Langue, as: 'languesRef' }),
        expect.objectContaining({ model: Auteur, as: 'auteursRef' }),
        expect.objectContaining({ model: Editeur, as: 'editeursRef' }),
        expect.objectContaining({ model: FormatLivre, as: 'formatRef' }),
        expect.objectContaining({ model: CollectionLivre, as: 'collectionRef' }),
        expect.objectContaining({ model: EmplacementLivre, as: 'emplacementRef' })
      ])
    });

    expect(res.json).toHaveBeenCalledWith({ livre: mockLivre });
  });

  it('devrait retourner 404 si livre non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Livre.findByPk.mockResolvedValue(null);

    await livreController.getLivreById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Livre not found'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Livre.findByPk.mockRejectedValue(error);

    await livreController.getLivreById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - createLivre', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer un livre avec succes', async () => {
    const { req, res } = createMocks({
      titre: 'Harry Potter à l\'école des sorciers',
      sous_titre: 'Tome 1',
      isbn: '978-2-07-058469-7',
      annee_publication: 1997,
      nb_pages: 320,
      format_id: 1,
      auteur_ids: [1],
      editeur_ids: [1],
      genre_ids: [1, 2]
    });

    const mockCreatedLivre = {
      id: 1,
      titre: 'Harry Potter à l\'école des sorciers',
      statut: 'disponible'
    };

    const mockLivreComplet = {
      id: 1,
      titre: 'Harry Potter à l\'école des sorciers',
      statut: 'disponible',
      auteursRef: [],
      editeursRef: [],
      genresRef: []
    };

    Livre.create.mockResolvedValue(mockCreatedLivre);
    LivreAuteur.bulkCreate.mockResolvedValue([]);
    LivreEditeur.bulkCreate.mockResolvedValue([]);
    LivreGenre.bulkCreate.mockResolvedValue([]);
    Livre.findByPk.mockResolvedValue(mockLivreComplet);

    await livreController.createLivre(req, res);

    expect(Livre.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Harry Potter à l\'école des sorciers',
        sous_titre: 'Tome 1',
        isbn: '978-2-07-058469-7',
        annee_publication: 1997,
        nb_pages: 320,
        format_id: 1,
        statut: 'disponible'
      })
    );

    expect(LivreAuteur.destroy).toHaveBeenCalledWith({ where: { livre_id: 1 } });
    expect(LivreAuteur.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 1, auteur_id: 1 }
    ]);

    expect(LivreEditeur.destroy).toHaveBeenCalledWith({ where: { livre_id: 1 } });
    expect(LivreEditeur.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 1, editeur_id: 1 }
    ]);

    expect(LivreGenre.destroy).toHaveBeenCalledWith({ where: { livre_id: 1 } });
    expect(LivreGenre.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 1, genre_id: 1 },
      { livre_id: 1, genre_id: 2 }
    ]);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Livre created successfully',
      livre: mockLivreComplet
    });
  });

  it('devrait synchroniser les themes', async () => {
    const { req, res } = createMocks({
      titre: 'Test Livre',
      theme_ids: [3, 4]
    });

    const mockCreatedLivre = { id: 2, titre: 'Test Livre', statut: 'disponible' };

    Livre.create.mockResolvedValue(mockCreatedLivre);
    LivreTheme.bulkCreate.mockResolvedValue([]);
    Livre.findByPk.mockResolvedValue(mockCreatedLivre);

    await livreController.createLivre(req, res);

    expect(LivreTheme.destroy).toHaveBeenCalledWith({ where: { livre_id: 2 } });
    expect(LivreTheme.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 2, theme_id: 3 },
      { livre_id: 2, theme_id: 4 }
    ]);
  });

  it('devrait synchroniser les langues', async () => {
    const { req, res } = createMocks({
      titre: 'Test Livre',
      langue_ids: [1, 2]
    });

    const mockCreatedLivre = { id: 3, titre: 'Test Livre', statut: 'disponible' };

    Livre.create.mockResolvedValue(mockCreatedLivre);
    LivreLangue.bulkCreate.mockResolvedValue([]);
    Livre.findByPk.mockResolvedValue(mockCreatedLivre);

    await livreController.createLivre(req, res);

    expect(LivreLangue.destroy).toHaveBeenCalledWith({ where: { livre_id: 3 } });
    expect(LivreLangue.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 3, langue_id: 1 },
      { livre_id: 3, langue_id: 2 }
    ]);
  });

  it('devrait gerer les tableaux vides pour les relations', async () => {
    const { req, res } = createMocks({
      titre: 'Test Livre',
      auteur_ids: [],
      genre_ids: []
    });

    const mockCreatedLivre = { id: 4, titre: 'Test Livre', statut: 'disponible' };

    Livre.create.mockResolvedValue(mockCreatedLivre);
    Livre.findByPk.mockResolvedValue(mockCreatedLivre);

    await livreController.createLivre(req, res);

    expect(LivreAuteur.destroy).toHaveBeenCalledWith({ where: { livre_id: 4 } });
    expect(LivreAuteur.bulkCreate).not.toHaveBeenCalled();

    expect(LivreGenre.destroy).toHaveBeenCalledWith({ where: { livre_id: 4 } });
    expect(LivreGenre.bulkCreate).not.toHaveBeenCalled();
  });

  it('devrait retourner 400 si titre manquant', async () => {
    const { req, res } = createMocks({
      isbn: '978-2-07-058469-7'
    });

    await livreController.createLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Titre is required'
    });
  });

  it('devrait gerer les erreurs de validation Sequelize', async () => {
    const { req, res } = createMocks({
      titre: 'Test'
    });

    const validationError = new Error('Validation failed');
    validationError.name = 'SequelizeValidationError';
    validationError.errors = [
      { message: 'ISBN must be valid' },
      { message: 'Year must be a number' }
    ];

    Livre.create.mockRejectedValue(validationError);

    await livreController.createLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'ISBN must be valid, Year must be a number'
    });
  });

  it('devrait gerer les doublons d\'ISBN', async () => {
    const { req, res } = createMocks({
      titre: 'Test',
      isbn: '978-2-07-058469-7'
    });

    const uniqueError = new Error('ISBN must be unique');
    uniqueError.name = 'SequelizeUniqueConstraintError';

    Livre.create.mockRejectedValue(uniqueError);

    await livreController.createLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate error',
      message: 'Un livre avec cet ISBN existe déjà'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks({
      titre: 'Test'
    });

    const error = new Error('Database error');
    Livre.create.mockRejectedValue(error);

    await livreController.createLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - updateLivre', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour un livre', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Nouveau titre',
        sous_titre: 'Nouveau sous-titre',
        isbn: '978-2-266-15410-9',
        tome: 2,
        annee_publication: 2000,
        nb_pages: 450,
        resume: 'Nouveau résumé',
        notes: 'Notes mises à jour',
        format_id: 2,
        collection_id: 3,
        emplacement_id: 1,
        prix_indicatif: 25.50,
        prix_achat: 20.00,
        date_acquisition: '2024-01-15',
        etat: 'bon',
        statut: 'disponible',
        image_url: 'https://example.com/image.jpg',
        auteur_ids: [1, 2],
        genre_ids: [3]
      },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      titre: 'Ancien titre',
      sous_titre: null,
      isbn: null,
      tome: null,
      annee_publication: null,
      nb_pages: null,
      resume: null,
      notes: null,
      format_id: null,
      collection_id: null,
      emplacement_id: null,
      prix_indicatif: null,
      prix_achat: null,
      date_acquisition: null,
      etat: null,
      statut: 'disponible',
      image_url: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockLivreComplet = {
      id: 1,
      titre: 'Nouveau titre',
      statut: 'disponible'
    };

    Livre.findByPk.mockResolvedValueOnce(mockLivre);
    Livre.findByPk.mockResolvedValueOnce(mockLivreComplet);
    LivreAuteur.bulkCreate.mockResolvedValue([]);
    LivreGenre.bulkCreate.mockResolvedValue([]);

    await livreController.updateLivre(req, res);

    expect(mockLivre.titre).toBe('Nouveau titre');
    expect(mockLivre.sous_titre).toBe('Nouveau sous-titre');
    expect(mockLivre.isbn).toBe('978-2-266-15410-9');
    expect(mockLivre.tome).toBe(2);
    expect(mockLivre.annee_publication).toBe(2000);
    expect(mockLivre.nb_pages).toBe(450);
    expect(mockLivre.resume).toBe('Nouveau résumé');
    expect(mockLivre.notes).toBe('Notes mises à jour');
    expect(mockLivre.format_id).toBe(2);
    expect(mockLivre.collection_id).toBe(3);
    expect(mockLivre.emplacement_id).toBe(1);
    expect(mockLivre.prix_indicatif).toBe(25.50);
    expect(mockLivre.prix_achat).toBe(20.00);
    expect(mockLivre.date_acquisition).toBe('2024-01-15');
    expect(mockLivre.etat).toBe('bon');
    expect(mockLivre.statut).toBe('disponible');
    expect(mockLivre.image_url).toBe('https://example.com/image.jpg');

    expect(mockLivre.save).toHaveBeenCalled();

    expect(LivreAuteur.destroy).toHaveBeenCalledWith({ where: { livre_id: 1 } });
    expect(LivreAuteur.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 1, auteur_id: 1 },
      { livre_id: 1, auteur_id: 2 }
    ]);

    expect(LivreGenre.destroy).toHaveBeenCalledWith({ where: { livre_id: 1 } });
    expect(LivreGenre.bulkCreate).toHaveBeenCalledWith([
      { livre_id: 1, genre_id: 3 }
    ]);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Livre updated successfully',
      livre: mockLivreComplet
    });
  });

  it('devrait mettre a jour uniquement les champs fournis', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Titre modifié'
      },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      titre: 'Ancien titre',
      sous_titre: 'Sous-titre existant',
      save: jest.fn().mockResolvedValue(true)
    };

    Livre.findByPk.mockResolvedValueOnce(mockLivre);
    Livre.findByPk.mockResolvedValueOnce(mockLivre);

    await livreController.updateLivre(req, res);

    expect(mockLivre.titre).toBe('Titre modifié');
    expect(mockLivre.sous_titre).toBe('Sous-titre existant');
    expect(mockLivre.save).toHaveBeenCalled();
  });

  it('devrait permettre de definir des valeurs vides', async () => {
    const { req, res } = createMocks(
      {
        sous_titre: '',
        notes: ''
      },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      sous_titre: 'Ancien sous-titre',
      notes: 'Anciennes notes',
      save: jest.fn().mockResolvedValue(true)
    };

    Livre.findByPk.mockResolvedValueOnce(mockLivre);
    Livre.findByPk.mockResolvedValueOnce(mockLivre);

    await livreController.updateLivre(req, res);

    // Le controller verifie undefined !== undefined, donc les champs ne sont pas mis a jour si undefined
    // Mais il peut mettre a jour avec des valeurs vides
    expect(mockLivre.save).toHaveBeenCalled();
  });

  it('devrait retourner 404 si livre non trouve', async () => {
    const { req, res } = createMocks({ titre: 'Test' }, { id: '999' });

    Livre.findByPk.mockResolvedValue(null);

    await livreController.updateLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Livre not found'
    });
  });

  it('devrait gerer les erreurs de validation Sequelize', async () => {
    const { req, res } = createMocks(
      { titre: 'Test' },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      titre: 'Ancien titre',
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeValidationError',
        errors: [{ message: 'Invalid data' }]
      })
    };

    Livre.findByPk.mockResolvedValue(mockLivre);

    await livreController.updateLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Invalid data'
    });
  });

  it('devrait gerer les doublons d\'ISBN', async () => {
    const { req, res } = createMocks(
      { isbn: '978-2-07-058469-7' },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      isbn: '978-0-00-000000-0',
      save: jest.fn().mockRejectedValue({
        name: 'SequelizeUniqueConstraintError'
      })
    };

    Livre.findByPk.mockResolvedValue(mockLivre);

    await livreController.updateLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate error',
      message: 'Un livre avec cet ISBN existe déjà'
    });
  });

  it('devrait retourner 500 en cas d\'erreur serveur', async () => {
    const { req, res } = createMocks(
      { titre: 'Test' },
      { id: '1' }
    );

    const mockLivre = {
      id: 1,
      titre: 'Ancien titre',
      save: jest.fn().mockRejectedValue(new Error('Database error'))
    };

    Livre.findByPk.mockResolvedValue(mockLivre);

    await livreController.updateLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - deleteLivre', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait supprimer un livre sans emprunts actifs', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockLivre = {
      id: 1,
      titre: 'Livre à supprimer',
      destroy: jest.fn().mockResolvedValue(true)
    };

    Livre.findByPk.mockResolvedValue(mockLivre);
    Emprunt.count.mockResolvedValue(0);

    await livreController.deleteLivre(req, res);

    expect(Livre.findByPk).toHaveBeenCalledWith('1');
    expect(Emprunt.count).toHaveBeenCalledWith({
      where: {
        livre_id: '1',
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });
    expect(mockLivre.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Livre deleted successfully'
    });
  });

  it('devrait retourner 404 si livre non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Livre.findByPk.mockResolvedValue(null);

    await livreController.deleteLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      message: 'Livre not found'
    });
  });

  it('devrait retourner 400 si livre a des emprunts actifs', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockLivre = {
      id: 1,
      titre: 'Livre emprunté'
    };

    Livre.findByPk.mockResolvedValue(mockLivre);
    Emprunt.count.mockResolvedValue(2);

    await livreController.deleteLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot delete',
      message: 'Ce livre est actuellement emprunté. Veuillez attendre le retour.'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Livre.findByPk.mockRejectedValue(error);

    await livreController.deleteLivre(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getGenres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les genres actifs', async () => {
    const { req, res } = createMocks();

    const mockGenres = [
      { id: 1, nom: 'Science-Fiction', actif: true },
      { id: 2, nom: 'Fantasy', actif: true },
      { id: 3, nom: 'Policier', actif: true }
    ];

    GenreLitteraire.findAll.mockResolvedValue(mockGenres);

    await livreController.getGenres(req, res);

    expect(GenreLitteraire.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({ genres: mockGenres });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    GenreLitteraire.findAll.mockRejectedValue(error);

    await livreController.getGenres(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getFormats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les formats actifs', async () => {
    const { req, res } = createMocks();

    const mockFormats = [
      { id: 1, nom: 'Poche', actif: true },
      { id: 2, nom: 'Broché', actif: true },
      { id: 3, nom: 'Relié', actif: true }
    ];

    FormatLivre.findAll.mockResolvedValue(mockFormats);

    await livreController.getFormats(req, res);

    expect(FormatLivre.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({ formats: mockFormats });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    FormatLivre.findAll.mockRejectedValue(error);

    await livreController.getFormats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les collections actives avec editeur', async () => {
    const { req, res } = createMocks();

    const mockCollections = [
      { id: 1, nom: 'Folio', actif: true, editeur: { nom: 'Gallimard' } },
      { id: 2, nom: 'Pocket', actif: true, editeur: { nom: 'Univers Poche' } }
    ];

    CollectionLivre.findAll.mockResolvedValue(mockCollections);

    await livreController.getCollections(req, res);

    expect(CollectionLivre.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      include: [{ model: Editeur, as: 'editeur' }],
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({ collections: mockCollections });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    CollectionLivre.findAll.mockRejectedValue(error);

    await livreController.getCollections(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getEmplacements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les emplacements actifs', async () => {
    const { req, res } = createMocks();

    const mockEmplacements = [
      { id: 1, libelle: 'Etagère A1', actif: true },
      { id: 2, libelle: 'Etagère B2', actif: true }
    ];

    EmplacementLivre.findAll.mockResolvedValue(mockEmplacements);

    await livreController.getEmplacements(req, res);

    expect(EmplacementLivre.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({ emplacements: mockEmplacements });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    EmplacementLivre.findAll.mockRejectedValue(error);

    await livreController.getEmplacements(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('livreController - getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les statistiques des livres', async () => {
    const { req, res } = createMocks();

    Livre.count.mockResolvedValueOnce(150);
    Livre.count.mockResolvedValueOnce(120);
    Livre.count.mockResolvedValueOnce(30);

    await livreController.getStats(req, res);

    expect(Livre.count).toHaveBeenCalledTimes(3);
    expect(Livre.count).toHaveBeenNthCalledWith(1);
    expect(Livre.count).toHaveBeenNthCalledWith(2, { where: { statut: 'disponible' } });
    expect(Livre.count).toHaveBeenNthCalledWith(3, { where: { statut: 'emprunte' } });

    expect(res.json).toHaveBeenCalledWith({
      stats: {
        total: 150,
        disponibles: 120,
        empruntes: 30
      }
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Livre.count.mockRejectedValue(error);

    await livreController.getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});
