/**
 * Tests unitaires pour filmController
 * Gestion des films et des référentiels associés
 */

const filmController = require('../../../backend/controllers/filmController');
const { Op } = require('sequelize');

// Helper pour créer des mocks req/res/next
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

// Create a mock transaction outside the module mock
const createMockTransaction = () => ({
  commit: jest.fn().mockResolvedValue(true),
  rollback: jest.fn().mockResolvedValue(true)
});

// Mock des modèles Sequelize
jest.mock('../../../backend/models', () => {
  return {
    Film: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    GenreFilm: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    Realisateur: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    Acteur: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    Studio: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    SupportVideo: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    EmplacementFilm: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    Theme: {},
    Langue: {},
    FilmRealisateur: {},
    FilmActeur: {
      create: jest.fn(),
      destroy: jest.fn()
    },
    FilmGenre: {},
    FilmTheme: {},
    FilmLangue: {},
    FilmSousTitre: {},
    FilmStudio: {},
    sequelize: {
      transaction: jest.fn(),
      fn: jest.fn((name, ...args) => ({ fn: name, args })),
      col: jest.fn((name) => ({ col: name })),
      literal: jest.fn((str) => ({ literal: str })),
      query: jest.fn(),
      QueryTypes: { SELECT: 'SELECT' }
    },
    Op: {
      or: Symbol('or'),
      ne: Symbol('ne'),
      like: Symbol('like'),
      gte: Symbol('gte'),
      lte: Symbol('lte')
    }
  };
});

const {
  Film,
  GenreFilm,
  Realisateur,
  Acteur,
  Studio,
  SupportVideo,
  EmplacementFilm,
  FilmActeur,
  sequelize
} = require('../../../backend/models');

describe('filmController - getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les films avec pagination par défaut', async () => {
    const { req, res } = createMocks();

    const mockFilms = [
      { id: 1, titre: 'Inception', annee_sortie: 2010 },
      { id: 2, titre: 'The Matrix', annee_sortie: 1999 }
    ];

    Film.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockFilms
    });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      include: expect.any(Array),
      limit: 50,
      offset: 0,
      order: [['titre', 'ASC']],
      distinct: true
    });

    expect(res.json).toHaveBeenCalledWith({
      films: mockFilms,
      pagination: {
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      }
    });
  });

  it('devrait filtrer par recherche texte (titre)', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Matrix' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where[Op.or]).toBeDefined();
    expect(callArgs.where[Op.or]).toHaveLength(4);
  });

  it('devrait filtrer par support_id', async () => {
    const { req, res } = createMocks({}, {}, { support_id: '1' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { support_id: '1' }
      })
    );
  });

  it('devrait filtrer par emplacement_id', async () => {
    const { req, res } = createMocks({}, {}, { emplacement_id: '2' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emplacement_id: '2' }
      })
    );
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'disponible' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'disponible' }
      })
    );
  });

  it('devrait filtrer par classification', async () => {
    const { req, res } = createMocks({}, {}, { classification: 'PG-13' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { classification: 'PG-13' }
      })
    );
  });

  it('devrait filtrer par année min', async () => {
    const { req, res } = createMocks({}, {}, { annee_min: '2000' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where.annee_sortie).toBeDefined();
  });

  it('devrait filtrer par année max', async () => {
    const { req, res } = createMocks({}, {}, { annee_max: '2020' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where.annee_sortie).toBeDefined();
  });

  it('devrait filtrer par plage d\'années', async () => {
    const { req, res } = createMocks({}, {}, { annee_min: '2000', annee_max: '2020' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where.annee_sortie).toBeDefined();
  });

  it('devrait filtrer par genre_id', async () => {
    const { req, res } = createMocks({}, {}, { genre_id: '3' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    const genreInclude = callArgs.include.find(i => i.as === 'genresRef');
    expect(genreInclude.where).toEqual({ id: '3' });
  });

  it('devrait filtrer par realisateur_id', async () => {
    const { req, res } = createMocks({}, {}, { realisateur_id: '5' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    const realInclude = callArgs.include.find(i => i.as === 'realisateursRef');
    expect(realInclude.where).toEqual({ id: '5' });
  });

  it('devrait filtrer par acteur_id', async () => {
    const { req, res } = createMocks({}, {}, { acteur_id: '7' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    const acteurInclude = callArgs.include.find(i => i.as === 'acteursRef');
    expect(acteurInclude.where).toEqual({ id: '7' });
  });

  it('devrait filtrer par studio_id', async () => {
    const { req, res } = createMocks({}, {}, { studio_id: '2' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    const callArgs = Film.findAndCountAll.mock.calls[0][0];
    const studioInclude = callArgs.include.find(i => i.as === 'studiosRef');
    expect(studioInclude.where).toEqual({ id: '2' });
  });

  it('devrait gérer la pagination personnalisée', async () => {
    const { req, res } = createMocks({}, {}, { page: '3', limit: '20' });

    Film.findAndCountAll.mockResolvedValue({ count: 100, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 40 // (page 3 - 1) * 20
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      films: [],
      pagination: {
        total: 100,
        page: 3,
        limit: 20,
        totalPages: 5
      }
    });
  });

  it('devrait gérer le tri personnalisé', async () => {
    const { req, res } = createMocks({}, {}, { sort: 'annee_sortie', order: 'DESC' });

    Film.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await filmController.getAll(req, res);

    expect(Film.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['annee_sortie', 'DESC']]
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Film.findAndCountAll.mockRejectedValue(error);

    await filmController.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des films'
    });
  });
});

describe('filmController - getById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un film par ID', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockFilm = {
      id: 1,
      titre: 'Inception',
      annee_sortie: 2010,
      duree: 148
    };

    Film.findByPk.mockResolvedValue(mockFilm);

    await filmController.getById(req, res);

    expect(Film.findByPk).toHaveBeenCalledWith('1', {
      include: expect.any(Array)
    });

    expect(res.json).toHaveBeenCalledWith(mockFilm);
  });

  it('devrait retourner 404 si film non trouvé', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Film.findByPk.mockResolvedValue(null);

    await filmController.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Film non trouvé' });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Film.findByPk.mockRejectedValue(error);

    await filmController.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération du film'
    });
  });
});

describe('filmController - create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait créer un film avec succès', async () => {
    const { req, res } = createMocks({
      titre: 'Inception',
      annee_sortie: 2010,
      duree: 148,
      genres: [1, 2],
      realisateurs: [1],
      acteurs: [{ id: 1, role: 'Dom Cobb' }],
      studios: [1]
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockCreatedFilm = {
      id: 1,
      titre: 'Inception',
      setGenresRef: jest.fn().mockResolvedValue(true),
      setThemesRef: jest.fn().mockResolvedValue(true),
      setLanguesRef: jest.fn().mockResolvedValue(true),
      setSousTitresRef: jest.fn().mockResolvedValue(true),
      setRealisateursRef: jest.fn().mockResolvedValue(true),
      setStudiosRef: jest.fn().mockResolvedValue(true)
    };

    const mockCompleteFilm = {
      id: 1,
      titre: 'Inception',
      annee_sortie: 2010
    };

    Film.create.mockResolvedValue(mockCreatedFilm);
    Film.findByPk.mockResolvedValue(mockCompleteFilm);
    FilmActeur.create.mockResolvedValue(true);

    await filmController.create(req, res);

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(Film.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Inception',
        annee_sortie: 2010,
        duree: 148
      }),
      { transaction: mockTransaction }
    );

    expect(mockCreatedFilm.setGenresRef).toHaveBeenCalledWith([1, 2], { transaction: mockTransaction });
    expect(mockCreatedFilm.setRealisateursRef).toHaveBeenCalledWith([1], { transaction: mockTransaction });
    expect(FilmActeur.create).toHaveBeenCalledWith(
      {
        film_id: 1,
        acteur_id: 1,
        role: 'Dom Cobb'
      },
      { transaction: mockTransaction }
    );
    expect(mockCreatedFilm.setStudiosRef).toHaveBeenCalledWith([1], { transaction: mockTransaction });

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockCompleteFilm);
  });

  it('devrait créer un film sans associations', async () => {
    const { req, res } = createMocks({
      titre: 'Simple Film',
      annee_sortie: 2020
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockCreatedFilm = {
      id: 1,
      titre: 'Simple Film',
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.create.mockResolvedValue(mockCreatedFilm);
    Film.findByPk.mockResolvedValue(mockCreatedFilm);

    await filmController.create(req, res);

    expect(mockCreatedFilm.setGenresRef).not.toHaveBeenCalled();
    expect(mockCreatedFilm.setRealisateursRef).not.toHaveBeenCalled();
    expect(FilmActeur.create).not.toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait gérer les acteurs avec IDs simples', async () => {
    const { req, res } = createMocks({
      titre: 'Test Film',
      acteurs: [1, 2, 3]
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockCreatedFilm = {
      id: 1,
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.create.mockResolvedValue(mockCreatedFilm);
    Film.findByPk.mockResolvedValue(mockCreatedFilm);
    FilmActeur.create.mockResolvedValue(true);

    await filmController.create(req, res);

    expect(FilmActeur.create).toHaveBeenCalledTimes(3);
    expect(FilmActeur.create).toHaveBeenCalledWith(
      { film_id: 1, acteur_id: 1, role: null },
      { transaction: mockTransaction }
    );
  });

  it('devrait gérer les thèmes', async () => {
    const { req, res } = createMocks({
      titre: 'Themed Film',
      themes: [1, 2]
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockCreatedFilm = {
      id: 1,
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn().mockResolvedValue(true),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.create.mockResolvedValue(mockCreatedFilm);
    Film.findByPk.mockResolvedValue(mockCreatedFilm);

    await filmController.create(req, res);

    expect(mockCreatedFilm.setThemesRef).toHaveBeenCalledWith([1, 2], { transaction: mockTransaction });
  });

  it('devrait gérer les langues et sous-titres', async () => {
    const { req, res } = createMocks({
      titre: 'Multi-language Film',
      langues: [1, 2],
      sous_titres: [3, 4]
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockCreatedFilm = {
      id: 1,
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn().mockResolvedValue(true),
      setSousTitresRef: jest.fn().mockResolvedValue(true),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.create.mockResolvedValue(mockCreatedFilm);
    Film.findByPk.mockResolvedValue(mockCreatedFilm);

    await filmController.create(req, res);

    expect(mockCreatedFilm.setLanguesRef).toHaveBeenCalledWith([1, 2], { transaction: mockTransaction });
    expect(mockCreatedFilm.setSousTitresRef).toHaveBeenCalledWith([3, 4], { transaction: mockTransaction });
  });

  it('devrait rollback la transaction en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      titre: 'Error Film'
    });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);
    const error = new Error('Database error');
    Film.create.mockRejectedValue(error);

    await filmController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la création du film'
    });
  });
});

describe('filmController - update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre à jour un film avec succès', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Updated Title',
        annee_sortie: 2021,
        genres: [2, 3],
        realisateurs: [2]
      },
      { id: '1' }
    );

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockFilm = {
      id: 1,
      titre: 'Original Title',
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn().mockResolvedValue(true),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn().mockResolvedValue(true),
      setStudiosRef: jest.fn()
    };

    const mockUpdatedFilm = {
      id: 1,
      titre: 'Updated Title',
      annee_sortie: 2021
    };

    Film.findByPk.mockResolvedValueOnce(mockFilm);
    Film.findByPk.mockResolvedValueOnce(mockUpdatedFilm);

    await filmController.update(req, res);

    expect(mockFilm.update).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Updated Title',
        annee_sortie: 2021
      }),
      { transaction: mockTransaction }
    );

    expect(mockFilm.setGenresRef).toHaveBeenCalledWith([2, 3], { transaction: mockTransaction });
    expect(mockFilm.setRealisateursRef).toHaveBeenCalledWith([2], { transaction: mockTransaction });

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(mockUpdatedFilm);
  });

  it('devrait mettre à jour les acteurs avec rôles', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Film with Actors',
        acteurs: [
          { id: 1, role: 'New Role 1' },
          { id: 2, role: 'New Role 2' }
        ]
      },
      { id: '1' }
    );

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockFilm = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.findByPk.mockResolvedValueOnce(mockFilm);
    Film.findByPk.mockResolvedValueOnce(mockFilm);
    FilmActeur.destroy.mockResolvedValue(2);
    FilmActeur.create.mockResolvedValue(true);

    await filmController.update(req, res);

    expect(FilmActeur.destroy).toHaveBeenCalledWith({
      where: { film_id: 1 },
      transaction: mockTransaction
    });

    expect(FilmActeur.create).toHaveBeenCalledTimes(2);
    expect(FilmActeur.create).toHaveBeenCalledWith(
      { film_id: 1, acteur_id: 1, role: 'New Role 1' },
      { transaction: mockTransaction }
    );
  });

  it('devrait vider les associations si tableau vide fourni', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Film',
        genres: [],
        realisateurs: []
      },
      { id: '1' }
    );

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockFilm = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn().mockResolvedValue(true),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn().mockResolvedValue(true),
      setStudiosRef: jest.fn()
    };

    Film.findByPk.mockResolvedValueOnce(mockFilm);
    Film.findByPk.mockResolvedValueOnce(mockFilm);

    await filmController.update(req, res);

    expect(mockFilm.setGenresRef).toHaveBeenCalledWith([], { transaction: mockTransaction });
    expect(mockFilm.setRealisateursRef).toHaveBeenCalledWith([], { transaction: mockTransaction });
  });

  it('ne devrait pas modifier les associations si non fournies', async () => {
    const { req, res } = createMocks(
      { titre: 'Updated Film' },
      { id: '1' }
    );

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    const mockFilm = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn(),
      setThemesRef: jest.fn(),
      setLanguesRef: jest.fn(),
      setSousTitresRef: jest.fn(),
      setRealisateursRef: jest.fn(),
      setStudiosRef: jest.fn()
    };

    Film.findByPk.mockResolvedValueOnce(mockFilm);
    Film.findByPk.mockResolvedValueOnce(mockFilm);

    await filmController.update(req, res);

    expect(mockFilm.setGenresRef).not.toHaveBeenCalled();
    expect(mockFilm.setRealisateursRef).not.toHaveBeenCalled();
    expect(FilmActeur.destroy).not.toHaveBeenCalled();
  });

  it('devrait retourner 404 si film non trouvé', async () => {
    const { req, res } = createMocks({ titre: 'Test' }, { id: '999' });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);
    Film.findByPk.mockResolvedValue(null);

    await filmController.update(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Film non trouvé' });
  });

  it('devrait rollback la transaction en cas d\'erreur', async () => {
    const { req, res } = createMocks({ titre: 'Test' }, { id: '1' });

    const mockTransaction = createMockTransaction();
    sequelize.transaction.mockResolvedValue(mockTransaction);
    const error = new Error('Database error');
    Film.findByPk.mockRejectedValue(error);

    await filmController.update(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la mise à jour du film'
    });
  });
});

describe('filmController - delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait supprimer un film avec succès', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockFilm = {
      id: 1,
      titre: 'Film to delete',
      destroy: jest.fn().mockResolvedValue(true)
    };

    Film.findByPk.mockResolvedValue(mockFilm);

    await filmController.delete(req, res);

    expect(Film.findByPk).toHaveBeenCalledWith('1');
    expect(mockFilm.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Film supprimé avec succès'
    });
  });

  it('devrait retourner 404 si film non trouvé', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Film.findByPk.mockResolvedValue(null);

    await filmController.delete(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Film non trouvé' });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Film.findByPk.mockRejectedValue(error);

    await filmController.delete(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la suppression du film'
    });
  });
});

describe('filmController - Référentiels Genres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les genres actifs', async () => {
    const { req, res } = createMocks();

    const mockGenres = [
      { id: 1, nom: 'Action', actif: true },
      { id: 2, nom: 'Drame', actif: true }
    ];

    GenreFilm.findAll.mockResolvedValue(mockGenres);

    await filmController.getGenres(req, res);

    expect(GenreFilm.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockGenres);
  });

  it('devrait créer un genre', async () => {
    const { req, res } = createMocks({ nom: 'Science-Fiction', actif: true });

    const mockGenre = { id: 1, nom: 'Science-Fiction', actif: true };

    GenreFilm.create.mockResolvedValue(mockGenre);

    await filmController.createGenre(req, res);

    expect(GenreFilm.create).toHaveBeenCalledWith({ nom: 'Science-Fiction', actif: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockGenre);
  });

  it('devrait mettre à jour un genre', async () => {
    const { req, res } = createMocks(
      { nom: 'Updated Genre' },
      { id: '1' }
    );

    const mockGenre = {
      id: 1,
      nom: 'Original Genre',
      update: jest.fn().mockResolvedValue(true)
    };

    GenreFilm.findByPk.mockResolvedValue(mockGenre);

    await filmController.updateGenre(req, res);

    expect(mockGenre.update).toHaveBeenCalledWith({ nom: 'Updated Genre' });
    expect(res.json).toHaveBeenCalledWith(mockGenre);
  });

  it('devrait retourner 404 si genre non trouvé pour mise à jour', async () => {
    const { req, res } = createMocks({ nom: 'Test' }, { id: '999' });

    GenreFilm.findByPk.mockResolvedValue(null);

    await filmController.updateGenre(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Genre non trouvé' });
  });

  it('devrait supprimer un genre', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockGenre = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    GenreFilm.findByPk.mockResolvedValue(mockGenre);

    await filmController.deleteGenre(req, res);

    expect(mockGenre.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Genre supprimé avec succès'
    });
  });

  it('devrait retourner 404 si genre non trouvé pour suppression', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    GenreFilm.findByPk.mockResolvedValue(null);

    await filmController.deleteGenre(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Genre non trouvé' });
  });

  it('devrait retourner 500 en cas d\'erreur lors de la récupération des genres', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    GenreFilm.findAll.mockRejectedValue(error);

    await filmController.getGenres(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des genres'
    });
  });
});

describe('filmController - Référentiels Réalisateurs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les réalisateurs actifs', async () => {
    const { req, res } = createMocks();

    const mockRealisateurs = [
      { id: 1, nom: 'Nolan', prenom: 'Christopher', actif: true },
      { id: 2, nom: 'Spielberg', prenom: 'Steven', actif: true }
    ];

    Realisateur.findAll.mockResolvedValue(mockRealisateurs);

    await filmController.getRealisateurs(req, res);

    expect(Realisateur.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockRealisateurs);
  });

  it('devrait filtrer les réalisateurs par recherche', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Nolan' });

    Realisateur.findAll.mockResolvedValue([]);

    await filmController.getRealisateurs(req, res);

    const callArgs = Realisateur.findAll.mock.calls[0][0];
    expect(callArgs.where[Op.or]).toBeDefined();
    expect(callArgs.where.actif).toBe(true);
  });

  it('devrait créer un réalisateur', async () => {
    const { req, res } = createMocks({
      nom: 'Tarantino',
      prenom: 'Quentin'
    });

    const mockRealisateur = {
      id: 1,
      nom: 'Tarantino',
      prenom: 'Quentin'
    };

    Realisateur.create.mockResolvedValue(mockRealisateur);

    await filmController.createRealisateur(req, res);

    expect(Realisateur.create).toHaveBeenCalledWith({
      nom: 'Tarantino',
      prenom: 'Quentin'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockRealisateur);
  });

  it('devrait mettre à jour un réalisateur', async () => {
    const { req, res } = createMocks(
      { nom: 'Updated Name' },
      { id: '1' }
    );

    const mockRealisateur = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    Realisateur.findByPk.mockResolvedValue(mockRealisateur);

    await filmController.updateRealisateur(req, res);

    expect(mockRealisateur.update).toHaveBeenCalledWith({ nom: 'Updated Name' });
    expect(res.json).toHaveBeenCalledWith(mockRealisateur);
  });

  it('devrait retourner 404 si réalisateur non trouvé', async () => {
    const { req, res } = createMocks({ nom: 'Test' }, { id: '999' });

    Realisateur.findByPk.mockResolvedValue(null);

    await filmController.updateRealisateur(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Réalisateur non trouvé' });
  });

  it('devrait supprimer un réalisateur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockRealisateur = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    Realisateur.findByPk.mockResolvedValue(mockRealisateur);

    await filmController.deleteRealisateur(req, res);

    expect(mockRealisateur.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Réalisateur supprimé avec succès'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Realisateur.findAll.mockRejectedValue(error);

    await filmController.getRealisateurs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des réalisateurs'
    });
  });
});

describe('filmController - Référentiels Acteurs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les acteurs actifs', async () => {
    const { req, res } = createMocks();

    const mockActeurs = [
      { id: 1, nom: 'DiCaprio', prenom: 'Leonardo', actif: true },
      { id: 2, nom: 'Hanks', prenom: 'Tom', actif: true }
    ];

    Acteur.findAll.mockResolvedValue(mockActeurs);

    await filmController.getActeurs(req, res);

    expect(Acteur.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockActeurs);
  });

  it('devrait filtrer les acteurs par recherche', async () => {
    const { req, res } = createMocks({}, {}, { search: 'DiCaprio' });

    Acteur.findAll.mockResolvedValue([]);

    await filmController.getActeurs(req, res);

    const callArgs = Acteur.findAll.mock.calls[0][0];
    expect(callArgs.where[Op.or]).toBeDefined();
    expect(callArgs.where.actif).toBe(true);
  });

  it('devrait créer un acteur', async () => {
    const { req, res } = createMocks({
      nom: 'Washington',
      prenom: 'Denzel'
    });

    const mockActeur = {
      id: 1,
      nom: 'Washington',
      prenom: 'Denzel'
    };

    Acteur.create.mockResolvedValue(mockActeur);

    await filmController.createActeur(req, res);

    expect(Acteur.create).toHaveBeenCalledWith({
      nom: 'Washington',
      prenom: 'Denzel'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockActeur);
  });

  it('devrait mettre à jour un acteur', async () => {
    const { req, res } = createMocks(
      { nom: 'Updated Name' },
      { id: '1' }
    );

    const mockActeur = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    Acteur.findByPk.mockResolvedValue(mockActeur);

    await filmController.updateActeur(req, res);

    expect(mockActeur.update).toHaveBeenCalledWith({ nom: 'Updated Name' });
    expect(res.json).toHaveBeenCalledWith(mockActeur);
  });

  it('devrait retourner 404 si acteur non trouvé', async () => {
    const { req, res } = createMocks({ nom: 'Test' }, { id: '999' });

    Acteur.findByPk.mockResolvedValue(null);

    await filmController.updateActeur(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Acteur non trouvé' });
  });

  it('devrait supprimer un acteur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockActeur = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    Acteur.findByPk.mockResolvedValue(mockActeur);

    await filmController.deleteActeur(req, res);

    expect(mockActeur.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Acteur supprimé avec succès'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Acteur.findAll.mockRejectedValue(error);

    await filmController.getActeurs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des acteurs'
    });
  });
});

describe('filmController - Référentiels Studios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les studios actifs', async () => {
    const { req, res } = createMocks();

    const mockStudios = [
      { id: 1, nom: 'Warner Bros', actif: true },
      { id: 2, nom: 'Universal', actif: true }
    ];

    Studio.findAll.mockResolvedValue(mockStudios);

    await filmController.getStudios(req, res);

    expect(Studio.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockStudios);
  });

  it('devrait créer un studio', async () => {
    const { req, res } = createMocks({ nom: 'Pixar', actif: true });

    const mockStudio = { id: 1, nom: 'Pixar', actif: true };

    Studio.create.mockResolvedValue(mockStudio);

    await filmController.createStudio(req, res);

    expect(Studio.create).toHaveBeenCalledWith({ nom: 'Pixar', actif: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockStudio);
  });

  it('devrait mettre à jour un studio', async () => {
    const { req, res } = createMocks(
      { nom: 'Updated Studio' },
      { id: '1' }
    );

    const mockStudio = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    Studio.findByPk.mockResolvedValue(mockStudio);

    await filmController.updateStudio(req, res);

    expect(mockStudio.update).toHaveBeenCalledWith({ nom: 'Updated Studio' });
    expect(res.json).toHaveBeenCalledWith(mockStudio);
  });

  it('devrait retourner 404 si studio non trouvé', async () => {
    const { req, res } = createMocks({ nom: 'Test' }, { id: '999' });

    Studio.findByPk.mockResolvedValue(null);

    await filmController.updateStudio(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Studio non trouvé' });
  });

  it('devrait supprimer un studio', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockStudio = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    Studio.findByPk.mockResolvedValue(mockStudio);

    await filmController.deleteStudio(req, res);

    expect(mockStudio.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Studio supprimé avec succès'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Studio.findAll.mockRejectedValue(error);

    await filmController.getStudios(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des studios'
    });
  });
});

describe('filmController - Référentiels Supports Vidéo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les supports actifs', async () => {
    const { req, res } = createMocks();

    const mockSupports = [
      { id: 1, nom: 'Blu-ray', actif: true },
      { id: 2, nom: 'DVD', actif: true }
    ];

    SupportVideo.findAll.mockResolvedValue(mockSupports);

    await filmController.getSupports(req, res);

    expect(SupportVideo.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockSupports);
  });

  it('devrait créer un support', async () => {
    const { req, res } = createMocks({ nom: '4K UHD', actif: true });

    const mockSupport = { id: 1, nom: '4K UHD', actif: true };

    SupportVideo.create.mockResolvedValue(mockSupport);

    await filmController.createSupport(req, res);

    expect(SupportVideo.create).toHaveBeenCalledWith({ nom: '4K UHD', actif: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockSupport);
  });

  it('devrait mettre à jour un support', async () => {
    const { req, res } = createMocks(
      { nom: 'Updated Support' },
      { id: '1' }
    );

    const mockSupport = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    SupportVideo.findByPk.mockResolvedValue(mockSupport);

    await filmController.updateSupport(req, res);

    expect(mockSupport.update).toHaveBeenCalledWith({ nom: 'Updated Support' });
    expect(res.json).toHaveBeenCalledWith(mockSupport);
  });

  it('devrait retourner 404 si support non trouvé', async () => {
    const { req, res } = createMocks({ nom: 'Test' }, { id: '999' });

    SupportVideo.findByPk.mockResolvedValue(null);

    await filmController.updateSupport(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Support non trouvé' });
  });

  it('devrait supprimer un support', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockSupport = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    SupportVideo.findByPk.mockResolvedValue(mockSupport);

    await filmController.deleteSupport(req, res);

    expect(mockSupport.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Support supprimé avec succès'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    SupportVideo.findAll.mockRejectedValue(error);

    await filmController.getSupports(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des supports'
    });
  });
});

describe('filmController - Référentiels Emplacements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les emplacements actifs', async () => {
    const { req, res } = createMocks();

    const mockEmplacements = [
      { id: 1, libelle: 'Rayon A', actif: true },
      { id: 2, libelle: 'Rayon B', actif: true }
    ];

    EmplacementFilm.findAll.mockResolvedValue(mockEmplacements);

    await filmController.getEmplacements(req, res);

    expect(EmplacementFilm.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith(mockEmplacements);
  });

  it('devrait créer un emplacement', async () => {
    const { req, res } = createMocks({ libelle: 'Rayon C', actif: true });

    const mockEmplacement = { id: 1, libelle: 'Rayon C', actif: true };

    EmplacementFilm.create.mockResolvedValue(mockEmplacement);

    await filmController.createEmplacement(req, res);

    expect(EmplacementFilm.create).toHaveBeenCalledWith({ libelle: 'Rayon C', actif: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockEmplacement);
  });

  it('devrait mettre à jour un emplacement', async () => {
    const { req, res } = createMocks(
      { libelle: 'Updated Emplacement' },
      { id: '1' }
    );

    const mockEmplacement = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    EmplacementFilm.findByPk.mockResolvedValue(mockEmplacement);

    await filmController.updateEmplacement(req, res);

    expect(mockEmplacement.update).toHaveBeenCalledWith({ libelle: 'Updated Emplacement' });
    expect(res.json).toHaveBeenCalledWith(mockEmplacement);
  });

  it('devrait retourner 404 si emplacement non trouvé', async () => {
    const { req, res } = createMocks({ libelle: 'Test' }, { id: '999' });

    EmplacementFilm.findByPk.mockResolvedValue(null);

    await filmController.updateEmplacement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Emplacement non trouvé' });
  });

  it('devrait supprimer un emplacement', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockEmplacement = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };

    EmplacementFilm.findByPk.mockResolvedValue(mockEmplacement);

    await filmController.deleteEmplacement(req, res);

    expect(mockEmplacement.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Emplacement supprimé avec succès'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    EmplacementFilm.findAll.mockRejectedValue(error);

    await filmController.getEmplacements(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des emplacements'
    });
  });
});

describe('filmController - getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les statistiques des films', async () => {
    const { req, res } = createMocks();

    Film.count.mockResolvedValueOnce(150); // total
    Film.count.mockResolvedValueOnce(120); // disponibles
    Film.count.mockResolvedValueOnce(30);  // empruntés

    Film.findAll.mockResolvedValueOnce([
      { support_id: 1, supportRef: { nom: 'DVD' }, dataValues: { count: 80 } },
      { support_id: 2, supportRef: { nom: 'Blu-ray' }, dataValues: { count: 70 } }
    ]);

    sequelize.query.mockResolvedValueOnce([
      { nom: 'Action', count: 50 },
      { nom: 'Drame', count: 45 }
    ]);

    Film.findAll.mockResolvedValueOnce([
      { classification: 'PG-13', count: 60 },
      { classification: 'R', count: 40 }
    ]);

    sequelize.query.mockResolvedValueOnce([
      { nom: 'Nolan', prenom: 'Christopher', count: 10 }
    ]);

    sequelize.query.mockResolvedValueOnce([
      { nom: 'DiCaprio', prenom: 'Leonardo', count: 15 }
    ]);

    await filmController.getStats(req, res);

    expect(Film.count).toHaveBeenCalledTimes(3);
    expect(Film.findAll).toHaveBeenCalledTimes(2);
    expect(sequelize.query).toHaveBeenCalledTimes(3);

    expect(res.json).toHaveBeenCalledWith({
      totalFilms: 150,
      filmsDisponibles: 120,
      filmsEmpruntes: 30,
      filmsParSupport: expect.any(Array),
      filmsParGenre: expect.any(Array),
      filmsParClassification: expect.any(Array),
      topRealisateurs: expect.any(Array),
      topActeurs: expect.any(Array)
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Film.count.mockRejectedValue(error);

    await filmController.getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des statistiques'
    });
  });
});
